<template>
  <div class="bg-surface-100 dark:bg-surface-900 py-10 md:py-14 px-4 min-h-[70vh]">
    <div class="container mx-auto max-w-md">
      <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 shadow-sm p-8">
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">{{ $t("verifyEmail.title") }}</h1>
        <p class="mt-2 text-sm text-surface-600 dark:text-surface-300">{{ $t("verifyEmail.subtitle") }}</p>

        <form class="mt-8 space-y-5" @submit.prevent="handleVerify">
          <div>
            <label for="code" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
              {{ $t("verifyEmail.codeLabel") }}
            </label>
            <InputText
              id="code"
              v-model="code"
              inputmode="numeric"
              :placeholder="$t('verifyEmail.codePlaceholder')"
              class="w-full tracking-widest"
            />
          </div>

          <Button
            type="submit"
            :label="$t('verifyEmail.verifyButton')"
            class="w-full"
            :loading="isLoading"
            :disabled="isLoading"
          />

          <div class="text-center text-sm text-surface-600 dark:text-surface-300">
            {{ $t("verifyEmail.noCode") }}
            <button
              type="button"
              class="font-semibold text-primary hover:underline disabled:opacity-50"
              :disabled="isResending"
              @click="handleResend"
            >
              {{ $t("verifyEmail.resend") }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import type { ApiResponse } from "~/types/api"

const { t } = useI18n()
const toast = useToast()

const code = ref("")
const isLoading = ref(false)
const isResending = ref(false)

type StatusData = { emailVerified: boolean; identityVerified: boolean; verification: unknown }

const msg = useApiMessage()

onMounted(async () => {
  // If already verified, skip straight to the identity verification form.
  const res = await $fetch("/api/verifications/self", {
    ignoreResponseError: true,
    credentials: "include",
  }) as ApiResponse<StatusData>
  if (res.success && res.data.emailVerified) {
    await navigateTo("/verification")
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
      await navigateTo("/verification")
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
  layout: "with-footer",
  middleware: "auth",
})
</script>
