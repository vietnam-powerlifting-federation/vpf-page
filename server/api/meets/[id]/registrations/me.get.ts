import { findRegistrationAccount, findVerificationStatusAndDob } from "~/server/repository/entries"
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
import { VPF_MEMBERSHIP_FEE, MEDIA_PLUS_FEE, WEIGHT_CLASS_MALE, WEIGHT_CLASS_FEMALE } from "~/lib/constants/constants"
import { computeCompetitionAge, getEligibleDivisions } from "~/lib/domain/competition-eligibility"
import type { ApiResponse } from "~/types/api"
import type { RegistrationEligibility, RegistrationIdentityState } from "~/types/competitions"

const MEET_NOT_FOUND = { en: "Meet not found", vi: "Không tìm thấy meet" }

export default defineApiHandler(async (event): Promise<ApiResponse<RegistrationEligibility>> => {
  const auth = requireUser(event)
  if (!auth.ok) return auth.error
  const currentUser = auth.user

  const identifier = getRouterParam(event, "id")
  if (!identifier) return fail(event, 400, MSG.invalidInput)

  const meet = await resolveMeet(identifier)
  if (!meet || meet.hidden) return fail(event, 404, MEET_NOT_FOUND)

  const account = await findRegistrationAccount(currentUser.vpfId)

  if (!account) return fail(event, 404, MSG.userNotFound)

  const verification = await findVerificationStatusAndDob(currentUser.vpfId)

  const identityStatus: RegistrationIdentityState = verification?.status ?? "not_submitted"

  // dob lives on users only after admin approval; before that fall back to the submitted form.
  const effectiveDob = account.dob ?? verification?.dob ?? null
  const age = effectiveDob != null ? computeCompetitionAge(effectiveDob, meet.systemYear) : null

  const bans = account.identityVerified
    ? await evaluateBanGates(currentUser.vpfId, meet, account.drugViolate ?? false)
    : null

  const alreadyRegistered = await hasExistingRegistration(currentUser.vpfId, meet.meetId)

  const payload: RegistrationEligibility = {
    meet: {
      meetId: meet.meetId,
      meetName: meet.meetName,
      meetSlug: meet.meetSlug,
      systemYear: meet.systemYear,
      hostDate: meet.hostDate,
      entryFee: meet.entryFee,
      allowGuestRegistration: meet.allowGuestRegistration ?? true,
    },
    registrationOpen: isRegistrationOpen(meet),
    emailVerified: account.emailVerified,
    identityVerified: account.identityVerified,
    identityStatus,
    alreadyRegistered,
    bans,
    athlete: {
      dob: effectiveDob,
      age,
      squatRackPin: account.squatRackPin,
      benchRackPin: account.benchRackPin,
      benchSafetyPin: account.benchSafetyPin,
      benchFootBlock: account.benchFootBlock,
      competitionPhotoUrl: account.competitionPhotoUrl,
      membershipOwed: isMembershipOwed(account.vpfMembershipExpiresAt, meet.systemYear),
    },
    options: {
      weightClasses: { male: [...WEIGHT_CLASS_MALE], female: [...WEIGHT_CLASS_FEMALE] },
      divisions: age != null ? getEligibleDivisions(age) : [],
    },
    fees: {
      entryFee: meet.entryFee ?? 0,
      membershipFee: VPF_MEMBERSHIP_FEE,
      mediaPlusFee: MEDIA_PLUS_FEE,
    },
  }

  return ok(payload, { en: "Registration eligibility retrieved", vi: "Lấy thông tin đủ điều kiện đăng ký thành công" })
})
