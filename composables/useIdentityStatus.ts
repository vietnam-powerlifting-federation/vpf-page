import type { ApiResponse } from "~/types/api"
import type { IdentityVerification } from "~/types/verifications"

type SelfVerification = { emailVerified: boolean; identityVerified: boolean; verification: IdentityVerification | null }

/** Where the signed-in athlete's identity verification stands, with the wording and tag colour for it. */
export function useIdentityStatus() {
  const { t } = useI18n()

  const { data } = useFetch<ApiResponse<SelfVerification>>("/api/athletes/me/verification", {
    credentials: "include",
    ignoreResponseError: true,
  })

  const status = computed<IdentityVerification["status"] | null>(() =>
    data.value?.success ? data.value.data.verification?.status ?? null : null,
  )

  const isVerified = computed(() => status.value === "approved")

  const text = computed(() => {
    if (status.value === "approved") return t("profile.verification.verified")
    if (status.value === "pending") return t("profile.verification.pending")
    if (status.value === "rejected") return t("profile.verification.rejected")
    return t("profile.verification.notVerified")
  })

  const severity = computed(() => {
    if (status.value === "approved") return "success"
    if (status.value === "pending") return "warn"
    if (status.value === "rejected") return "danger"
    return "secondary"
  })

  const buttonLabel = computed(() =>
    status.value === "rejected" ? t("profile.verification.reverifyButton") : t("profile.verification.verifyButton"),
  )

  return reactive({ isVerified, text, severity, buttonLabel })
}
