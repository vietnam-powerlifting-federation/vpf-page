<template>
  <!-- Step 2: member or guest, and consent -->
  <div class="grid gap-5">
    <h2 :ref="reg.wizard.setHeading" tabindex="-1" class="font-display text-2xl font-bold uppercase focus:outline-none">{{ $t("competitionRegistration.capacityLegend") }}</h2>

    <fieldset class="m-0 grid gap-3 border-0 p-0">
      <legend class="sr-only">{{ $t("competitionRegistration.capacityLegend") }}</legend>
      <label
        v-for="option in reg.entry.capacityOptions"
        :key="option.value"
        class="flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors duration-120 ease-snap"
        :class="reg.entry.form.capacity === option.value ? 'border-accent bg-accent-soft' : 'border-surface-300 hover:bg-surface-100'"
      >
        <RadioButton v-model="reg.entry.form.capacity" :input-id="`cap-${option.value}`" :value="option.value" class="mt-0.5" />
        <span>
          <span class="block font-semibold">{{ option.label }}</span>
          <span class="block text-sm text-muted-color">{{ option.hint }}</span>
        </span>
      </label>
    </fieldset>

    <div class="grid gap-3">
      <label v-if="reg.entry.form.capacity === 'member'" class="flex min-h-11 cursor-pointer items-center gap-3">
        <Checkbox v-model="reg.entry.form.membershipTermsAccepted" binary input-id="terms" />
        <span>{{ $t("competitionRegistration.membershipTerms") }}</span>
      </label>
      <label class="flex min-h-11 cursor-pointer items-center gap-3">
        <Checkbox v-model="reg.entry.form.dataConsentAccepted" binary input-id="consent" />
        <span>{{ $t("competitionRegistration.dataConsent") }}</span>
      </label>
    </div>

    <div class="flex justify-between border-t border-surface-200 pt-4">
      <Button severity="secondary" variant="text" @click="reg.wizard.goTo('identity')">
        <AppIcon name="lucide:arrow-left" class="size-4" />
        {{ $t("competitionRegistration.back") }}
      </Button>
      <Button :disabled="!reg.entry.canProceedCapacity" @click="reg.wizard.goTo('details')">
        {{ $t("competitionRegistration.next") }}
        <AppIcon name="lucide:arrow-right" class="size-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Step 2: enter as a member or a guest, and accept the terms and data consent. */
const reg = useRegistration()
</script>
