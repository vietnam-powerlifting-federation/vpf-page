<template>
  <form class="space-y-6" @submit.prevent="editor.save">
    <section class="rounded-md border border-surface-200 p-4 md:p-5 space-y-4">
      <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.meets.sectionBasics") }}</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <label for="meetName" class="text-sm text-muted-color">{{ $t("admin.meets.name") }}</label>
          <InputText id="meetName" v-model="editor.form.meetName" required @blur="editor.suggestSlug" />
        </div>

        <div class="flex flex-col gap-1">
          <label for="meetSlug" class="text-sm text-muted-color">{{ $t("admin.meets.slug") }}</label>
          <InputText id="meetSlug" v-model="editor.form.meetSlug" class="font-mono" />
          <small class="text-muted-color">{{ $t("admin.meets.slugHint") }}</small>
        </div>

        <div class="flex flex-col gap-1">
          <label for="city" class="text-sm text-muted-color">{{ $t("admin.meets.city") }}</label>
          <InputText id="city" v-model="editor.form.city" />
        </div>

        <div class="flex flex-col gap-1">
          <label for="type" class="text-sm text-muted-color">{{ $t("admin.meets.type") }}</label>
          <Select id="type" v-model="editor.form.type" :options="editor.typeOptions" option-label="label" option-value="value" show-clear />
        </div>

        <div class="flex flex-col gap-1 md:col-span-2">
          <label for="mediaLink" class="text-sm text-muted-color">{{ $t("admin.meets.mediaLink") }}</label>
          <InputText id="mediaLink" v-model="editor.form.mediaLink" />
        </div>
      </div>
    </section>

    <section class="rounded-md border border-surface-200 p-4 md:p-5 space-y-4">
      <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.meets.sectionDates") }}</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AppField v-slot="f" :label="$t('admin.meets.hostDate')">
          <DatePicker v-model="editor.hostDate" :input-id="f.id" date-format="dd/mm/yy" show-icon show-button-bar @update:model-value="editor.syncSystemYear" />
        </AppField>

        <AppField v-slot="f" :label="$t('admin.meets.startRegistration')">
          <DatePicker v-model="editor.startRegistration" :input-id="f.id" date-format="dd/mm/yy" show-icon show-button-bar />
          <small class="text-muted-color">{{ $t("admin.meets.openEndedStart") }}</small>
        </AppField>

        <AppField v-slot="f" :label="$t('admin.meets.closeRegistration')">
          <DatePicker v-model="editor.closeRegistration" :input-id="f.id" date-format="dd/mm/yy" show-icon show-button-bar />
          <small class="text-muted-color">{{ $t("admin.meets.openEndedClose") }}</small>
        </AppField>

        <div class="flex flex-col gap-1">
          <label for="systemYear" class="text-sm text-muted-color">{{ $t("admin.meets.systemYear") }}</label>
          <InputNumber id="systemYear" v-model="editor.form.systemYear" :use-grouping="false" :min="1900" :max="2200" />
          <small class="text-muted-color">{{ $t("admin.meets.systemYearHint") }}</small>
        </div>
      </div>
    </section>

    <section class="rounded-md border border-surface-200 p-4 md:p-5 space-y-4">
      <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.meets.sectionEntry") }}</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <label for="entryFee" class="text-sm text-muted-color">{{ $t("admin.meets.entryFee") }}</label>
          <InputNumber id="entryFee" v-model="editor.form.entryFee" :min="0" :step="50000" suffix=" ₫" />
          <small class="text-muted-color">{{ $t("admin.meets.entryFeeHint") }}</small>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <ToggleSwitch v-model="editor.published" input-id="published" />
          <label for="published" class="text-sm text-color">{{ $t("admin.meets.publish") }}</label>
        </div>
        <div class="flex items-center gap-2">
          <ToggleSwitch v-model="editor.form.allowGuestRegistration" input-id="guests" />
          <label for="guests" class="text-sm text-color">{{ $t("admin.meets.allowGuests") }}</label>
        </div>
        <div class="flex items-center gap-2">
          <ToggleSwitch v-model="editor.form.allowSpotterRegistration" input-id="spotters" />
          <label for="spotters" class="text-sm text-color">{{ $t("admin.meets.allowSpotters") }}</label>
        </div>
        <Message v-if="editor.form.allowSpotterRegistration" severity="secondary" size="small" variant="simple">
          {{ $t("admin.meets.spotterStub") }}
        </Message>
        <div class="flex items-center gap-2">
          <ToggleSwitch v-model="editor.form.legacy" input-id="legacy" :disabled="editor.legacyLocked" />
          <label for="legacy" class="text-sm text-color">{{ $t("admin.meets.legacyFlag") }}</label>
        </div>
        <Message v-if="editor.legacyLocked" severity="warn" size="small" variant="simple">
          {{ $t("admin.meets.legacyLocked") }}
        </Message>
      </div>
    </section>

    <div class="flex flex-wrap gap-2">
      <Button type="submit" :label="$t('admin.meets.save')" :loading="editor.saving" />
      <Button
        v-if="!editor.isNew"
        type="button"
        severity="secondary"
        outlined
        @click="editor.cloneOpen = true"><AppIcon name="lucide:copy" class="size-4" />{{ $t('admin.meets.clone') }}</Button>
      <Button v-if="!editor.isNew" v-slot="slotProps" as-child text><NuxtLinkLocale :to="`/admin/meets/${editor.meetId}/entries`" :class="slotProps.class">{{ $t('admin.meets.entries') }}</NuxtLinkLocale></Button>
      <Button v-if="!editor.isNew && !editor.form.legacy" v-slot="slotProps" as-child text><NuxtLinkLocale :to="`/admin/meets/${editor.meetId}/results`" :class="slotProps.class">{{ $t('admin.meets.results') }}</NuxtLinkLocale></Button>
      <div class="flex-1" />
      <Button
        v-if="!editor.isNew"
        type="button"
        severity="danger"
        outlined
        @click="editor.deleteOpen = true"><AppIcon name="lucide:trash-2" class="size-4" />{{ $t('admin.meets.delete') }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
/** The meet's details: name and slug, dates and registration window, entry fee, and what is allowed. */
const editor = useAdminMeetEditor()
</script>
