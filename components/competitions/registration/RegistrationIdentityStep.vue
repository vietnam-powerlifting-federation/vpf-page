<template>
  <!-- Step 1: identity verification (must be submitted before registering) -->
  <div class="grid gap-5">
    <h2 :ref="reg.wizard.setHeading" tabindex="-1" class="font-display text-2xl font-bold uppercase focus:outline-none">{{ $t("competitionRegistration.stepIdentity") }}</h2>
    <Message v-if="reg.entry.identityStatus === 'approved'" severity="success" :closable="false">{{ $t("competitionRegistration.identityApprovedNotice") }}</Message>
    <Message v-else-if="reg.entry.identityStatus === 'pending'" severity="info" :closable="false">{{ $t("competitionRegistration.identityPendingNotice") }}</Message>
    <Message v-else severity="warn" :closable="false">{{ $t("competitionRegistration.identityRequired") }}</Message>

    <VerificationForm @update:status="(s) => (reg.entry.identityStatus = s ?? 'not_submitted')" @submitted="reg.refreshEligibility" />

    <div class="flex justify-end border-t border-surface-200 pt-4">
      <Button :disabled="!reg.entry.canProceedIdentity" @click="reg.wizard.goTo('capacity')">
        {{ $t("competitionRegistration.next") }}
        <AppIcon name="lucide:arrow-right" class="size-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Step 1: submit identity verification (admin approval is not needed to continue). */
const reg = useRegistration()
</script>
