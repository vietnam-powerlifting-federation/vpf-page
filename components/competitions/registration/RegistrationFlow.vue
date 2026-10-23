<template>
  <LoadingState v-if="reg.pending" />

  <Message v-else-if="!reg.eligibility" severity="error" :closable="false">{{ $t("competitionRegistration.loadError") }}</Message>

  <template v-else>
    <RegistrationGate v-if="reg.gate" />

    <div v-else class="grid gap-6">
      <StepIndicator :steps="reg.wizard.stepLabels" :current="reg.wizard.stepIndex" :label="$t('steps.progress')" />

      <Message v-if="reg.eligibility.bans?.violationOutcome === 'pledge'" severity="warn" :closable="false">
        {{ $t("competitionRegistration.pledgeNotice") }}
      </Message>

      <PagePanel ruled>
        <RegistrationIdentityStep v-if="reg.wizard.step === 'identity'" />
        <RegistrationCapacityStep v-else-if="reg.wizard.step === 'capacity'" />
        <RegistrationDetailsStep v-else-if="reg.wizard.step === 'details'" />
        <RegistrationReviewStep v-else-if="reg.wizard.step === 'review'" />
        <RegistrationPaymentStep v-else-if="reg.wizard.step === 'payment' && reg.entry.purchase?.qrUrl" />
        <RegistrationDoneStep v-else-if="reg.wizard.step === 'done' && reg.entry.purchase" />
      </PagePanel>
    </div>
  </template>
</template>

<script setup lang="ts">
/** Competition registration: loading and error states, the reason registration cannot start, or the six-step wizard. */
const reg = useRegistration()
</script>
