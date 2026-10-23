<template>
  <LoadingState v-if="info.pending" />
  <Message v-else-if="info.error" severity="error" :closable="false">{{ $t("general.error") }}</Message>

  <form v-else-if="info.userData" novalidate class="grid gap-6" @submit.prevent="info.submit()">
    <PagePanel :title="$t('profile.tabs.personalInfo')" ruled>
      <div class="grid gap-5 md:grid-cols-2">
        <AppField v-slot="f" :label="$t('profile.vpfId')">
          <InputText :id="f.id" :model-value="info.userData.vpfId" disabled class="w-full" />
        </AppField>
        <AppField v-slot="f" :label="$t('profile.email')" required>
          <InputText :id="f.id" v-model="info.formData.email" type="email" autocomplete="email" class="w-full" />
        </AppField>
        <AppField v-slot="f" :label="$t('profile.phoneNumber')" required>
          <InputText :id="f.id" v-model="info.formData.phoneNumber" type="tel" autocomplete="tel" class="w-full" />
        </AppField>
        <AppField v-slot="f" :label="$t('profile.nationality')" required>
          <InputText :id="f.id" v-model="info.formData.nationality" autocomplete="country-name" class="w-full" />
        </AppField>
        <AppField v-slot="f" :label="$t('profile.dob')" required>
          <InputNumber v-model="info.formData.dob" :input-id="f.id" :use-grouping="false" :min="1900" :max="new Date().getFullYear()" autocomplete="bday-year" class="w-full" input-class="w-full" />
        </AppField>
        <AppField v-slot="f" :label="$t('profile.address')" required class="md:col-span-2">
          <Textarea :id="f.id" v-model="info.formData.address" rows="3" autocomplete="street-address" class="w-full" />
        </AppField>
      </div>
    </PagePanel>

    <PagePanel :title="$t('profile.tabs.competitionSettings')">
      <div class="grid gap-5">
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <AppField v-for="pin in rackPins" :key="pin" v-slot="f" :label="$t(`profile.${pin}`)">
            <InputNumber v-model="info.formData[pin]" :input-id="f.id" :min="0" class="w-full" input-class="w-full" />
          </AppField>
        </div>
        <AppField
          v-slot="f"
          :label="$t('competitionRegistration.photo')"
          :hint="info.userData.competitionPhotoUrl ? $t('competitionRegistration.photoCurrent') : $t('competitionRegistration.photoHint')"
        >
          <input
            :id="f.id"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            :aria-describedby="f.describedBy"
            class="block w-full text-sm text-muted-color file:mr-3 file:min-h-11 file:cursor-pointer file:rounded file:border file:border-surface-300 file:bg-surface-0 file:px-4 file:font-semibold file:text-color hover:file:bg-surface-100"
            @change="info.setPhoto(($event.target as HTMLInputElement).files?.[0] ?? null)"
          >
        </AppField>
      </div>
    </PagePanel>

    <div class="flex justify-end">
      <Button type="submit" :label="$t('profile.save')" :loading="info.isSubmitting" />
    </div>
  </form>
</template>

<script setup lang="ts">
/** The athlete's personal details and competition settings (rack pins, competition photo), saved together. */
const info = usePersonalInfoForm()

const rackPins = ["squatRackPin", "benchRackPin", "benchSafetyPin", "benchFootBlock"] as const
</script>
