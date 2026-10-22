<template>
  <AuthCard :title="$t('login.title')" :subtitle="$t('login.subtitle')">
    <form ref="formEl" class="grid gap-5" novalidate @submit.prevent="handleLogin">
      <AppField v-slot="f" :label="$t('login.emailLabel')" :error="errors.vpfIdOrEmail">
        <InputText
          :id="f.id"
          v-model="vpfIdOrEmail"
          :placeholder="$t('login.emailPlaceholder')"
          :invalid="f.invalid"
          :aria-describedby="f.describedBy"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          class="w-full"
        />
      </AppField>

      <AppField v-slot="f" :label="$t('login.password')" :error="errors.password">
        <Password
          v-model="password"
          :input-id="f.id"
          :invalid="f.invalid"
          :aria-describedby="f.describedBy"
          :feedback="false"
          toggle-mask
          autocomplete="current-password"
          class="w-full"
          input-class="w-full"
        />
      </AppField>

      <NuxtLinkLocale to="/forgot-password" class="justify-self-start text-sm font-semibold text-accent underline-offset-3 hover:underline">
        {{ $t("login.forgotPassword") }}
      </NuxtLinkLocale>

      <Button type="submit" :label="$t('login.loginButton')" class="w-full" :loading="isLoading" />

      <button type="button" class="justify-self-start text-left text-sm text-muted-color underline underline-offset-3 hover:text-color" @click="showNoticeModal = true">
        {{ $t("login.noticeTitle") }}
      </button>
    </form>

    <template #footer>
      {{ $t("login.noAccount") }}
      <NuxtLinkLocale to="/register" class="font-semibold text-accent underline-offset-3 hover:underline">{{ $t("login.registerNow") }}</NuxtLinkLocale>
    </template>

    <Dialog v-model:visible="showNoticeModal" :header="$t('login.noticeTitle')" modal class="w-[min(40rem,94vw)]">
      <p class="whitespace-pre-line">{{ $t("login.noticeContent") }}</p>
      <template #footer>
        <Button :label="$t('login.close')" severity="secondary" @click="showNoticeModal = false" />
      </template>
    </Dialog>
  </AuthCard>
</template>

<script setup lang="ts">
import type { ApiResponse, LoginResponse } from "~/types/api"

const { t } = useI18n()
const apiMessage = useApiMessage()
const toast = useToast()
const route = useRoute()
const { refresh: refreshSession } = useAuthSession()
const localePath = useLocalePath()
const formEl = ref<HTMLFormElement | null>(null)

// Form state
const vpfIdOrEmail = ref("")
const password = ref("")
const isLoading = ref(false)
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
  if (!validateForm()) {
    await nextTick()
    formEl.value?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus()
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
      toast.add({ severity: "error", summary: t("general.error"), detail: apiMessage(response) || t("general.error"), life: 5000 })
    }
  } catch (error) {
    toast.add({ severity: "error", summary: t("general.error"), detail: error instanceof Error ? error.message : t("general.error"), life: 5000 })
  } finally {
    isLoading.value = false
  }
}

// Set page meta
useHead({
  title: t("login.title"),
})

definePageMeta({ layout: "auth" })
</script>
