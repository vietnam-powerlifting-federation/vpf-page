<template>
  <PagePanel :title="$t('profile.vipBenefits.livePreview')">
    <template #actions>
      <Button severity="secondary" variant="text" size="small" @click="fullPreviewVisible = true">
        <AppIcon name="lucide:maximize-2" class="size-4" />
        {{ $t("profile.vipBenefits.fullPreview") }}
      </Button>
    </template>
    <VipProfilePreview
      :full-name="membership.athleteName"
      :form="settings.form"
      :avatar-preview="settings.images.avatarPreview"
      :banner-previews="settings.images.bannerPreviews"
      scale="compact"
    />
  </PagePanel>

  <Dialog v-model:visible="fullPreviewVisible" modal dismissable-mask :header="$t('profile.vipBenefits.fullPreview')" class="w-[min(1100px,95vw)]">
    <VipProfilePreview
      :full-name="membership.athleteName"
      :form="settings.form"
      :avatar-preview="settings.images.avatarPreview"
      :banner-previews="settings.images.bannerPreviews"
      scale="full"
    />
  </Dialog>
</template>

<script setup lang="ts">
import type { useVipMembership } from "~/composables/useVipMembership"
import type { useVipSettingsForm } from "~/composables/useVipSettingsForm"

/** How the VIP profile will look as it is edited, compact here and full size in a dialog. */
defineProps<{
  membership: ReturnType<typeof useVipMembership>
  settings: ReturnType<typeof useVipSettingsForm>
}>()

const fullPreviewVisible = ref(false)
</script>
