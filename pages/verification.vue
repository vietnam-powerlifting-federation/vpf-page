<template>
  <AuthCard :title="$t('verification.title')" :subtitle="$t('verification.subtitle')">
    <Message v-if="!isLocked" severity="info" :closable="false" class="mb-6">{{ $t("verification.competeNotice") }}</Message>
    <VerificationForm @update:status="(s) => (status = s)">
      <template #actions>
        <Button v-if="!isLocked" type="button" :label="$t('verification.skip')" severity="secondary" variant="text" class="w-full" @click="skip" />
      </template>
    </VerificationForm>
  </AuthCard>
</template>

<script setup lang="ts">
import type { IdentityVerification } from "~/types/verifications"

const { t } = useI18n()
const localePath = useLocalePath()

const status = ref<IdentityVerification["status"] | null>(null)
const isLocked = computed(() => status.value === "approved")

const skip = () => navigateTo(localePath("/profile"))

useHead({ title: () => t("verification.title") })

definePageMeta({
  layout: "auth",
  middleware: "auth",
  wide: true,
})
</script>
