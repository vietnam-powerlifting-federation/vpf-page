<template>
  <div class="bg-surface-100 dark:bg-surface-900 py-10 md:py-14 px-4 min-h-[70vh]">
    <div class="container mx-auto max-w-md">
      <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 shadow-sm p-8">
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">{{ $t("forgotPassword.title") }}</h1>
        <p class="mt-2 text-sm text-surface-600 dark:text-surface-300">
          {{ step === "request" ? $t("forgotPassword.requestSubtitle") : $t("forgotPassword.resetSubtitle", { email }) }}
        </p>

        <!-- Step 1: request a reset code -->
        <form v-if="step === 'request'" class="mt-8 space-y-5" @submit.prevent="handleRequestCode">
          <div>
            <label for="email" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
              {{ $t("forgotPassword.emailLabel") }}
            </label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              :placeholder="$t('forgotPassword.emailPlaceholder')"
              class="w-full"
              :class="{ 'p-invalid': !!error }"
              autocomplete="email"
            />
          </div>

          <div v-if="error" class="p-4 rounded-lg border bg-primary/10 border-primary/20">
            <p class="text-sm text-primary-700 dark:text-primary-300">{{ error }}</p>
          </div>

          <Button
            type="submit"
            :label="$t('forgotPassword.sendCodeButton')"
            class="w-full"
            :loading="isLoading"
            :disabled="isLoading"
          />

          <div class="text-center text-sm">
            <NuxtLinkLocale to="/login" class="font-semibold text-primary hover:underline">
              {{ $t("forgotPassword.backToLogin") }}
            </NuxtLinkLocale>
          </div>
        </form>

        <!-- Step 2: enter the code and the new password -->
        <form v-else class="mt-8 space-y-5" @submit.prevent="handleResetPassword">
          <div>
            <label for="code" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
              {{ $t("forgotPassword.codeLabel") }}
            </label>
            <InputText
              id="code"
              v-model="code"
              inputmode="numeric"
              :placeholder="$t('forgotPassword.codePlaceholder')"
              class="w-full tracking-widest"
              :class="{ 'p-invalid': !!errors.code }"
              autocomplete="one-time-code"
            />
            <small v-if="errors.code" class="p-error mt-1 block">{{ errors.code }}</small>
          </div>

          <div>
            <label for="newPassword" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
              {{ $t("forgotPassword.newPassword") }}
            </label>
            <Password
              id="newPassword"
              v-model="newPassword"
              :placeholder="$t('forgotPassword.newPasswordPlaceholder')"
              class="w-full"
              :class="{ 'p-invalid': errors.newPassword }"
              :feedback="false"
              toggle-mask
              autocomplete="new-password"
            />
            <small v-if="errors.newPassword" class="p-error mt-1 block">{{ errors.newPassword }}</small>
          </div>

          <div>
            <label for="confirmPassword" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
              {{ $t("forgotPassword.confirmPassword") }}
            </label>
            <Password
              id="confirmPassword"
              v-model="confirmPassword"
              :placeholder="$t('forgotPassword.confirmPasswordPlaceholder')"
              class="w-full"
              :class="{ 'p-invalid': errors.confirmPassword }"
              :feedback="false"
              toggle-mask
              autocomplete="new-password"
            />
            <small v-if="errors.confirmPassword" class="p-error mt-1 block">{{ errors.confirmPassword }}</small>
          </div>

          <div v-if="error" class="p-4 rounded-lg border bg-primary/10 border-primary/20">
            <p class="text-sm text-primary-700 dark:text-primary-300">{{ error }}</p>
          </div>
          <div v-if="info" class="p-4 rounded-lg border bg-surface-100 dark:bg-surface-800 border-surface-200 dark:border-surface-700">
            <p class="text-sm text-surface-700 dark:text-surface-200">{{ info }}</p>
          </div>

          <Button
            type="submit"
            :label="$t('forgotPassword.resetButton')"
            class="w-full"
            :loading="isLoading"
            :disabled="isLoading"
          />

          <div class="text-center text-sm text-surface-600 dark:text-surface-300">
            {{ $t("forgotPassword.noCode") }}
            <button
              type="button"
              class="font-semibold text-primary hover:underline disabled:opacity-50"
              :disabled="isResending"
              @click="handleRequestCode(true)"
            >
              {{ $t("forgotPassword.resend") }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import type { ApiResponse } from "~/types/api"

const { t } = useI18n()
const msg = useApiMessage()
const toast = useToast()

const step = ref<"request" | "reset">("request")
const email = ref("")
const code = ref("")
const newPassword = ref("")
const confirmPassword = ref("")

const isLoading = ref(false)
const isResending = ref(false)
const error = ref<string | null>(null)
const info = ref<string | null>(null)

const errors = ref({
  code: "",
  newPassword: "",
  confirmPassword: "",
})

// `resend` reuses the same request from step 2, where the email is already filled in.
const handleRequestCode = async (resend = false) => {
  error.value = null
  info.value = null

  if (!email.value.trim()) {
    error.value = t("forgotPassword.emailRequired")
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
      info.value = msg(res)
    } else {
      error.value = msg(res) || t("general.error")
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : t("general.error")
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
  error.value = null
  info.value = null

  if (!validateResetForm()) return

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
      await navigateTo("/login")
    } else {
      error.value = msg(res) || t("general.error")
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : t("general.error")
  } finally {
    isLoading.value = false
  }
}

useHead({ title: () => t("forgotPassword.title") })

definePageMeta({
  layout: "with-footer",
})
</script>
