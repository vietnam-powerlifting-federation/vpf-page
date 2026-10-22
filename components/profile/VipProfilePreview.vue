<template>
  <div class="overflow-hidden rounded-md border border-surface-200 bg-surface-50">
    <div v-if="isEmpty" class="m-3 grid justify-items-center gap-2 rounded-md border-2 border-dashed border-surface-300 px-4 py-10 text-center">
      <AppIcon name="lucide:image" class="size-8 text-muted-color" />
      <p class="text-sm text-muted-color">{{ $t("profile.vipBenefits.previewEmpty") }}</p>
    </div>

    <template v-else>
      <!-- The title band as it appears on the public profile -->
      <div class="flex items-start justify-between gap-4 border-b-[3px] border-accent-fill bg-board bg-dots bg-size-[6px_6px] p-4 text-board-ink" :class="scale === 'full' && 'md:p-8'">
        <div class="min-w-0">
          <p class="font-display text-[0.8125rem] font-bold tracking-[0.12em] text-accent-fill uppercase">{{ $t("athlete.kicker") }}</p>
          <h2 class="font-display font-extrabold break-words uppercase" :class="nameSizeClass" :style="nameStyle">{{ fullName }}</h2>
          <p v-if="form.displayAlias && form.alias" class="mt-1 text-board-ink-2" :class="aliasSizeClass">“{{ form.alias }}”</p>
          <SocialLinks :vip-settings="form" on-board class="mt-3" />
        </div>
        <AthleteAvatar v-if="avatarPreview" :src="avatarPreview" :decorator1="form.decorator1" :decorator2="form.decorator2" :class="avatarClass" />
      </div>

      <div class="grid gap-3 p-4" :class="scale === 'full' && 'md:p-8'">
        <BannerSlideshow v-if="bannerPreviews.length > 0" :banners="bannerPreviews" :height="bannerHeight" />
        <p v-if="form.displayProfileDescription && form.profileDescription" class="whitespace-pre-line" :class="scale === 'full' ? 'text-base' : 'text-sm'">
          {{ form.profileDescription }}
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { nameDecoratorStyle } from "~/lib/domain/format"
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

const bannerHeight = computed(() => (props.scale === "full" ? 400 : 170))
const avatarClass = computed(() => (props.scale === "full" ? "size-28 sm:size-40" : "size-16 sm:size-20"))
const nameSizeClass = computed(() => (props.scale === "full" ? "text-4xl sm:text-5xl" : "text-2xl"))
const aliasSizeClass = computed(() => (props.scale === "full" ? "text-base" : "text-sm"))

const nameStyle = computed(() => nameDecoratorStyle(props.form.decorator1, props.form.decorator2, "board"))
</script>
