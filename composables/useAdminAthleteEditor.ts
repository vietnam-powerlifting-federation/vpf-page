import { fromIsoDate, toIsoDate } from "~/lib/domain/date"
import type { ApiResponse } from "~/types/api"
import type { Role } from "~/types/union-types"
import type { AthleteRecordData, UserPrivate } from "~/types/users"

/**
 * An athlete's record as staff edit it: identity, membership dates, rack settings and sanctions.
 * Call with `await`; the record is loaded before the screen renders.
 */
export async function useAdminAthleteEditor(vpfId: string) {
  const { t } = useI18n()
  const notify = useNotify()

  const form = reactive({
    fullName: "",
    dob: null as number | null,
    nationalId: "" as string | null,
    nationality: "" as string | null,
    phoneNumber: "" as string | null,
    email: "" as string | null,
    address: "" as string | null,
    slug: "" as string | null,
    squatRackPin: 0 as number | null,
    benchRackPin: 0 as number | null,
    benchSafetyPin: 0 as number | null,
    benchFootBlock: 0 as number | null,
    drugViolate: false,
    role: "user" as Role,
    notes: "" as string | null,
  })

  useHead({ title: () => form.fullName || t("admin.athletes.title") })

  const original = reactive({ email: "" as string | null, slug: "" as string | null, drugViolate: false })
  const vpfExpiry = ref<Date | null>(null)
  const vipExpiry = ref<Date | null>(null)
  const drugViolateReason = ref("")

  const roleOptions = computed(() => [
    { label: t("admin.athletes.roleUser"), value: "user" },
    { label: t("admin.athletes.roleAdmin"), value: "admin" },
  ])

  const detail = await $fetch<ApiResponse<AthleteRecordData>>(`/api/athletes/${vpfId}`, {
    credentials: "include",
    ignoreResponseError: true,
  })

  /**
   * The `scope` check is not a formality. This form reads and writes back private
   * columns, and the server answers publicly to a caller it does not consider an
   * admin — an expired session, a revoked role. Without the check those columns
   * would be `undefined` here and get saved as blanks over real data.
   */
  if (detail.success && detail.data.scope === "private") {
    const athlete = detail.data.athlete
    Object.assign(form, {
      fullName: athlete.fullName,
      dob: athlete.dob,
      nationalId: athlete.nationalId,
      nationality: athlete.nationality,
      phoneNumber: athlete.phoneNumber,
      email: athlete.email,
      address: athlete.address,
      slug: athlete.slug,
      squatRackPin: athlete.squatRackPin,
      benchRackPin: athlete.benchRackPin,
      benchSafetyPin: athlete.benchSafetyPin,
      benchFootBlock: athlete.benchFootBlock,
      drugViolate: athlete.drugViolate ?? false,
      role: athlete.role,
      notes: athlete.notes,
    })
    Object.assign(original, { email: athlete.email, slug: athlete.slug, drugViolate: athlete.drugViolate ?? false })
    vpfExpiry.value = fromIsoDate(athlete.vpfMembershipExpiresAt)
    vipExpiry.value = fromIsoDate(athlete.vipMembershipExpiresAt)
  }

  const emailChanged = computed(() => form.email !== original.email)
  const slugChanged = computed(() => form.slug !== original.slug)
  const dopingChanged = computed(() => form.drugViolate !== original.drugViolate)

  const saving = ref(false)

  async function save() {
    saving.value = true
    try {
      const res = await $fetch<ApiResponse<UserPrivate>>(`/api/athletes/${vpfId}`, {
        method: "PATCH",
        credentials: "include",
        ignoreResponseError: true,
        body: {
          ...form,
          vpfMembershipExpiresAt: toIsoDate(vpfExpiry.value),
          vipMembershipExpiresAt: toIsoDate(vipExpiry.value),
          ...(dopingChanged.value ? { drugViolateReason: drugViolateReason.value } : {}),
        },
      })

      notify.result(res)

      if (res.success) {
        Object.assign(original, { email: form.email, slug: form.slug, drugViolate: form.drugViolate })
        drugViolateReason.value = ""
      }
    } finally {
      saving.value = false
    }
  }

  return reactive({
    vpfId, form, vpfExpiry, vipExpiry, drugViolateReason, roleOptions,
    emailChanged, slugChanged, dopingChanged, saving, save,
  })
}
