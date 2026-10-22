<template>
  <AuthCard :title="$t('register.title')" :subtitle="$t('register.subtitle')" :image="loginBg">
    <form ref="formEl" class="grid gap-5" novalidate @submit.prevent="handleRegister">
      <AppField v-slot="f" :label="$t('register.emailLabel')" :error="errors.email">
        <AppInput
          :id="f.id"
          v-model="email"
          type="email"
          :placeholder="$t('register.emailPlaceholder')"
          :invalid="f.invalid"
          :aria-describedby="f.describedBy"
          autocomplete="email"
          class="w-full"
        />
      </AppField>

      <AppField v-slot="f" :label="$t('register.password')" :hint="$t('register.passwordHint')" :error="errors.password">
        <PasswordInput
:id="f.id"
          v-model="password"
          :invalid="f.invalid"
          :aria-describedby="f.describedBy"
          autocomplete="new-password"
        />
      </AppField>

      <AppField v-slot="f" :label="$t('register.confirmPassword')" :error="errors.confirmPassword">
        <PasswordInput
:id="f.id"
          v-model="confirmPassword"
          :invalid="f.invalid"
          :aria-describedby="f.describedBy"
          autocomplete="new-password"
        />
      </AppField>

      <AppButton type="submit" block :loading="isLoading">{{ $t('register.registerButton') }}</AppButton>
    </form>

    <template #footer>
      {{ $t("register.haveAccount") }}
      <NuxtLinkLocale to="/login" class="font-semibold text-accent underline-offset-3 hover:underline">{{ $t("register.loginNow") }}</NuxtLinkLocale>
    </template>
  </AuthCard>
</template>

<script setup lang="ts">
import type { ApiResponse, RegisterResponse } from "~/types/api"
import loginBg from "~/assets/img/login-bg.png"

const { t } = useI18n()
const apiMessage = useApiMessage()
const toast = useToast()
const { refresh: refreshSession } = useAuthSession()
const localePath = useLocalePath()
const formEl = ref<HTMLFormElement | null>(null)

const email = ref("")
const password = ref("")
const confirmPassword = ref("")
const isLoading = ref(false)

const errors = ref({
  email: "",
  password: "",
  confirmPassword: "",
})

const validateForm = (): boolean => {
  errors.value = { email: "", password: "", confirmPassword: "" }
  let isValid = true

  if (!email.value.trim()) {
    errors.value.email = t("register.emailRequired")
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    errors.value.email = t("register.emailInvalid")
    isValid = false
  }

  if (!password.value) {
    errors.value.password = t("register.passwordRequired")
    isValid = false
  } else if (password.value.length < 8) {
    errors.value.password = t("register.passwordTooShort")
    isValid = false
  }

  if (confirmPassword.value !== password.value) {
    errors.value.confirmPassword = t("register.passwordMismatch")
    isValid = false
  }

  return isValid
}

const handleRegister = async () => {
  if (!validateForm()) {
    await nextTick()
    formEl.value?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus()
    return
  }

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
      toast.add({ severity: "error", summary: t("general.error"), detail: apiMessage(response) || t("general.error"), life: 5000 })
    }
  } catch (error) {
    toast.add({ severity: "error", summary: t("general.error"), detail: error instanceof Error ? error.message : t("general.error"), life: 5000 })
  } finally {
    isLoading.value = false
  }
}

useHead({ title: () => t("register.title") })

definePageMeta({ layout: "auth", wide: "split" })
</script>
