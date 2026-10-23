import { MIN_PASSWORD_LENGTH } from "~/lib/domain/auth-validation"
import type { ApiResponse } from "~/types/api"

/** Password reset in two steps: ask for an emailed code, then enter it with a new password. */
export function useForgotPasswordForm() {
  const { t } = useI18n()
  const notify = useNotify()
  const apiMessage = useApiMessage()
  const localePath = useLocalePath()

  const step = ref<"request" | "reset">("request")
  const email = ref("")
  const code = ref("")
  const newPassword = ref("")
  const confirmPassword = ref("")
  const isLoading = ref(false)
  const isResending = ref(false)
  const errors = ref({ code: "", newPassword: "", confirmPassword: "" })

  /** `resend` reuses the same request from the second step, where the email is already filled in. */
  async function requestCode(resend = false) {
    if (!email.value.trim()) {
      notify.error(t("forgotPassword.emailRequired"))
      return
    }

    if (resend) isResending.value = true
    else isLoading.value = true

    try {
      const res = await $fetch("/api/auth/forgot-password", {
        method: "POST",
        body: { email: email.value.trim().toLowerCase() },
        ignoreResponseError: true,
      }) as ApiResponse<null>

      if (res.success) {
        step.value = "reset"
        notify.info(t("forgotPassword.title"), apiMessage(res))
      } else {
        notify.apiError(res)
      }
    } catch (e) {
      notify.failure(e)
    } finally {
      isLoading.value = false
      isResending.value = false
    }
  }

  function validate(): boolean {
    errors.value = {
      code: code.value.trim() ? "" : t("forgotPassword.codeRequired"),
      newPassword: newPassword.value.length < MIN_PASSWORD_LENGTH ? t("forgotPassword.passwordTooShort") : "",
      confirmPassword: confirmPassword.value !== newPassword.value ? t("forgotPassword.passwordMismatch") : "",
    }
    return Object.values(errors.value).every((message) => !message)
  }

  /** Sets the new password. Returns false when the form is invalid, so the caller can focus the first bad field. */
  async function resetPassword(): Promise<boolean> {
    if (!validate()) return false

    isLoading.value = true
    try {
      const res = await $fetch("/api/auth/reset-password", {
        method: "POST",
        body: { email: email.value.trim().toLowerCase(), code: code.value.trim(), password: newPassword.value },
        ignoreResponseError: true,
      }) as ApiResponse<null>

      if (res.success) {
        notify.success(t("forgotPassword.title"), t("forgotPassword.success"))
        await navigateTo(localePath("/login"))
      } else {
        notify.apiError(res)
      }
    } catch (e) {
      notify.failure(e)
    } finally {
      isLoading.value = false
    }
    return true
  }

  return reactive({ step, email, code, newPassword, confirmPassword, errors, isLoading, isResending, requestCode, resetPassword })
}
