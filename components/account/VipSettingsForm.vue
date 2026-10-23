<template>
  <div class="grid gap-8">
    <!-- Avatar -->
    <div class="flex flex-wrap items-center gap-4">
      <div class="grid size-24 shrink-0 place-items-center overflow-hidden rounded-md border border-surface-200 bg-surface-100">
        <img v-if="avatarPreview" :src="avatarPreview" alt="" class="size-full object-cover">
        <AppIcon v-else name="lucide:user" class="size-8 text-muted-color" />
      </div>
      <div class="grid gap-2">
        <p class="font-semibold">{{ $t("profile.vipBenefits.avatar") }}</p>
        <p class="text-sm text-muted-color">{{ $t("profile.vipBenefits.changeAvatar") }}</p>
        <Button :label="$t('profile.vipBenefits.change')" severity="secondary" variant="outlined" size="small" class="justify-self-start" @click="emit('avatar-click')" />
      </div>
    </div>

    <!-- Cover photos -->
    <fieldset class="m-0 grid gap-2 border-0 p-0">
      <legend class="p-0 font-semibold">{{ $t("profile.vipBenefits.coverPhotos") }}</legend>
      <p class="text-sm text-muted-color">{{ $t("profile.vipBenefits.maxPhotos") }}</p>
      <ul class="flex flex-wrap gap-3">
        <li v-for="idx in 5" :key="idx" class="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-md border border-surface-200 bg-surface-100">
          <img v-if="bannerSlots[idx - 1]" :src="bannerSlots[idx - 1] ?? ''" alt="" class="size-full object-cover">
          <AppIcon v-else name="lucide:image" class="size-6 text-muted-color" />
          <button
            v-if="bannerSlots[idx - 1]"
            type="button"
            class="absolute top-0.5 right-0.5 grid size-8 cursor-pointer place-items-center rounded bg-danger text-surface-0 hover:opacity-90"
            :aria-label="`${$t('profile.vipBenefits.removePhoto')} ${idx}`"
            @click="emit('clear-banner', idx)"
          >
            <AppIcon name="lucide:x" class="size-4" />
          </button>
        </li>
        <li v-if="nextBannerSlot !== null">
          <button
            type="button"
            class="grid size-20 cursor-pointer place-items-center rounded-md border-2 border-dashed border-surface-300 text-muted-color hover:border-accent hover:bg-surface-100"
            :aria-label="$t('profile.vipBenefits.addPhoto')"
            @click="emit('trigger-banner-input')"
          >
            <AppIcon name="lucide:plus" class="size-6" />
          </button>
        </li>
      </ul>
    </fieldset>

    <VipNameDecorator
      :disabled="false"
      :decorator1="form.decorator1 ?? null"
      :decorator2="form.decorator2 ?? null"
      :sample-name="athleteName"
      @update="(d1, d2) => emit('update-decorators', d1, d2)"
    />

    <!-- About me -->
    <div class="grid gap-2">
      <AppField v-slot="f" :label="$t('profile.vipBenefits.aboutMe')">
        <Textarea
          :id="f.id"
          :model-value="form.profileDescription ?? ''"
          :placeholder="$t('profile.vipBenefits.aboutMePlaceholder')"
          rows="4"
          class="w-full"
          @update:model-value="(v: string | undefined) => emit('update-field', 'profileDescription', v || null)"
        />
      </AppField>
      <label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted-color">
        <ToggleSwitch :model-value="!!form.displayProfileDescription" @update:model-value="(v: boolean) => emit('update-field', 'displayProfileDescription', v)" />
        {{ $t("profile.vipBenefits.displayOnProfile") }}
      </label>
    </div>

    <!-- Nickname and social links -->
    <div class="grid gap-5 md:grid-cols-2">
      <div v-for="field in textFields" :key="field.key" class="grid gap-2">
        <AppField v-slot="f" :label="$t(field.label)">
          <InputText
            :id="f.id"
            :model-value="(form[field.key] as string | null) ?? ''"
            :placeholder="$t(field.placeholder)"
            :type="field.key === 'vipPhoneNumber' ? 'tel' : field.key === 'alias' ? 'text' : 'url'"
            class="w-full"
            @update:model-value="(v: string | undefined) => emit('update-field', field.key, v || null)"
          />
        </AppField>
        <label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted-color">
          <ToggleSwitch :model-value="!!form[field.toggle]" @update:model-value="(v: boolean) => emit('update-field', field.toggle, v)" />
          {{ $t("profile.vipBenefits.displayOnProfile") }}
        </label>
      </div>
    </div>

    <!-- Sticky action bar: stays reachable while the form is long -->
    <div class="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap items-center justify-between gap-3 border-t border-surface-200 bg-surface-0 px-4 py-3 md:-mx-6 md:-mb-6 md:px-6">
      <p class="flex min-w-0 items-center gap-2 text-sm" role="status">
        <template v-if="locked">
          <AppIcon name="lucide:lock" class="size-4 text-muted-color" />
          <span class="text-muted-color">{{ $t("profile.vipBenefits.lockedHint") }}</span>
        </template>
        <template v-else-if="hasChanges">
          <span class="size-2 rounded-full bg-warn" aria-hidden="true" />
          <span class="font-semibold text-warn">{{ $t("profile.vipBenefits.unsavedIndicator") }}</span>
        </template>
        <template v-else>
          <AppIcon name="lucide:circle-check" class="size-4 text-muted-color" />
          <span class="text-muted-color">{{ $t("profile.vipBenefits.allSaved") }}</span>
        </template>
      </p>

      <div class="flex items-center gap-2">
        <Button v-if="!locked && publicProfileUrl" severity="secondary" variant="text" @click="navigateTo(localePath(publicProfileUrl))">
          <AppIcon name="lucide:external-link" class="size-4" />
          {{ $t("profile.vipBenefits.viewPublicProfile") }}
        </Button>
        <Button v-if="locked" @click="emit('register')">
          <AppIcon name="lucide:star" class="size-4" />
          {{ $t("profile.vipBenefits.registerNow") }}
        </Button>
        <Button v-else :label="$t('profile.vipBenefits.saveChanges')" :loading="isSubmitting" :disabled="isSubmitting || !hasChanges" @click="emit('submit')" />
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

const localePath = useLocalePath()

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
