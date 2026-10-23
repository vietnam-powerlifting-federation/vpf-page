import type { ApiResponse, LoginResponse } from "~/types/api"

/** The login form: fields, validation and the sign-in request. */
export function useLoginForm() {
  const { t } = useI18n()
  const notify = useNotify()
  const route = useRoute()
  const { refresh: refreshSession } = useAuthSession()
  const localePath = useLocalePath()

  const vpfIdOrEmail = ref("")
  const password = ref("")
  const isLoading = ref(false)
  const errors = ref({ vpfIdOrEmail: "", password: "" })

  // A value containing "VPF" is an athlete ID; anything else is an email.
  const isVpfId = computed(() => vpfIdOrEmail.value.trim().toUpperCase().includes("VPF"))

  function validate(): boolean {
    errors.value = {
      vpfIdOrEmail: vpfIdOrEmail.value.trim() ? "" : t("login.vpfIdOrEmailRequired"),
      password: password.value ? "" : t("login.passwordRequired"),
    }
    return !errors.value.vpfIdOrEmail && !errors.value.password
  }

  /** Signs in. Returns false when the form is invalid, so the caller can focus the first bad field. */
  async function submit(): Promise<boolean> {
    if (!validate()) return false

    isLoading.value = true
    try {
      const loginData: { password: string; vpfId?: string; email?: string } = { password: password.value }
      if (isVpfId.value) loginData.vpfId = vpfIdOrEmail.value.trim().toUpperCase()
      else loginData.email = vpfIdOrEmail.value.trim().toLowerCase()

      const response = await $fetch("/api/auth/login", {
        method: "POST",
        body: loginData,
        ignoreResponseError: true,
      }) as ApiResponse<LoginResponse>

      if (response.success) {
        // Re-read the session first, so the route guard of the next page sees the athlete as signed in.
        await refreshSession()
        // Gate accounts that have not verified their email before letting them into the app.
        if (!response.data.emailVerified) {
          await navigateTo(localePath("/verify-email"))
        } else {
          const redirectTo = typeof route.query.to === "string" && route.query.to.startsWith("/") ? route.query.to : localePath("/")
          await navigateTo(redirectTo)
        }
      } else {
        notify.apiError(response)
      }
    } catch (error) {
      notify.failure(error)
    } finally {
      isLoading.value = false
    }
    return true
  }

  return reactive({ vpfIdOrEmail, password, errors, isLoading, submit })
}
