import type { ApiResponse } from "~/types/api"
import type { AthleteListPage, UserPrivate } from "~/types/users"

const PAGE_SIZE = 25

/** The admin athletes list: search and filters, paged from the server. Call with `await`. */
export async function useAdminAthletes() {
  const { t } = useI18n()

  const search = ref("")
  const membership = ref<"active" | "expired" | null>(null)
  const flags = ref<string[]>([])
  const page = ref(1)

  const membershipOptions = computed(() => [
    { label: t("admin.athletes.membershipActive"), value: "active" },
    { label: t("admin.athletes.membershipExpired"), value: "expired" },
  ])

  const flagOptions = computed(() => [
    { label: t("admin.athletes.identityVerified"), value: "identityVerified" },
    { label: t("admin.athletes.emailVerified"), value: "emailVerified" },
    { label: t("admin.athletes.doping"), value: "drugViolate" },
    { label: t("admin.athletes.admin"), value: "role" },
  ])

  const query = computed(() => ({
    // Lapsed members are the population staff need for renewals, so the admin list
    // shows them unless a membership filter says otherwise (§4.2).
    includeInactive: "true",
    page: String(page.value),
    pageSize: String(PAGE_SIZE),
    ...(search.value.trim() ? { search: search.value.trim() } : {}),
    ...(membership.value ? { membership: membership.value } : {}),
    ...(flags.value.includes("identityVerified") ? { identityVerified: "true" } : {}),
    ...(flags.value.includes("emailVerified") ? { emailVerified: "true" } : {}),
    ...(flags.value.includes("drugViolate") ? { drugViolate: "true" } : {}),
    ...(flags.value.includes("role") ? { role: "admin" } : {}),
  }))

  const { data: response, pending, refresh } = await useFetch<ApiResponse<AthleteListPage>>("/api/athletes", {
    query,
    credentials: "include",
    ignoreResponseError: true,
  })

  const rows = computed(() => (response.value?.success ? response.value.data.items as UserPrivate[] : []))
  const total = computed(() => (response.value?.success ? response.value.data.total : 0))

  // Any filter change starts from the first page, or the results look empty.
  watch([search, membership, flags], () => { page.value = 1 })

  const setPage = (zeroBased: number) => { page.value = zeroBased + 1 }

  return reactive({
    search, membership, flags, page, pageSize: PAGE_SIZE,
    membershipOptions, flagOptions, rows, total, pending, setPage,
    refresh: () => refresh(),
  })
}
