<template>
  <AuthCard
    :title="$t('forgotPassword.title')"
    :subtitle="step === 'request' ? $t('forgotPassword.requestSubtitle') : $t('forgotPassword.resetSubtitle', { email })"
  >
    <!-- Step 1: request a reset code -->
    <form v-if="step === 'request'" class="grid gap-5" novalidate @submit.prevent="handleRequestCode()">
      <AppField v-slot="f" :label="$t('forgotPassword.emailLabel')">
        <AppInput :id="f.id" v-model="email" type="email" autocomplete="email" class="w-full" />
      </AppField>
      <AppButton type="submit" block :loading="isLoading">{{ $t('forgotPassword.sendCodeButton') }}</AppButton>
    </form>

    <!-- Step 2: enter the code and the new password -->
    <form v-else ref="formEl" class="grid gap-5" novalidate @submit.prevent="handleResetPassword">
      <AppField v-slot="f" :label="$t('forgotPassword.codeLabel')" :error="errors.code">
        <AppInput
          :id="f.id"
          v-model="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          :invalid="f.invalid"
          :aria-describedby="f.describedBy"
          class="w-full font-display text-xl tracking-[0.3em]"
        />
      </AppField>
      <AppField v-slot="f" :label="$t('forgotPassword.newPassword')" :hint="$t('register.passwordHint')" :error="errors.newPassword">
        <PasswordInput :id="f.id" v-model="newPassword" :invalid="f.invalid" :aria-describedby="f.describedBy" autocomplete="new-password" />
      </AppField>
      <AppField v-slot="f" :label="$t('forgotPassword.confirmPassword')" :error="errors.confirmPassword">
        <PasswordInput :id="f.id" v-model="confirmPassword" :invalid="f.invalid" :aria-describedby="f.describedBy" autocomplete="new-password" />
      </AppField>
      <AppButton type="submit" block :loading="isLoading">{{ $t('forgotPassword.resetButton') }}</AppButton>
      <p class="text-center text-sm text-muted-color">
        {{ $t("forgotPassword.noCode") }}
        <button type="button" class="min-h-11 cursor-pointer font-semibold text-accent underline-offset-3 hover:underline disabled:opacity-50" :disabled="isResending" @click="handleRequestCode(true)">
          {{ $t("forgotPassword.resend") }}
        </button>
      </p>
    </form>

    <template #footer>
      <NuxtLinkLocale to="/login" class="font-semibold text-accent underline-offset-3 hover:underline">{{ $t("forgotPassword.backToLogin") }}</NuxtLinkLocale>
    </template>
  </AuthCard>
</template>

<script setup lang="ts">
import type { ApiResponse } from "~/types/api"

const { t } = useI18n()
const msg = useApiMessage()
const toast = useToast()
const localePath = useLocalePath()

const step = ref<"request" | "reset">("request")
const email = ref("")
const code = ref("")
const newPassword = ref("")
const confirmPassword = ref("")

const isLoading = ref(false)
const isResending = ref(false)

const formEl = ref<HTMLFormElement | null>(null)

const errors = ref({
  code: "",
  newPassword: "",
  confirmPassword: "",
})

// `resend` reuses the same request from step 2, where the email is already filled in.
const handleRequestCode = async (resend = false) => {
  if (!email.value.trim()) {
    toast.add({ severity: "error", summary: t("general.error"), detail: t("forgotPassword.emailRequired"), life: 5000 })
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
      toast.add({ severity: "info", summary: t("forgotPassword.title"), detail: msg(res), life: 4000 })
    } else {
      toast.add({ severity: "error", summary: t("general.error"), detail: msg(res) || t("general.error"), life: 5000 })
    }
  } catch (e) {
    toast.add({ severity: "error", summary: t("general.error"), detail: e instanceof Error ? e.message : t("general.error"), life: 5000 })
  } finally {
    isLoading.value = false
    isResending.value = false
  }
}

const validateResetForm = (): boolean => {
  errors.value = { code: "", newPassword: "", confirmPassword: "" }
  let isValid = true

  if (!code.value.trim()) {
    errors.value.code = t("forgotPassword.codeRequired")
    isValid = false
  }

  if (newPassword.value.length < 8) {
    errors.value.newPassword = t("forgotPassword.passwordTooShort")
    isValid = false
  }

  if (confirmPassword.value !== newPassword.value) {
    errors.value.confirmPassword = t("forgotPassword.passwordMismatch")
    isValid = false
  }

  return isValid
}

const handleResetPassword = async () => {
  if (!validateResetForm()) {
    await nextTick()
    formEl.value?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus()
    return
  }

  isLoading.value = true

  try {
    const res = await $fetch("/api/auth/reset-password", {
      method: "POST",
      body: {
        email: email.value.trim().toLowerCase(),
        code: code.value.trim(),
        password: newPassword.value,
      },
      ignoreResponseError: true,
    }) as ApiResponse<null>

    if (res.success) {
      toast.add({
        severity: "success",
        summary: t("forgotPassword.title"),
        detail: t("forgotPassword.success"),
        life: 5000,
      })
      await navigateTo(localePath("/login"))
    } else {
      toast.add({ severity: "error", summary: t("general.error"), detail: msg(res) || t("general.error"), life: 5000 })
    }
  } catch (e) {
    toast.add({ severity: "error", summary: t("general.error"), detail: e instanceof Error ? e.message : t("general.error"), life: 5000 })
  } finally {
    isLoading.value = false
  }
}

useHead({ title: () => t("forgotPassword.title") })

definePageMeta({
  layout: "auth",
})
</script>
