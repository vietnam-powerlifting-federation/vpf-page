<template>
  <div class="bg-surface-100 dark:bg-surface-900 py-10 md:py-14 px-4 min-h-[70vh]">
    <div class="container mx-auto max-w-2xl">
      <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 shadow-sm p-8">
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">{{ $t("verification.title") }}</h1>
        <p class="mt-2 text-sm text-surface-600 dark:text-surface-300">{{ $t("verification.subtitle") }}</p>

        <!-- Compete-soon notice -->
        <div
          v-if="!isLocked"
          class="mt-6 p-4 rounded-lg border bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300"
        >
          <p class="text-sm">{{ $t("verification.competeNotice") }}</p>
        </div>

        <div class="mt-6">
          <VerificationForm @update:status="(s) => (status = s)">
            <template #actions>
              <Button
                v-if="!isLocked"
                type="button"
                :label="$t('verification.skip')"
                text
                class="w-full"
                @click="skip"
              />
            </template>
          </VerificationForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import type { IdentityVerification } from "~/types/verifications"

const { t } = useI18n()

const status = ref<IdentityVerification["status"] | null>(null)
const isLocked = computed(() => status.value === "approved")

const skip = () => navigateTo("/openvpf/profile")

useHead({ title: () => t("verification.title") })

definePageMeta({
  layout: "with-footer",
  middleware: "auth",
})
</script>
