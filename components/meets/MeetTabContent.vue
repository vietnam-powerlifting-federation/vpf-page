<template>
  <div class="min-h-full">
    <ClientOnly>
      <div v-if="pending" class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="text-lg font-semibold mb-2 text-primary">{{ $t("meets.loadingMeetDetails") }}</div>
          <div class="text-sm text-surface-500">{{ $t("general.pleaseWait") }}</div>
        </div>
      </div>

      <div v-else-if="error || !meet" class="text-center py-12">
        <div class="text-lg font-semibold mb-2 text-error">{{ $t("meets.errorLoadingMeet") }}</div>
        <div class="text-sm text-surface-500">{{ error?.message ?? $t("meets.meetNotFound") }}</div>
      </div>

      <div v-else class="mt-6">
        <slot />
      </div>

      <template #fallback>
        <div class="flex items-center justify-center py-12">
          <div class="text-center">
            <div class="text-lg font-semibold mb-2 text-primary">{{ $t("meets.loadingMeetDetails") }}</div>
            <div class="text-sm text-surface-500">{{ $t("general.pleaseWait") }}</div>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { MeetPublic } from "~/types/meets"

defineProps<{
  pending: boolean
  error: Error | null
  meet: MeetPublic | null
}>()
</script>
