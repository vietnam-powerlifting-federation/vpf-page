<template>
  <!-- Step 3: category and equipment settings -->
  <div class="grid gap-5">
    <h2 :ref="reg.wizard.setHeading" tabindex="-1" class="font-display text-2xl font-bold uppercase focus:outline-none">{{ $t("competitionRegistration.detailsLegend") }}</h2>

    <div class="grid gap-4 sm:grid-cols-3">
      <AppField v-slot="f" :label="$t('competitionRegistration.sportGender')" required>
        <Select v-model="entry.form.sex" :options="entry.sexOptions" option-label="label" option-value="value" :aria-labelledby="f.labelId" class="w-full" />
      </AppField>
      <AppField v-slot="f" :label="$t('competitionRegistration.weightClass')" required>
        <Select v-model="entry.form.weightClass" :options="entry.weightClassOptions" option-label="label" option-value="value" :aria-labelledby="f.labelId" class="w-full" />
      </AppField>
      <AppField v-slot="f" :label="$t('competitionRegistration.division')" :hint="entry.form.capacity === 'guest' ? undefined : $t('filters.divisionHint')" required>
        <p v-if="entry.form.capacity === 'guest'" class="py-2 text-sm text-muted-color">{{ $t("competitionRegistration.guestDivisionNote") }}</p>
        <Select
          v-else-if="entry.divisionOptions.length"
          v-model="entry.form.division"
          :options="entry.divisionOptions"
          option-label="label"
          option-value="value"
          :aria-labelledby="f.labelId"
          :aria-describedby="f.describedBy"
          class="w-full"
        />
        <Message v-else severity="warn" :closable="false">{{ $t("competitionRegistration.noDivisions") }}</Message>
      </AppField>
    </div>

    <fieldset class="m-0 grid gap-3 border-0 p-0">
      <legend class="mb-2 p-0 text-sm font-semibold">{{ $t("competitionRegistration.rackPins") }}</legend>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AppField v-for="pin in rackPins" :key="pin.key" v-slot="f" :label="$t(pin.label)">
          <InputNumber v-model="entry.form[pin.key]" :input-id="f.id" :min="0" :max="30" show-buttons button-layout="horizontal" class="w-full" input-class="w-full text-center" :increment-button-props="{ 'aria-label': '+' }" :decrement-button-props="{ 'aria-label': '−' }" />
        </AppField>
      </div>
    </fieldset>

    <AppField
      v-slot="f"
      :label="$t('competitionRegistration.photo')"
      :hint="reg.eligibility?.athlete.competitionPhotoUrl ? $t('competitionRegistration.photoCurrent') : $t('competitionRegistration.photoHint')"
    >
      <input
        :id="f.id"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        :aria-describedby="f.describedBy"
        class="block w-full text-sm text-muted-color file:mr-3 file:min-h-11 file:cursor-pointer file:rounded file:border file:border-surface-300 file:bg-surface-0 file:px-4 file:font-semibold file:text-color hover:file:bg-surface-100"
        @change="entry.setPhoto(($event.target as HTMLInputElement).files?.[0] ?? null)"
      >
    </AppField>

    <label class="flex min-h-11 cursor-pointer items-center gap-3">
      <Checkbox v-model="entry.form.mediaPlus" binary input-id="mediaplus" />
      <span>
        {{ $t("competitionRegistration.mediaPlus") }}
        <span class="text-muted-color">· {{ formatVnd(reg.eligibility?.fees.mediaPlusFee, locale) }}</span>
      </span>
    </label>

    <div class="flex justify-between border-t border-surface-200 pt-4">
      <Button severity="secondary" variant="text" @click="reg.wizard.goTo('capacity')">
        <AppIcon name="lucide:arrow-left" class="size-4" />
        {{ $t("competitionRegistration.back") }}
      </Button>
      <Button :disabled="!entry.canProceedDetails" @click="reg.wizard.goTo('review')">
        {{ $t("competitionRegistration.next") }}
        <AppIcon name="lucide:arrow-right" class="size-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatVnd } from "~/lib/domain/format"

/** Step 3: category, weight class and division, rack pin settings, competition photo, and Media Plus. */
const reg = useRegistration()
const entry = reg.entry
const { locale } = useI18n()

const rackPins = [
  { key: "squatRackPin", label: "competitionRegistration.squatRackPin" },
  { key: "benchRackPin", label: "competitionRegistration.benchRackPin" },
  { key: "benchSafetyPin", label: "competitionRegistration.benchSafetyPin" },
  { key: "benchFootBlock", label: "competitionRegistration.benchFootBlock" },
] as const
</script>
