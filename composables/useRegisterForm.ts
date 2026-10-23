import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH } from "~/lib/domain/auth-validation"
import type { ApiResponse, RegisterResponse } from "~/types/api"

/** The sign-up form: fields, validation and the registration request. */
export function useRegisterForm() {
  const { t } = useI18n()
  const notify = useNotify()
  const { refresh: refreshSession } = useAuthSession()
  const localePath = useLocalePath()

  const email = ref("")
  const password = ref("")
  const confirmPassword = ref("")
  const isLoading = ref(false)
  const errors = ref({ email: "", password: "", confirmPassword: "" })

  function validate(): boolean {
    const address = email.value.trim()
    errors.value = {
      email: !address ? t("register.emailRequired") : !EMAIL_PATTERN.test(address) ? t("register.emailInvalid") : "",
      password: !password.value ? t("register.passwordRequired") : password.value.length < MIN_PASSWORD_LENGTH ? t("register.passwordTooShort") : "",
      confirmPassword: confirmPassword.value !== password.value ? t("register.passwordMismatch") : "",
    }
    return Object.values(errors.value).every((message) => !message)
  }

  /** Registers and signs in. Returns false when the form is invalid, so the caller can focus the first bad field. */
  async function submit(): Promise<boolean> {
    if (!validate()) return false

    isLoading.value = true
    try {
      const response = await $fetch("/api/auth/register", {
        method: "POST",
        body: { email: email.value.trim().toLowerCase(), password: password.value },
        ignoreResponseError: true,
      }) as ApiResponse<RegisterResponse>

      if (response.success) {
        // Skip flow marks the email verified immediately; otherwise go verify the code first.
        // Registering signs the athlete in; re-read the session so the next page's guard sees it.
        await refreshSession()
        await navigateTo(localePath(response.data.emailVerified ? "/verification" : "/verify-email"))
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

  return reactive({ email, password, confirmPassword, errors, isLoading, submit })
}
