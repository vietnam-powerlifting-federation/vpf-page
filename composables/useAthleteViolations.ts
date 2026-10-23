import { outcomeForLevel } from "~/lib/domain/violations"
import type { ApiResponse } from "~/types/api"
import type { UserViolationWithUser } from "~/types/violations"

/** One athlete's violations, with the consequence of their current level spelled out. Loaded in the browser. */
export function useAthleteViolations(vpfId: string) {
  const { t } = useI18n()

  const violations = ref<UserViolationWithUser[]>([])

  const level = computed(() => violations.value[0]?.level ?? 0)
  const outcome = computed(() => outcomeForLevel(level.value))

  const outcomeClass = computed(() => (outcome.value === "blocked" ? "text-red-500" : outcome.value === "pledge" ? "text-amber-500" : "text-surface-500"))
  const outcomeText = computed(() => {
    if (outcome.value === "blocked") return t("admin.violations.outcomeBlocked", { level: level.value })
    if (outcome.value === "pledge") return t("admin.violations.outcomePledge")
    return t("admin.violations.outcomeOk")
  })

  onMounted(async () => {
    const res = await $fetch<ApiResponse<UserViolationWithUser[]>>("/api/violations", {
      query: { vpfId },
      credentials: "include",
      ignoreResponseError: true,
    })
    violations.value = res.success ? res.data : []
  })

  return reactive({ violations, outcomeClass, outcomeText })
}
