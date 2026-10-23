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

/** Identity verification: the form, a note on why it is needed, and a way to skip it until later. */
const localePath = useLocalePath()

const status = ref<IdentityVerification["status"] | null>(null)
const isLocked = computed(() => status.value === "approved")

const skip = () => navigateTo(localePath("/profile"))
</script>
