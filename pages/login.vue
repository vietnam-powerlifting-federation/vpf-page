<template>
  <div class="bg-surface-100 dark:bg-surface-900 py-10 md:py-14 px-4">
    <div class="container mx-auto max-w-5xl">
      <div
        class="grid grid-cols-1 md:grid-cols-2 overflow-hidden rounded-lg border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 shadow-sm"
      >
        <!-- Left: form -->
        <div class="p-8 md:p-10">
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-0">{{ $t("login.title") }}</h1>
          <p class="mt-1 text-sm text-surface-600 dark:text-surface-300">{{ $t("login.subtitle") }}</p>

          <form class="mt-8 space-y-5" @submit.prevent="handleLogin">
            <div>
              <label for="vpfIdOrEmail" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
                {{ $t("login.emailLabel") }}
              </label>
              <InputText
                id="vpfIdOrEmail"
                v-model="vpfIdOrEmail"
                :placeholder="$t('login.emailPlaceholder')"
                class="w-full"
                :class="{ 'p-invalid': errors.vpfIdOrEmail }"
                autocomplete="username"
              />
              <small v-if="errors.vpfIdOrEmail" class="p-error mt-1 block">{{ errors.vpfIdOrEmail }}</small>
            </div>

            <div>
              <label for="password" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
                {{ $t("login.password") }}
              </label>
              <Password
                id="password"
                v-model="password"
                :placeholder="$t('login.password')"
                class="w-full"
                :class="{ 'p-invalid': errors.password }"
                :feedback="false"
                toggle-mask
                autocomplete="current-password"
              />
              <small v-if="errors.password" class="p-error mt-1 block">{{ errors.password }}</small>
            </div>

            <div v-if="loginError" class="p-4 rounded-lg border bg-primary/10 border-primary/20">
              <p class="text-sm text-primary-700 dark:text-primary-300">{{ loginError }}</p>
            </div>

            <div class="flex items-center justify-between gap-4">
              <label class="inline-flex items-center gap-2 select-none">
                <Checkbox v-model="rememberMe" :binary="true" input-id="rememberMe" />
                <span class="text-sm text-surface-700 dark:text-surface-200">{{ $t("login.rememberMe") }}</span>
              </label>

              <NuxtLinkLocale
                to="/forgot-password"
                class="text-sm font-semibold text-primary hover:underline whitespace-nowrap"
              >
                {{ $t("login.forgotPassword") }}
              </NuxtLinkLocale>
            </div>

            <Button
              type="submit"
              :label="$t('login.loginButton')"
              class="w-full"
              :loading="isLoading"
              :disabled="isLoading"
            />

            <!-- Google button (no action for now) -->
            <button
              type="button"
              class="w-full inline-flex items-center justify-center gap-2 rounded-md border border-surface-200 dark:border-surface-800
                     bg-surface-0 dark:bg-surface-950 px-3 py-2 shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]
                     text-surface-900 dark:text-surface-0 font-semibold
                     hover:bg-surface-50 dark:hover:bg-surface-900 transition-colors"
              @click="handleGoogleSignIn"
            >
              <span
                class="inline-flex items-center justify-center w-6 h-6 rounded bg-surface-0 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-0"
              >
                G
              </span>
              <span>{{ $t("login.googleSignIn") }}</span>
            </button>

            <div class="text-center text-sm text-surface-600 dark:text-surface-300">
              {{ $t("login.noAccount") }}
              <NuxtLinkLocale to="/register" class="font-semibold text-primary hover:underline">
                {{ $t("login.registerNow") }}
              </NuxtLinkLocale>
            </div>

            <!-- Notice (kept, opens modal) -->
            <div class="pt-1">
              <button
                type="button"
                class="w-full text-left text-sm underline text-surface-700 dark:text-surface-200 hover:text-primary transition-colors"
                @click="showNoticeModal = true"
              >
                {{ $t("login.noticeTitle") }}
              </button>
            </div>
          </form>
        </div>

        <!-- Right: banner -->
        <div class="relative min-h-[380px] md:min-h-full">
          <img :src="loginBg" alt="" class="h-full w-full object-cover">
        </div>
      </div>
    </div>

    <!-- Notice Modal -->
    <Dialog
      v-model:visible="showNoticeModal"
      :header="$t('login.noticeTitle')"
      :modal="true"
      :closable="true"
      class="max-w-2xl"
    >
      <div class="p-4">
        <p class="text-text">{{ $t("login.noticeContent") }}</p>
      </div>
      <template #footer>
        <Button :label="$t('login.close')" @click="showNoticeModal = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import InputText from "@/components/volt/InputText.vue"
import Password from "@/components/volt/Password.vue"
import Button from "@/components/volt/Button.vue"
import Dialog from "@/components/volt/Dialog.vue"
import Checkbox from "@/components/volt/Checkbox.vue"
import type { ApiResponse, LoginResponse } from "~/types/api"
import loginBg from "~/assets/img/login-bg.png"

const router = useRouter()
const { t, locale } = useI18n()

// Form state
const vpfIdOrEmail = ref("")
const password = ref("")
const isLoading = ref(false)
const loginError = ref<string | null>(null)
const showNoticeModal = ref(false)
const rememberMe = ref(false)

// Form errors
const errors = ref({
  vpfIdOrEmail: "",
  password: "",
})

// Auto-detect if input is VPF ID (contains "VPF" prefix) or email
const isVpfId = computed(() => {
  const value = vpfIdOrEmail.value.trim().toUpperCase()
  return value.includes("VPF")
})

// Validate form
const validateForm = (): boolean => {
  errors.value = {
    vpfIdOrEmail: "",
    password: "",
  }

  let isValid = true

  if (!vpfIdOrEmail.value.trim()) {
    errors.value.vpfIdOrEmail = t("login.vpfIdOrEmailRequired")
    isValid = false
  }

  if (!password.value) {
    errors.value.password = t("login.passwordRequired")
    isValid = false
  }

  return isValid
}

// Handle login
const handleLogin = async () => {
  loginError.value = null

  if (!validateForm()) {
    return
  }

  isLoading.value = true

  try {
    const loginData: { password: string; vpfId?: string; email?: string } = {
      password: password.value,
    }

    // Auto-detect and set vpfId or email based on input
    if (isVpfId.value) {
      loginData.vpfId = vpfIdOrEmail.value.trim().toUpperCase()
    } else {
      loginData.email = vpfIdOrEmail.value.trim().toLowerCase()
    }

    const response = await $fetch("/api/auth/login", {
      method: "POST",
      body: loginData,
      ignoreResponseError: true,
    }) as ApiResponse<LoginResponse>

    if (response.success) {
      // Store JWT token in cookie
      const authToken = useCookie("auth-token", {
        maxAge: 60 * 60 * 24 * 7, // 7 days (matching JWT expiration)
        secure: true,
        sameSite: "strict",
        httpOnly: false, // Must be false for client-side access
      })
      authToken.value = response.data.token

      // Redirect to home or dashboard
      router.push("/")
    } else {
      loginError.value = response.message[locale.value as "en" | "vi"] || response.message.en || t("general.error")
    }
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : t("general.error")
  } finally {
    isLoading.value = false
  }
}

const handleGoogleSignIn = () => {
  // Intentionally no-op (UI only for now)
}

// Set page meta
useHead({
  title: t("login.title"),
})

definePageMeta({
  layout: "with-footer",
  pageTransition: {
    name: "page",
    mode: "out-in"
  }
})
</script>
