<template>
  <div class="flex items-center justify-center py-12 px-4">
    <div class="w-full max-w-md space-y-6">
      <h1 class="text-3xl font-bold text-center text-text">{{ $t("login.title") }}</h1>

      <!-- Notice Section -->
      <div class="p-4 rounded-lg border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700">
        <button
          class="w-full text-left underline text-text hover:text-primary transition-colors"
          @click="showNoticeModal = true"
        >
          {{ $t("login.noticeTitle") }}
        </button>
      </div>

      <!-- Login Form -->
      <form class="space-y-6" @submit.prevent="handleLogin">
        <!-- VPF ID or Email Input -->
        <div>
          <label for="vpfIdOrEmail" class="block mb-2 text-sm font-medium text-text">
            {{ $t("login.vpfIdOrEmail") }}
          </label>
          <InputText
            id="vpfIdOrEmail"
            v-model="vpfIdOrEmail"
            :placeholder="$t('login.vpfIdOrEmail')"
            class="w-full"
            :class="{ 'p-invalid': errors.vpfIdOrEmail }"
            autocomplete="username"
          />
          <small v-if="errors.vpfIdOrEmail" class="p-error mt-1 block">{{ errors.vpfIdOrEmail }}</small>
        </div>

        <!-- Password Input -->
        <div>
          <label for="password" class="block mb-2 text-sm font-medium text-text">
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

        <!-- Error Message -->
        <div v-if="loginError" class="p-4 rounded-lg border bg-primary/10 border-primary/20">
          <p class="text-sm text-primary-700 dark:text-primary-300">{{ loginError }}</p>
        </div>

        <!-- Login Button -->
        <Button
          type="submit"
          :label="$t('login.loginButton')"
          class="w-full"
          :loading="isLoading"
          :disabled="isLoading"
        />

        <!-- Links -->
        <div class="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
          <a
            href="/register"
            class="text-text font-semibold transition-colors hover:text-primary underline"
          >
            {{ $t("login.register") }}
          </a>
          <a
            href="/forgot-password"
            class="text-text font-semibold transition-colors hover:text-primary underline"
          >
            {{ $t("login.forgotPassword") }}
          </a>
        </div>
      </form>
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
import type { ApiResponse, LoginResponse } from "~/types/api"

const router = useRouter()
const { t, locale } = useI18n()

// Form state
const vpfIdOrEmail = ref("")
const password = ref("")
const isLoading = ref(false)
const loginError = ref<string | null>(null)
const showNoticeModal = ref(false)

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

    const response = await $fetch<ApiResponse<LoginResponse>>("/api/auth/login", {
      method: "POST",
      body: loginData,
      ignoreResponseError: true,
    })

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
      await router.push("/")
    } else {
      loginError.value = response.message[locale.value as "en" | "vi"] || response.message.en || t("login.error")
    }
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : t("login.error")
  } finally {
    isLoading.value = false
  }
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
