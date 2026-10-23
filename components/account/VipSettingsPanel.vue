<template>
  <PagePanel>
    <VipSettingsForm
      :form="settings.form"
      :athlete-name="membership.athleteName"
      :avatar-preview="settings.images.avatarPreview"
      :banner-slots="settings.images.bannerSlots"
      :next-banner-slot="settings.images.nextBannerSlot"
      :is-submitting="settings.isSubmitting"
      :has-changes="settings.hasChanges"
      :locked="!membership.showActive"
      :public-profile-url="membership.publicProfileUrl"
      @update-field="settings.updateField"
      @update-decorators="settings.updateDecorators"
      @avatar-click="avatarInput?.click()"
      @trigger-banner-input="bannerInput?.click()"
      @clear-banner="settings.images.clearBanner"
      @submit="settings.submit"
      @register="membership.goToCheckout"
    />
  </PagePanel>

  <input ref="avatarInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden" tabindex="-1" aria-hidden="true" @change="settings.images.chooseAvatar($event.target as HTMLInputElement)">
  <input ref="bannerInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden" tabindex="-1" aria-hidden="true" @change="settings.images.chooseBanner($event.target as HTMLInputElement)">

  <!-- Crop before upload; the cropper library loads only when this opens. -->
  <LazyImageCropperDialog
    v-if="settings.images.cropSrc"
    :visible="settings.images.cropVisible"
    :src="settings.images.cropSrc"
    :aspect-ratio="settings.images.cropSettings.aspectRatio"
    :output-width="settings.images.cropSettings.width"
    :output-height="settings.images.cropSettings.height"
    :output-type="settings.images.cropSettings.type"
    :file-name="settings.images.cropSettings.fileName"
    @apply="settings.images.applyCrop"
    @error="settings.images.cropFailed"
    @update:visible="settings.images.setCropVisible"
  />
</template>

<script setup lang="ts">
import type { useVipMembership } from "~/composables/useVipMembership"
import type { useVipSettingsForm } from "~/composables/useVipSettingsForm"

/** The VIP profile form: banners, avatar, name colours, bio and socials, with the file pickers and the crop step. */
defineProps<{
  membership: ReturnType<typeof useVipMembership>
  settings: ReturnType<typeof useVipSettingsForm>
}>()

const avatarInput = ref<HTMLInputElement | null>(null)
const bannerInput = ref<HTMLInputElement | null>(null)
</script>
