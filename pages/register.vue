<template>
  <div class="bg-surface-100 dark:bg-surface-900 py-10 md:py-14 px-4">
    <div class="container mx-auto max-w-5xl">
      <div
        class="grid grid-cols-1 md:grid-cols-2 overflow-hidden rounded-lg border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 shadow-sm"
      >
        <!-- Left: form -->
        <div class="p-8 md:p-10">
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0">{{ $t("register.title") }}</h1>
          <p class="mt-1 text-sm text-surface-600 dark:text-surface-300">{{ $t("register.subtitle") }}</p>

          <form class="mt-8 space-y-5" @submit.prevent="handleRegister">
            <div>
              <label for="email" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
                {{ $t("register.emailLabel") }}
              </label>
              <InputText
                id="email"
                v-model="email"
                type="email"
                :placeholder="$t('register.emailPlaceholder')"
                class="w-full"
                :class="{ 'p-invalid': errors.email }"
                autocomplete="email"
              />
              <small v-if="errors.email" class="p-error mt-1 block">{{ errors.email }}</small>
            </div>

            <div>
              <label for="password" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
                {{ $t("register.password") }}
              </label>
              <Password
                id="password"
                v-model="password"
                :placeholder="$t('register.passwordPlaceholder')"
                class="w-full"
                input-class="w-full"
                :class="{ 'p-invalid': errors.password }"
                toggle-mask
                :feedback="true"
                autocomplete="new-password"
              />
              <small v-if="errors.password" class="p-error mt-1 block">{{ errors.password }}</small>
            </div>

            <div>
              <label for="confirmPassword" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
                {{ $t("register.confirmPassword") }}
              </label>
              <Password
                id="confirmPassword"
                v-model="confirmPassword"
                :placeholder="$t('register.confirmPasswordPlaceholder')"
                class="w-full"
                input-class="w-full"
                :class="{ 'p-invalid': errors.confirmPassword }"
                :feedback="false"
                toggle-mask
                autocomplete="new-password"
              />
              <small v-if="errors.confirmPassword" class="p-error mt-1 block">{{ errors.confirmPassword }}</small>
            </div>

            <div v-if="registerError" class="p-4 rounded-lg border bg-primary/10 border-primary/20">
              <p class="text-sm text-primary-700 dark:text-primary-300">{{ registerError }}</p>
            </div>

            <Button
              type="submit"
              :label="$t('register.registerButton')"
              class="w-full"
              :loading="isLoading"
              :disabled="isLoading"
            />

            <div class="text-center text-sm text-surface-600 dark:text-surface-300">
              {{ $t("register.haveAccount") }}
              <NuxtLinkLocale to="/login" class="font-semibold text-primary hover:underline">
                {{ $t("register.loginNow") }}
              </NuxtLinkLocale>
            </div>
          </form>
        </div>

        <!-- Right: banner -->
        <div class="relative min-h-[380px] md:min-h-full">
          <img :src="loginBg" alt="" class="h-full w-full object-cover">
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import type { ApiResponse, RegisterResponse } from "~/types/api"
import loginBg from "~/assets/img/login-bg.png"

const { t } = useI18n()
const apiMessage = useApiMessage()

const email = ref("")
const password = ref("")
const confirmPassword = ref("")
const isLoading = ref(false)
const registerError = ref<string | null>(null)

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
  registerError.value = null
  if (!validateForm()) return

  isLoading.value = true
  try {
    const response = await $fetch("/api/auth/register", {
      method: "POST",
      body: { email: email.value.trim().toLowerCase(), password: password.value },
      ignoreResponseError: true,
    }) as ApiResponse<RegisterResponse>

    if (response.success) {
      // Skip flow marks the email verified immediately; otherwise go verify the code first.
      if (response.data.emailVerified) {
        await navigateTo("/verification")
      } else {
        await navigateTo("/verify-email")
      }
    } else {
      registerError.value = apiMessage(response) || t("general.error")
    }
  } catch (error) {
    registerError.value = error instanceof Error ? error.message : t("general.error")
  } finally {
    isLoading.value = false
  }
}

useHead({ title: () => t("register.title") })

definePageMeta({
  layout: "with-footer",
  pageTransition: { name: "page", mode: "out-in" },
})
</script>
