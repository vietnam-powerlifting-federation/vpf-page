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
          :disabled="disabled"
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
          <img v-if="bannerPreview(idx)" :src="bannerPreview(idx) ?? ''" alt="" class="w-full h-full object-cover">
          <i v-else class="pi pi-image text-2xl text-surface-500" />
          <button
            v-if="!disabled && bannerPreview(idx)"
            type="button"
            class="absolute top-0.5 right-0.5 w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
            aria-label="Remove"
            @click="emit('clear-banner', idx)"
          >
            <i class="pi pi-times" />
          </button>
        </div>
        <div
          v-if="!disabled && nextBannerSlot !== null"
          class="w-20 h-20 rounded-lg border-2 border-dashed border-surface-600 flex items-center justify-center shrink-0 cursor-pointer hover:border-primary hover:bg-surface-800"
          @click="emit('trigger-banner-input')"
        >
          <i class="pi pi-plus text-surface-500" />
        </div>
        <div
          v-else-if="disabled"
          class="w-20 h-20 rounded-lg border-2 border-dashed border-surface-600 flex items-center justify-center shrink-0 cursor-not-allowed"
        >
          <i class="pi pi-plus text-surface-500" />
        </div>
      </div>
    </div>

    <!-- About me -->
    <div class="flex flex-wrap items-start gap-4 gap-y-2">
      <div class="flex-1 min-w-[200px]">
        <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.aboutMe") }}</label>
        <Textarea
          :model-value="form.profileDescription ?? ''"
          :placeholder="$t('profile.vipBenefits.aboutMePlaceholder')"
          class="w-full"
          rows="4"
          :disabled="disabled"
          @update:model-value="(v: string) => emit('update-field', 'profileDescription', v || null)"
        />
      </div>
      <div class="flex items-center gap-2 pt-8">
        <ToggleSwitch
          :model-value="!!form.displayProfileDescription"
          :aria-label="$t('profile.vipBenefits.displayOnProfile')"
          :disabled="disabled"
          @update:model-value="(v: boolean) => emit('update-field', 'displayProfileDescription', v)"
        />
        <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
      </div>
    </div>

    <!-- Nickname -->
    <div class="flex flex-wrap items-center gap-4 gap-y-2">
      <div class="flex-1 min-w-[200px]">
        <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.nickname") }}</label>
        <InputText
          :model-value="form.alias ?? ''"
          :placeholder="$t('profile.vipBenefits.nicknamePlaceholder')"
          class="w-full"
          :disabled="disabled"
          @update:model-value="(v: string) => emit('update-field', 'alias', v || null)"
        />
      </div>
      <div class="flex items-center gap-2 pt-8">
        <ToggleSwitch
          :model-value="!!form.displayAlias"
          :aria-label="$t('profile.vipBenefits.displayOnProfile')"
          :disabled="disabled"
          @update:model-value="(v: boolean) => emit('update-field', 'displayAlias', v)"
        />
        <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
      </div>
    </div>

    <!-- Facebook -->
    <div class="flex flex-wrap items-center gap-4 gap-y-2">
      <div class="flex-1 min-w-[200px]">
        <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.facebook") }}</label>
        <InputText
          :model-value="form.facebook ?? ''"
          :placeholder="$t('profile.vipBenefits.facebookPlaceholder')"
          class="w-full"
          :disabled="disabled"
          @update:model-value="(v: string) => emit('update-field', 'facebook', v || null)"
        />
      </div>
      <div class="flex items-center gap-2 pt-8">
        <ToggleSwitch
          :model-value="!!form.displayFacebook"
          :aria-label="$t('profile.vipBenefits.displayOnProfile')"
          :disabled="disabled"
          @update:model-value="(v: boolean) => emit('update-field', 'displayFacebook', v)"
        />
        <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
      </div>
    </div>

    <!-- Instagram -->
    <div class="flex flex-wrap items-center gap-4 gap-y-2">
      <div class="flex-1 min-w-[200px]">
        <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.instagram") }}</label>
        <InputText
          :model-value="form.instagram ?? ''"
          :placeholder="$t('profile.vipBenefits.instagramPlaceholder')"
          class="w-full"
          :disabled="disabled"
          @update:model-value="(v: string) => emit('update-field', 'instagram', v || null)"
        />
      </div>
      <div class="flex items-center gap-2 pt-8">
        <ToggleSwitch
          :model-value="!!form.displayInstagram"
          :aria-label="$t('profile.vipBenefits.displayOnProfile')"
          :disabled="disabled"
          @update:model-value="(v: boolean) => emit('update-field', 'displayInstagram', v)"
        />
        <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
      </div>
    </div>

    <!-- TikTok -->
    <div class="flex flex-wrap items-center gap-4 gap-y-2">
      <div class="flex-1 min-w-[200px]">
        <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.tiktok") }}</label>
        <InputText
          :model-value="form.tiktok ?? ''"
          :placeholder="$t('profile.vipBenefits.tiktokPlaceholder')"
          class="w-full"
          :disabled="disabled"
          @update:model-value="(v: string) => emit('update-field', 'tiktok', v || null)"
        />
      </div>
      <div class="flex items-center gap-2 pt-8">
        <ToggleSwitch
          :model-value="!!form.displayTiktok"
          :aria-label="$t('profile.vipBenefits.displayOnProfile')"
          :disabled="disabled"
          @update:model-value="(v: boolean) => emit('update-field', 'displayTiktok', v)"
        />
        <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
      </div>
    </div>

    <!-- YouTube -->
    <div class="flex flex-wrap items-center gap-4 gap-y-2">
      <div class="flex-1 min-w-[200px]">
        <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.youtube") }}</label>
        <InputText
          :model-value="form.youtube ?? ''"
          :placeholder="$t('profile.vipBenefits.youtubePlaceholder')"
          class="w-full"
          :disabled="disabled"
          @update:model-value="(v: string) => emit('update-field', 'youtube', v || null)"
        />
      </div>
      <div class="flex items-center gap-2 pt-8">
        <ToggleSwitch
          :model-value="!!form.displayYoutube"
          :aria-label="$t('profile.vipBenefits.displayOnProfile')"
          :disabled="disabled"
          @update:model-value="(v: boolean) => emit('update-field', 'displayYoutube', v)"
        />
        <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
      </div>
    </div>

    <!-- Phone -->
    <div class="flex flex-wrap items-center gap-4 gap-y-2">
      <div class="flex-1 min-w-[200px]">
        <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.phoneNumber") }}</label>
        <InputText
          :model-value="form.vipPhoneNumber ?? ''"
          :placeholder="$t('profile.vipBenefits.phoneNumberPlaceholder')"
          class="w-full"
          :disabled="disabled"
          @update:model-value="(v: string) => emit('update-field', 'vipPhoneNumber', v || null)"
        />
      </div>
      <div class="flex items-center gap-2 pt-8">
        <ToggleSwitch
          :model-value="!!form.displayMobilePhone"
          :aria-label="$t('profile.vipBenefits.displayOnProfile')"
          :disabled="disabled"
          @update:model-value="(v: boolean) => emit('update-field', 'displayMobilePhone', v)"
        />
        <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
      </div>
    </div>

    <div class="pt-4 flex justify-center">
      <Button
        :label="$t('profile.vipBenefits.saveChanges')"
        class="bg-primary text-primary-contrast"
        :loading="!disabled && isSubmitting"
        :disabled="disabled || isSubmitting || !hasChanges"
        @click="emit('submit')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from "@/components/volt/Button.vue"
import InputText from "@/components/volt/InputText.vue"
import Textarea from "@/components/volt/Textarea.vue"
import ToggleSwitch from "@/components/volt/ToggleSwitch.vue"
import type { VipBenefits } from "~/types/vip"

type FormState = Partial<
  Omit<VipBenefits, "vpfId"> & {
    avatarImageUrl: string | null
    bannerImageUrl1: string | null
    bannerImageUrl2: string | null
    bannerImageUrl3: string | null
    bannerImageUrl4: string | null
    bannerImageUrl5: string | null
  }
>

const props = defineProps<{
  disabled: boolean
  form: FormState
  avatarPreview: string | null
  bannerPreview: (idx: number) => string | null
  nextBannerSlot: number | null
  isSubmitting: boolean
  hasChanges: boolean
}>()

const emit = defineEmits<{
  "update-field": [key: string, value: string | boolean | null]
  "avatar-click": []
  "trigger-banner-input": []
  "clear-banner": [idx: number]
  "submit": []
}>()
</script>
