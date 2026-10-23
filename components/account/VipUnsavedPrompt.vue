<template>
  <Dialog :visible="settings.promptVisible" modal :closable="false" :header="$t('profile.vipBenefits.unsavedTitle')" class="w-[min(460px,95vw)]" @update:visible="settings.keepEditing">
    <p>{{ $t("profile.vipBenefits.unsavedMessage") }}</p>
    <template #footer>
      <Button :label="$t('profile.vipBenefits.unsavedKeepEditing')" severity="secondary" variant="text" @click="settings.keepEditing" />
      <Button :label="$t('profile.vipBenefits.unsavedDiscard')" severity="danger" variant="text" @click="settings.discardChanges" />
      <Button :label="$t('profile.vipBenefits.unsavedSaveAndLeave')" :loading="settings.isSubmitting" @click="settings.saveAndLeave" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { useVipSettingsForm } from "~/composables/useVipSettingsForm"

/** Shown when leaving the page with unsaved VIP profile edits: keep editing, discard, or save and leave. */
defineProps<{ settings: ReturnType<typeof useVipSettingsForm> }>()
</script>
