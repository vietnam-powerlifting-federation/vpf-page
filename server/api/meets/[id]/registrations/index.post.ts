import { findRegistrationAccount, findVerificationStatusAndDob } from "~/server/repository/entries"
import { createCompetitionRegistration } from "~/server/repository/purchases"
import { logger } from "~/lib/logger/logger"
import { uploadVipImage } from "~/lib/external/r2-vip-upload"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { requireUser } from "~/server/utils/auth-guard"
import {
  resolveMeet,
  isRegistrationOpen,
  evaluateBanGates,
  hasExistingRegistration,
  isMembershipOwed,
} from "~/server/service/competition-registration"
import { buildQrUrl, generateUniqueRefCode } from "~/server/service/purchase-codes"
import { resolveVouchers, collectRedemptions } from "~/server/service/vouchers"
import { approvePurchase } from "~/server/service/purchases"
import { CompetitionRegisterSchema } from "~/lib/zod/schemas/competition-registration.schema"
import { computeVoucherTotals, type LineItems } from "~/lib/domain/vouchers"
import { VPF_MEMBERSHIP_FEE, MEDIA_PLUS_FEE } from "~/lib/constants/constants"
import { computeCompetitionAge, getEligibleDivisions, getEligibleWeightClasses } from "~/lib/domain/competition-eligibility"
import type { ApiResponse } from "~/types/api"
import type { CompetitionRegistrationCreated } from "~/types/competitions"
import type { PurchaseType, RankedDivision } from "~/types/union-types"

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const PHOTO_FIELD = "competitionPhoto"
const MEET_NOT_FOUND = { en: "Meet not found", vi: "Không tìm thấy meet" }

export default defineApiHandler(async (event): Promise<ApiResponse<CompetitionRegistrationCreated>> => {
  const auth = requireUser(event)
  if (!auth.ok) return auth.error
  const currentUser = auth.user

  const identifier = getRouterParam(event, "id")
  if (!identifier) return fail(event, 400, MSG.invalidInput)

  const meet = await resolveMeet(identifier)
  if (!meet || meet.hidden) return fail(event, 404, MEET_NOT_FOUND)

  if (!isRegistrationOpen(meet)) {
    return fail(event, 400, {
      en: "Registration for this competition is not open",
      vi: "Giải đấu này hiện không mở đăng ký",
    })
  }

  const contentType = getRequestHeader(event, "content-type") || ""
  if (!contentType.includes("multipart/form-data")) {
    return fail(event, 400, { en: "Expected multipart form data", vi: "Yêu cầu dữ liệu multipart" })
  }

  const form = await readMultipartFormData(event)
  if (!form?.length) {
    return fail(event, 400, { en: "Invalid or empty form data", vi: "Dữ liệu form không hợp lệ hoặc trống" })
  }

  const textFields: Record<string, string> = {}
  let photoFile: { data: Buffer; filename: string; type?: string } | null = null
  for (const part of form) {
    if (!part.name) continue
    if (part.name === PHOTO_FIELD && part.filename && part.data) {
      if (!ALLOWED_IMAGE_TYPES.includes(part.type || "")) {
        return fail(event, 400, {
          en: "Invalid image type. Allowed: JPEG, PNG, WebP",
          vi: "Loại ảnh không hợp lệ. Cho phép: JPEG, PNG, WebP",
        })
      }
      photoFile = { data: part.data, filename: part.filename, type: part.type }
    } else if (typeof part.data !== "undefined") {
      textFields[part.name] = part.data.toString()
    }
  }

  const parsed = CompetitionRegisterSchema.safeParse(textFields)
  if (!parsed.success) return fail(event, 400, MSG.invalidInput)
  const data = parsed.data

  if (!data.dataConsentAccepted) {
    return fail(event, 400, {
      en: "Data-usage consent is required",
      vi: "Bạn cần đồng ý về việc sử dụng dữ liệu",
    })
  }

  const isGuest = data.capacity === "guest"
  if (isGuest && !(meet.allowGuestRegistration ?? true)) {
    return fail(event, 403, {
      en: "Guest registration is not allowed for this competition",
      vi: "Giải đấu này không cho phép đăng ký khách mời",
    })
  }
  if (!isGuest && !data.membershipTermsAccepted) {
    return fail(event, 400, {
      en: "You must accept the VPF membership terms",
      vi: "Bạn cần chấp nhận điều khoản thành viên VPF",
    })
  }

  const account = await findRegistrationAccount(currentUser.vpfId)

  if (!account) return fail(event, 404, MSG.userNotFound)

  const verification = await findVerificationStatusAndDob(currentUser.vpfId)

  // The identity form must have been submitted before registering (§1). Admin approval
  // is not required — an unapproved athlete lands in "submitted / pending review" (§7).
  if (!verification) {
    return fail(event, 403, {
      en: "Please submit your identity verification before registering",
      vi: "Vui lòng gửi hồ sơ xác minh danh tính trước khi đăng ký",
    })
  }

  const effectiveDob = account.dob ?? verification.dob ?? null

  // Ban gates apply only to identity-verified athletes (§2). A hard block stops here.
  if (account.identityVerified) {
    const bans = await evaluateBanGates(currentUser.vpfId, meet, account.drugViolate ?? false)
    if (bans.violationOutcome === "blocked") {
      return fail(event, 403, {
        en: "You are not allowed to register due to a standing violation.",
        vi: "Bạn không được phép đăng ký do vi phạm hiện hành.",
      })
    }
    if (bans.dopingBanned) {
      return fail(event, 403, {
        en: "You are on the doping ban list and cannot register.",
        vi: "Bạn nằm trong danh sách cấm doping và không thể đăng ký.",
      })
    }
    if (bans.competitionBanned) {
      return fail(event, 403, {
        en: `You are on the list of athletes not allowed to register for this competition. Reason: ${bans.competitionBanReason ?? ""}`,
        vi: `Bạn nằm trong danh sách không được đăng ký giải đấu này. Lý do: ${bans.competitionBanReason ?? ""}`,
      })
    }
    // violationOutcome === "pledge" (level 1) is allowed to continue; VPF handles the pledge/fine by email.
  }

  if (await hasExistingRegistration(currentUser.vpfId, meet.meetId)) {
    return fail(event, 409, {
      en: "You are already registered for this competition",
      vi: "Bạn đã đăng ký giải đấu này",
    })
  }

  // Validate entry details against the athlete's real data (§4).
  if (!getEligibleWeightClasses(data.sex).includes(data.weightClass)) {
    return fail(event, 400, {
      en: "Selected weight class is not valid for the chosen gender",
      vi: "Hạng cân đã chọn không hợp lệ cho giới tính thi đấu",
    })
  }

  let division: RankedDivision | "guest" = data.division
  if (isGuest) {
    division = "guest"
  } else {
    if (effectiveDob == null) {
      return fail(event, 400, {
        en: "We could not determine your age; please complete identity verification first",
        vi: "Không thể xác định tuổi của bạn; vui lòng hoàn tất xác minh danh tính trước",
      })
    }
    const age = computeCompetitionAge(effectiveDob, meet.systemYear)
    if (!getEligibleDivisions(age).includes(data.division as RankedDivision)) {
      return fail(event, 400, {
        en: "Selected age division is not valid for your age",
        vi: "Hạng tuổi đã chọn không hợp lệ với độ tuổi của bạn",
      })
    }
  }

  // Fees → line items, discounts, one combined amount (§6, §7).
  const entryFee = meet.entryFee ?? 0
  const membershipOwed = !isGuest && isMembershipOwed(account.vpfMembershipExpiresAt, meet.systemYear)
  const membershipFee = membershipOwed ? VPF_MEMBERSHIP_FEE : 0
  const mediaPlusFee = data.mediaPlus ? MEDIA_PLUS_FEE : 0
  const type: PurchaseType[] = membershipOwed ? ["competition", "vpf_membership"] : ["competition"]

  // Media Plus is deliberately not a line item: it belongs to no purchase type
  // and is always paid in full, on top of the discounted fees.
  const lineItems: LineItems = { competition: entryFee, vpf_membership: membershipFee }
  const vouchers = await resolveVouchers({
    codes: data.voucherCodes,
    vpfId: currentUser.vpfId,
    purchaseTypes: type,
    lineItems,
  })
  if (!vouchers.ok) return fail(event, vouchers.statusCode, vouchers.message)

  const totals = computeVoucherTotals(lineItems, vouchers.vouchers, mediaPlusFee)
  const redemptions = collectRedemptions(totals)
  const amount = totals.payable

  // Upload the competition photo (external R2) before opening the DB transaction.
  let competitionPhotoUrl: string | null = null
  if (photoFile) {
    competitionPhotoUrl = await uploadVipImage(
      currentUser.vpfId,
      "competition-photo",
      new Uint8Array(photoFile.data),
      { filename: photoFile.filename, mimeType: photoFile.type },
    )
  }

  const refCode = await generateUniqueRefCode()

  let created: { purchaseId: number }
  try {
    const athletePatch: Record<string, unknown> = {}
    if (competitionPhotoUrl) athletePatch.competitionPhotoUrl = competitionPhotoUrl
    if (data.squatRackPin !== undefined) athletePatch.squatRackPin = data.squatRackPin
    if (data.benchRackPin !== undefined) athletePatch.benchRackPin = data.benchRackPin
    if (data.benchSafetyPin !== undefined) athletePatch.benchSafetyPin = data.benchSafetyPin
    if (data.benchFootBlock !== undefined) athletePatch.benchFootBlock = data.benchFootBlock

    created = await createCompetitionRegistration({
      vpfId: currentUser.vpfId,
      type,
      refCode,
      amount,
      competitionMetadata: {
        meetId: meet.meetId,
        sex: data.sex,
        weightClass: data.weightClass,
        division,
        mediaPlus: data.mediaPlus,
      },
      membershipYear: membershipOwed ? meet.systemYear : null,
      athletePatch,
      redemptions,
    })
  } catch (error) {
    if (error instanceof TransactionRollbackError) {
      return fail(event, 409, {
        en: "That voucher has just been used; please try again",
        vi: "Voucher vừa được sử dụng; vui lòng thử lại",
      })
    }
    throw error
  }

  logger.info("Competition registration created", {
    vpfId: currentUser.vpfId,
    meetId: meet.meetId,
    refCode,
    type,
    amount,
    vouchers: redemptions.map((v) => v.code),
  })

  const body = {
    purchaseId: created.purchaseId,
    refCode,
    type,
    amount,
    identityVerified: account.identityVerified,
    breakdown: {
      entryFee,
      membershipFee,
      mediaPlusFee,
      totalDiscount: totals.totalDiscount,
      discounts: redemptions.map(({ code, type: t, discount }) => ({ code, type: t, discount })),
    },
  }

  // A fully-discounted registration has no QR and no webhook to wait for — activate
  // it through the same single activation point the webhook uses.
  if (amount === 0) {
    const approval = await approvePurchase(refCode, null)
    if (!approval.success) {
      logger.error("Failed to auto-activate zero-amount registration", { refCode, purchaseId: created.purchaseId })
      return fail(event, approval.statusCode, approval.message)
    }
    return ok(
      { ...body, status: "active" as const },
      { en: "Registration confirmed with voucher", vi: "Đăng ký đã được xác nhận bằng voucher" },
    )
  }

  return ok(
    { ...body, status: "pending" as const, qrUrl: buildQrUrl(refCode, amount) },
    { en: "Registration created; awaiting payment", vi: "Đã tạo đăng ký; chờ thanh toán" },
  )
})
