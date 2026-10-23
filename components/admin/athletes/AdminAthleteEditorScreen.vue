<template>
  <AdminPage
    :title="editor.form.fullName"
    :subtitle="editor.vpfId"
    mono
    width="4xl"
    back-to="/admin/athletes"
    :back-label="$t('admin.athletes.title')"
  >
    <form class="space-y-6" @submit.prevent="editor.save">
      <section class="rounded-md border border-surface-200 p-4 md:p-5 space-y-4">
        <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.athletes.sectionIdentity") }}</h2>
        <Message severity="secondary" size="small" variant="simple">{{ $t("admin.athletes.identityHint") }}</Message>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppField v-slot="f" :label="$t('general.name')">
            <InputText :id="f.id" v-model="editor.form.fullName" />
          </AppField>
          <AppField v-slot="f" :label="$t('general.yearOfBirth')">
            <InputNumber v-model="editor.form.dob" :input-id="f.id" :use-grouping="false" :min="1900" :max="2200" />
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.nationalId')">
            <InputText :id="f.id" v-model="editor.form.nationalId" />
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.nationality')">
            <InputText :id="f.id" v-model="editor.form.nationality" />
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.phone')">
            <InputText :id="f.id" v-model="editor.form.phoneNumber" />
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.email')">
            <InputText :id="f.id" v-model="editor.form.email" />
            <small v-if="editor.emailChanged" class="text-warn">{{ $t("admin.athletes.emailChangeHint") }}</small>
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.address')" class="md:col-span-2">
            <InputText :id="f.id" v-model="editor.form.address" />
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.slug')" class="md:col-span-2">
            <InputText :id="f.id" v-model="editor.form.slug" class="font-mono" />
            <small v-if="editor.slugChanged" class="text-warn">{{ $t("admin.athletes.slugChangeHint") }}</small>
          </AppField>
        </div>
      </section>

      <section class="rounded-md border border-surface-200 p-4 md:p-5 space-y-4">
        <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.athletes.sectionMembership") }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppField v-slot="f" :label="$t('admin.athletes.vpfExpiry')">
            <DatePicker v-model="editor.vpfExpiry" :input-id="f.id" date-format="dd/mm/yy" show-icon show-button-bar />
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.vipExpiry')">
            <DatePicker v-model="editor.vipExpiry" :input-id="f.id" date-format="dd/mm/yy" show-icon show-button-bar />
            <!-- Clearing this revokes VIP (`isVipActive`); permanent VIP = a far-future date. -->
            <small class="text-warn">{{ $t("admin.athletes.vipNullHint") }}</small>
          </AppField>
        </div>
      </section>

      <section class="rounded-md border border-surface-200 p-4 md:p-5 space-y-4">
        <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.athletes.sectionRack") }}</h2>
        <p class="text-sm text-muted-color">{{ $t("admin.athletes.rackHint") }}</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AppField v-for="pin in rackPins" :key="pin.field" v-slot="f" :label="$t(pin.label)">
            <InputNumber v-model="editor.form[pin.field]" :input-id="f.id" :use-grouping="false" :min="0" />
          </AppField>
        </div>
      </section>

      <section class="rounded-md border border-surface-200 p-4 md:p-5 space-y-4">
        <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.athletes.sectionSanctions") }}</h2>

        <div class="flex items-center gap-2">
          <ToggleSwitch v-model="editor.form.drugViolate" input-id="doping" />
          <label for="doping" class="text-sm text-color">{{ $t("admin.athletes.dopingBan") }}</label>
        </div>
        <Message v-if="editor.dopingChanged" severity="warn" size="small">
          {{ $t("admin.athletes.dopingWarning") }}
        </Message>
        <AppField v-if="editor.dopingChanged" v-slot="f" :label="$t('admin.common.reason')">
          <InputText :id="f.id" v-model="editor.drugViolateReason" required />
        </AppField>

        <AppField v-slot="f" :label="$t('admin.athletes.role')">
          <Select v-model="editor.form.role" :aria-labelledby="f.labelId" :options="editor.roleOptions" option-label="label" option-value="value" class="w-48" />
        </AppField>

        <AppField v-slot="f" :label="$t('admin.athletes.notes')">
          <Textarea :id="f.id" v-model="editor.form.notes" rows="3" auto-resize />
          <small class="text-muted-color">{{ $t("admin.athletes.notesHint") }}</small>
        </AppField>
      </section>

      <Button type="submit" :label="$t('admin.common.save')" :loading="editor.saving" :disabled="editor.dopingChanged && !editor.drugViolateReason" />
    </form>

    <AdminAthleteViolations :vpf-id="editor.vpfId" />
  </AdminPage>
</template>

<script setup lang="ts">
/** Edit an athlete's identity, membership dates, rack settings, sanctions and notes. */
const editor = await useAdminAthleteEditor(String(useRoute().params.id))

const rackPins = [
  { field: "squatRackPin", label: "admin.athletes.squatRackPin" },
  { field: "benchRackPin", label: "admin.athletes.benchRackPin" },
  { field: "benchSafetyPin", label: "admin.athletes.benchSafetyPin" },
  { field: "benchFootBlock", label: "admin.athletes.benchFootBlock" },
] as const
</script>
