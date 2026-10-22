<template>
  <AuthCard :title="$t('verifyEmail.title')" :subtitle="$t('verifyEmail.subtitle')">
    <form class="grid gap-5" novalidate @submit.prevent="handleVerify">
      <AppField v-slot="f" :label="$t('verifyEmail.codeLabel')">
        <AppInput :id="f.id" v-model="code" inputmode="numeric" autocomplete="one-time-code" class="w-full font-display text-xl tracking-[0.3em]" />
      </AppField>
      <AppButton type="submit" block :loading="isLoading">{{ $t('verifyEmail.verifyButton') }}</AppButton>
      <p class="text-center text-sm text-muted-color">
        {{ $t("verifyEmail.noCode") }}
        <button type="button" class="min-h-11 cursor-pointer font-semibold text-accent underline-offset-3 hover:underline disabled:opacity-50" :disabled="isResending" @click="handleResend">
          {{ $t("verifyEmail.resend") }}
        </button>
      </p>
    </form>
  </AuthCard>
</template>

<script setup lang="ts">
import type { ApiResponse } from "~/types/api"

const { t } = useI18n()
const toast = useToast()

const code = ref("")
const isLoading = ref(false)
const isResending = ref(false)

type StatusData = { emailVerified: boolean; identityVerified: boolean; verification: unknown }

const msg = useApiMessage()
const localePath = useLocalePath()

onMounted(async () => {
  // If already verified, skip straight to the identity verification form.
  const res = await $fetch("/api/athletes/me/verification", {
    ignoreResponseError: true,
    credentials: "include",
  }) as ApiResponse<StatusData>
  if (res.success && res.data.emailVerified) {
    await navigateTo(localePath("/verification"))
  }
})

const handleVerify = async () => {
  if (!code.value.trim()) {
    toast.add({ severity: "error", summary: t("general.error"), detail: t("verifyEmail.codeRequired"), life: 5000 })
    return
  }
  isLoading.value = true
  try {
    const res = await $fetch("/api/auth/verify-email", {
      method: "POST",
      body: { code: code.value.trim() },
      ignoreResponseError: true,
      credentials: "include",
    }) as ApiResponse<{ emailVerified: boolean }>
    if (res.success) {
      await navigateTo(localePath("/verification"))
    } else {
      toast.add({ severity: "error", summary: t("general.error"), detail: msg(res) || t("general.error"), life: 5000 })
    }
  } catch (e) {
    toast.add({ severity: "error", summary: t("general.error"), detail: e instanceof Error ? e.message : t("general.error"), life: 5000 })
  } finally {
    isLoading.value = false
  }
}

const handleResend = async () => {
  isResending.value = true
  try {
    const res = await $fetch("/api/auth/resend-verification", {
      method: "POST",
      ignoreResponseError: true,
      credentials: "include",
    }) as ApiResponse<null>
    if (res.success) {
      toast.add({ severity: "info", summary: t("verifyEmail.title"), detail: msg(res) || t("verifyEmail.resent"), life: 4000 })
    } else {
      toast.add({ severity: "error", summary: t("general.error"), detail: msg(res) || t("general.error"), life: 5000 })
    }
  } catch (e) {
    toast.add({ severity: "error", summary: t("general.error"), detail: e instanceof Error ? e.message : t("general.error"), life: 5000 })
  } finally {
    isResending.value = false
  }
}

useHead({ title: () => t("verifyEmail.title") })

definePageMeta({
  layout: "auth",
  middleware: "auth",
})
</script>
