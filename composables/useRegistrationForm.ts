import { DIVISION_LABEL_KEY, formatWeightClass } from "~/lib/domain/format"
import { registrationFees, type RegistrationStep } from "~/lib/domain/registration"
import { computeVoucherTotals } from "~/lib/domain/vouchers"
import type { ApiResponse } from "~/types/api"
import type { CompetitionRegistrationCreated, RegistrationEligibility, RegistrationIdentityState } from "~/types/competitions"
import type { PurchaseType } from "~/types/union-types"
import type { Voucher } from "~/types/vouchers"

/**
 * The entry being filled in across the wizard: identity status, capacity and consent, category and
 * equipment, the fees and vouchers that make up the total, and the registration request.
 */
export function useRegistrationForm(
  slug: string,
  eligibility: ComputedRef<RegistrationEligibility | null>,
  goTo: (step: RegistrationStep) => Promise<void>,
) {
  const { t } = useI18n()
  const notify = useNotify()
  const apiMessage = useApiMessage()

  // Identity verification must be submitted before registering; admin approval is not
  // required (an unapproved athlete lands in "submitted / pending review" after payment).
  const identityStatus = ref<RegistrationIdentityState>("not_submitted")

  const isSubmitting = ref(false)
  const purchase = ref<CompetitionRegistrationCreated | null>(null)
  const photoFile = ref<File | null>(null)
  const setPhoto = (file: File | null) => { photoFile.value = file }

  const form = reactive({
    capacity: "member" as "member" | "guest",
    membershipTermsAccepted: false,
    dataConsentAccepted: false,
    sex: "male" as "male" | "female",
    weightClass: null as number | null,
    division: null as string | null,
    squatRackPin: 0,
    benchRackPin: 0,
    benchSafetyPin: 0,
    benchFootBlock: 0,
    mediaPlus: false,
  })

  // Prefill rack pins from the athlete's saved data once eligibility loads.
  watch(
    eligibility,
    (e) => {
      if (!e) return
      identityStatus.value = e.identityStatus
      form.squatRackPin = e.athlete.squatRackPin ?? 0
      form.benchRackPin = e.athlete.benchRackPin ?? 0
      form.benchSafetyPin = e.athlete.benchSafetyPin ?? 0
      form.benchFootBlock = e.athlete.benchFootBlock ?? 0
    },
    { immediate: true },
  )

  // Reset the weight-class choice when the sporting gender changes (classes differ by sex).
  watch(() => form.sex, () => { form.weightClass = null })

  const sexOptions = computed(() => [
    { label: t("general.men"), value: "male" },
    { label: t("general.women"), value: "female" },
  ])

  const capacityOptions = computed(() => [
    { value: "member", label: t("competitionRegistration.member"), hint: t("competitionRegistration.memberHint") },
    ...(eligibility.value?.meet.allowGuestRegistration
      ? [{ value: "guest", label: t("competitionRegistration.guest"), hint: t("competitionRegistration.guestHint") }]
      : []),
  ])

  const weightClassOptions = computed(() => {
    const e = eligibility.value
    if (!e) return []
    return e.options.weightClasses[form.sex].map((wc) => ({ label: formatWeightClass(wc, form.sex), value: wc }))
  })

  const divisionOptions = computed(() => {
    const e = eligibility.value
    if (!e) return []
    return e.options.divisions.map((d) => ({ label: t(DIVISION_LABEL_KEY[d as keyof typeof DIVISION_LABEL_KEY] ?? d), value: d }))
  })

  // A rejected or never-submitted athlete must (re)submit the form before continuing.
  const canProceedIdentity = computed(() => identityStatus.value === "approved" || identityStatus.value === "pending")
  const canProceedCapacity = computed(() => form.dataConsentAccepted && (form.capacity === "guest" || form.membershipTermsAccepted))
  const canProceedDetails = computed(() => form.weightClass != null && (form.capacity === "guest" || form.division != null))

  const fees = computed(() => registrationFees(eligibility.value, form.capacity, form.mediaPlus))

  const { vouchers } = useAthleteVouchers({ available: true }, `registration-vouchers-${slug}`)
  const { typeLabel } = useVoucherDisplay()
  const selectedVoucherCodes = reactive<Partial<Record<PurchaseType, string | null>>>({})

  /** Only offer a picker for a fee this registration actually owes. */
  const voucherTypes = computed<PurchaseType[]>(() => {
    const types: PurchaseType[] = []
    if (fees.value.entryFee > 0) types.push("competition")
    if (fees.value.membershipFee > 0) types.push("vpf_membership")
    return types
  })

  // Clear a selection whose fee stopped being owed (e.g. switching to guest capacity),
  // so a stale code is never submitted.
  watch(voucherTypes, (types) => {
    for (const key of Object.keys(selectedVoucherCodes) as PurchaseType[]) {
      if (!types.includes(key)) selectedVoucherCodes[key] = null
    }
  })

  const appliedVouchers = computed(() =>
    voucherTypes.value
      .map((vt) => vouchers.value.find((v) => v.code === selectedVoucherCodes[vt]))
      .filter((v): v is Voucher => Boolean(v)),
  )

  /**
   * The live total, computed with the same function the server uses at creation.
   * The server recomputes authoritatively and its number wins.
   */
  const totals = computed(() =>
    computeVoucherTotals(
      { competition: fees.value.entryFee, vpf_membership: fees.value.membershipFee },
      appliedVouchers.value,
      fees.value.mediaPlusFee,
    ),
  )

  const summaryLines = computed(() => [
    { key: "entry", label: t("competitionRegistration.entryFee"), amount: fees.value.entryFee },
    ...(fees.value.membershipFee > 0 ? [{ key: "membership", label: t("competitionRegistration.membershipFee"), amount: fees.value.membershipFee }] : []),
    ...totals.value.lines
      .filter((line) => line.discount > 0)
      .map((line) => ({ key: `discount-${line.type}`, label: `${t("competitionRegistration.discount")} · ${typeLabel(line.type)}`, amount: line.discount, discount: true })),
    ...(fees.value.mediaPlusFee > 0 ? [{ key: "media", label: t("competitionRegistration.mediaPlusFee"), amount: fees.value.mediaPlusFee }] : []),
  ])

  const selectVoucher = (type: PurchaseType, code: string | null) => { selectedVoucherCodes[type] = code }

  async function submit() {
    isSubmitting.value = true
    try {
      const fd = new FormData()
      fd.append("capacity", form.capacity)
      fd.append("membershipTermsAccepted", String(form.membershipTermsAccepted))
      fd.append("dataConsentAccepted", String(form.dataConsentAccepted))
      fd.append("sex", form.sex)
      fd.append("weightClass", String(form.weightClass))
      fd.append("division", form.capacity === "guest" ? "guest" : String(form.division))
      fd.append("squatRackPin", String(form.squatRackPin))
      fd.append("benchRackPin", String(form.benchRackPin))
      fd.append("benchSafetyPin", String(form.benchSafetyPin))
      fd.append("benchFootBlock", String(form.benchFootBlock))
      fd.append("mediaPlus", String(form.mediaPlus))
      // Comma-separated: multipart fields arrive as text.
      fd.append("voucherCodes", appliedVouchers.value.map((v) => v.code).join(","))
      if (photoFile.value) fd.append("competitionPhoto", photoFile.value)

      const res = await $fetch<ApiResponse<CompetitionRegistrationCreated>>(`/api/meets/${slug}/registrations`, {
        method: "POST",
        body: fd,
      })

      if (!res.success || !res.data) {
        notify.error(apiMessage(res) || t("competitionRegistration.submitError"), t("general.updateError"))
        return
      }

      purchase.value = res.data
      // A fully-discounted registration arrives already active: skip the QR entirely.
      await goTo(res.data.status === "active" ? "done" : "payment")
    } catch {
      notify.error(t("competitionRegistration.submitError"), t("general.updateError"))
    } finally {
      isSubmitting.value = false
    }
  }

  return reactive({
    identityStatus, form, setPhoto, purchase, isSubmitting,
    sexOptions, capacityOptions, weightClassOptions, divisionOptions,
    canProceedIdentity, canProceedCapacity, canProceedDetails,
    fees, vouchers, voucherTypes, selectedVoucherCodes, selectVoucher,
    summaryLines, total: computed(() => totals.value.payable),
    submit,
  })
}
