<template>
  <!-- Identity verification status, with the way to (re)submit it -->
  <PagePanel>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <AppIcon name="lucide:id-card" class="size-6 text-muted-color" />
        <span class="font-semibold">{{ $t("profile.verification.label") }}</span>
        <Tag :value="identity.text" :severity="identity.severity" />
      </div>
      <Button v-if="!identity.isVerified" :label="identity.buttonLabel" @click="navigateTo('/verification')" />
    </div>
  </PagePanel>
</template>

<script setup lang="ts">
/** Whether the athlete's identity is verified, and the way to (re)submit it. */
const identity = useIdentityStatus()
</script>
