<template>
  <div class="overflow-hidden rounded-md border border-surface-200 bg-surface-50">
    <div v-if="isEmpty" class="m-3 grid justify-items-center gap-2 rounded-md border-2 border-dashed border-surface-300 px-4 py-10 text-center">
      <AppIcon name="lucide:image" class="size-8 text-muted-color" />
      <p class="text-sm text-muted-color">{{ $t("profile.vipBenefits.previewEmpty") }}</p>
    </div>

    <!-- The same component the public profile renders, sized for this frame. -->
    <AthleteVipHero
      v-else
      :full-name="fullName"
      :vip="form"
      :avatar="avatarPreview"
      :banners="bannerPreviews"
      :scale="scale"
      title-tag="h2"
      class="pb-4"
      :class="scale === 'full' && 'md:pb-8'"
    />
  </div>
</template>

<script setup lang="ts">
import type { VipSettingsFormState } from "~/types/vip"

const props = withDefaults(
  defineProps<{
    fullName: string
    form: VipSettingsFormState
    /** Saved R2 url or a blob: url for a not-yet-uploaded file. */
    avatarPreview: string | null
    /** Already resolved and filtered, in slot order. */
    bannerPreviews: string[]
    scale?: "compact" | "full"
  }>(),
  { scale: "compact" },
)

const isEmpty = computed(() => !props.avatarPreview && props.bannerPreviews.length === 0)
</script>
