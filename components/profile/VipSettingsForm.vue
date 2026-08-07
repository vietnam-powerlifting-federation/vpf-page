<template>
  <div class="space-y-6">
    <!-- Avatar -->
    <div class="flex flex-wrap items-start gap-4">
      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.avatar") }}</label>
        <div class="w-24 h-24 rounded-lg overflow-hidden bg-surface-700 flex items-center justify-center border border-surface-600">
          <img v-if="avatarPreview" :src="avatarPreview" alt="" class="w-full h-full object-cover">
          <i v-else class="pi pi-user text-3xl text-surface-500" />
        </div>
        <p class="text-sm text-surface-400">{{ $t("profile.vipBenefits.changeAvatar") }}</p>
        <Button
          :label="$t('profile.vipBenefits.change')"
          size="small"
          class="bg-primary text-primary-contrast"
          @click="emit('avatar-click')"
        />
      </div>
    </div>

    <!-- Cover photos -->
    <div>
      <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.coverPhotos") }}</label>
      <p class="text-sm text-surface-500 mb-2">{{ $t("profile.vipBenefits.maxPhotos") }}</p>
      <div class="flex flex-wrap gap-3">
        <div
          v-for="idx in 5"
          :key="idx"
          class="w-20 h-20 rounded-lg overflow-hidden bg-surface-700 border border-surface-600 flex items-center justify-center relative shrink-0"
        >
          <img v-if="bannerSlots[idx - 1]" :src="bannerSlots[idx - 1] ?? ''" alt="" class="w-full h-full object-cover">
          <i v-else class="pi pi-image text-2xl text-surface-500" />
          <button
            v-if="bannerSlots[idx - 1]"
            type="button"
            class="absolute top-0.5 right-0.5 w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
            :aria-label="$t('profile.vipBenefits.removePhoto')"
            @click="emit('clear-banner', idx)"
          >
            <i class="pi pi-times" />
          </button>
        </div>
        <div
          v-if="nextBannerSlot !== null"
          class="w-20 h-20 rounded-lg border-2 border-dashed border-surface-600 flex items-center justify-center shrink-0 cursor-pointer hover:border-primary hover:bg-surface-800"
          @click="emit('trigger-banner-input')"
        >
          <i class="pi pi-plus text-surface-500" />
        </div>
      </div>
    </div>

    <!-- Name colour -->
    <ProfileVipNameDecorator
      :disabled="false"
      :decorator1="form.decorator1 ?? null"
      :decorator2="form.decorator2 ?? null"
      :sample-name="athleteName"
      @update="(d1, d2) => emit('update-decorators', d1, d2)"
    />

    <!-- About me -->
    <div class="flex flex-wrap items-start gap-4 gap-y-2">
      <div class="flex-1 min-w-[200px]">
        <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.aboutMe") }}</label>
        <Textarea
          :model-value="form.profileDescription ?? ''"
          :placeholder="$t('profile.vipBenefits.aboutMePlaceholder')"
          class="w-full"
          rows="4"
          @update:model-value="(v: string) => emit('update-field', 'profileDescription', v || null)"
        />
      </div>
      <div class="flex items-center gap-2 pt-8">
        <ToggleSwitch
          :model-value="!!form.displayProfileDescription"
          :aria-label="$t('profile.vipBenefits.displayOnProfile')"
          @update:model-value="(v: boolean) => emit('update-field', 'displayProfileDescription', v)"
        />
        <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
      </div>
    </div>

    <!-- Nickname and social links -->
    <div v-for="field in textFields" :key="field.key" class="flex flex-wrap items-center gap-4 gap-y-2">
      <div class="flex-1 min-w-[200px]">
        <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t(field.label) }}</label>
        <InputText
          :model-value="(form[field.key] as string | null) ?? ''"
          :placeholder="$t(field.placeholder)"
          class="w-full"
          @update:model-value="(v: string) => emit('update-field', field.key, v || null)"
        />
      </div>
      <div class="flex items-center gap-2 pt-8">
        <ToggleSwitch
          :model-value="!!form[field.toggle]"
          :aria-label="$t('profile.vipBenefits.displayOnProfile')"
          @update:model-value="(v: boolean) => emit('update-field', field.toggle, v)"
        />
        <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
      </div>
    </div>

    <!-- Sticky action bar: stays reachable now the form is long -->
    <div class="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-surface-900/95 backdrop-blur border-t border-surface-700 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-sm min-w-0">
        <template v-if="locked">
          <i class="pi pi-lock text-surface-400 shrink-0" />
          <span class="text-surface-400">{{ $t("profile.vipBenefits.lockedHint") }}</span>
        </template>
        <template v-else-if="hasChanges">
          <i class="pi pi-circle-fill text-amber-400 text-xs shrink-0" />
          <span class="text-amber-400">{{ $t("profile.vipBenefits.unsavedIndicator") }}</span>
        </template>
        <template v-else>
          <i class="pi pi-check-circle text-surface-500 shrink-0" />
          <span class="text-surface-500">{{ $t("profile.vipBenefits.allSaved") }}</span>
        </template>
      </div>

      <div class="flex items-center gap-2">
        <Button
          v-if="!locked && publicProfileUrl"
          :label="$t('profile.vipBenefits.viewPublicProfile')"
          icon="pi pi-external-link"
          severity="secondary"
          text
          @click="navigateTo(publicProfileUrl)"
        />
        <Button
          v-if="locked"
          :label="$t('profile.vipBenefits.registerNow')"
          icon="pi pi-star"
          class="bg-primary text-primary-contrast"
          @click="emit('register')"
        />
        <Button
          v-else
          :label="$t('profile.vipBenefits.saveChanges')"
          class="bg-primary text-primary-contrast"
          :loading="isSubmitting"
          :disabled="isSubmitting || !hasChanges"
          @click="emit('submit')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VipSettingsFormState } from "~/types/vip"

defineProps<{
  form: VipSettingsFormState
  athleteName: string
  avatarPreview: string | null
  /** Resolved preview url per slot, in slot order. */
  bannerSlots: (string | null)[]
  nextBannerSlot: number | null
  isSubmitting: boolean
  hasChanges: boolean
  /** Non-VIP athletes may edit and preview freely, but cannot publish. */
  locked: boolean
  publicProfileUrl: string | null
}>()

const emit = defineEmits<{
  "update-field": [key: string, value: string | boolean | null]
  "update-decorators": [d1: string | null, d2: string | null]
  "avatar-click": []
  "trigger-banner-input": []
  "clear-banner": [idx: number]
  "submit": []
  "register": []
}>()

type TextField = {
  key: "alias" | "facebook" | "instagram" | "tiktok" | "youtube" | "vipPhoneNumber"
  toggle: "displayAlias" | "displayFacebook" | "displayInstagram" | "displayTiktok" | "displayYoutube" | "displayMobilePhone"
  label: string
  placeholder: string
}

const textFields: TextField[] = [
  { key: "alias", toggle: "displayAlias", label: "profile.vipBenefits.nickname", placeholder: "profile.vipBenefits.nicknamePlaceholder" },
  { key: "facebook", toggle: "displayFacebook", label: "profile.vipBenefits.facebook", placeholder: "profile.vipBenefits.facebookPlaceholder" },
  { key: "instagram", toggle: "displayInstagram", label: "profile.vipBenefits.instagram", placeholder: "profile.vipBenefits.instagramPlaceholder" },
  { key: "tiktok", toggle: "displayTiktok", label: "profile.vipBenefits.tiktok", placeholder: "profile.vipBenefits.tiktokPlaceholder" },
  { key: "youtube", toggle: "displayYoutube", label: "profile.vipBenefits.youtube", placeholder: "profile.vipBenefits.youtubePlaceholder" },
  { key: "vipPhoneNumber", toggle: "displayMobilePhone", label: "profile.vipBenefits.phoneNumber", placeholder: "profile.vipBenefits.phoneNumberPlaceholder" },
]
</script>
