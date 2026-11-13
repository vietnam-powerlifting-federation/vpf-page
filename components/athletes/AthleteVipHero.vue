<template>
  <section :aria-labelledby="titleId">
    <!-- Banner across the top, with the avatar overlapping its bottom-left corner. -->
    <div v-if="banners.length" class="relative">
      <BannerSlideshow :banners="banners" :height="size.bannerHeight" flush />
      <div v-if="avatar" class="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-1/4">
        <div :class="gutters">
          <AthleteAvatar
            :src="avatar"
            :alt="$t('athlete.avatarAlt', { name: fullName })"
            :decorator1="vip.decorator1"
            :decorator2="vip.decorator2"
            :size="size.avatarPx"
            :class="[size.avatar, 'pointer-events-auto']"
          />
        </div>
      </div>
    </div>

    <div :class="[gutters, size.top]">
      <!-- No banner: the avatar sits inline instead of overlapping. -->
      <AthleteAvatar
        v-if="avatar && !banners.length"
        :src="avatar"
        :alt="$t('athlete.avatarAlt', { name: fullName })"
        :decorator1="vip.decorator1"
        :decorator2="vip.decorator2"
        :size="size.avatarPx"
        :class="[size.avatarInline, 'mb-4']"
      />

      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <component
            :is="titleTag"
            :id="titleId"
            class="font-display leading-[1.05] font-extrabold uppercase [overflow-wrap:anywhere]"
            :class="size.name"
            :style="nameDecoratorStyle(vip.decorator1, vip.decorator2)"
          >
            {{ fullName }}
          </component>
          <p v-if="vip.displayAlias && vip.alias" class="mt-1 text-muted-color" :class="size.alias">“{{ vip.alias }}”</p>
        </div>
        <SocialLinks :vip-settings="vip" :label="$t('athlete.social.label', { name: fullName })" class="shrink-0" />
      </div>

      <p v-if="vip.displayProfileDescription && vip.profileDescription" class="mt-4 max-w-prose whitespace-pre-line" :class="size.description">
        {{ vip.profileDescription }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nameDecoratorStyle } from "~/lib/domain/format"
import type { VipSettingsFormState } from "~/types/vip"

/**
 * The top of a VIP athlete's profile, laid out as it was before the Scoreboard
 * redesign: the banner slideshow across the full width, the avatar hanging off
 * its bottom-left corner, then the name in the athlete's colours with alias and
 * socials, and the description.
 *
 * Shared with the VIP settings preview so what the athlete edits is what the
 * public page shows; `scale` sizes it for the page or for the preview frames.
 */
const props = withDefaults(defineProps<{
  fullName: string
  /** Saved settings, or the settings form's in-progress state. */
  vip: VipSettingsFormState
  /** Saved R2 url, or a blob: url while a new file is being edited. */
  avatar: string | null
  banners: string[]
  scale?: "page" | "full" | "compact"
  titleTag?: "h1" | "h2"
}>(), { scale: "page", titleTag: "h1" })

const titleId = useId()

const SIZES = {
  page: {
    bannerHeight: 400,
    avatarPx: 288,
    avatar: "size-28 sm:size-44 lg:size-72",
    avatarInline: "size-28 sm:size-36",
    // Clears the quarter of the avatar that hangs below the banner.
    top: "pt-10 sm:pt-14 lg:pt-24",
    name: "text-[clamp(2rem,1.25rem+3vw,3.25rem)]",
    alias: "text-lg",
    description: "text-lg",
  },
  full: {
    bannerHeight: 400,
    avatarPx: 224,
    avatar: "size-28 sm:size-44 lg:size-56",
    avatarInline: "size-28 sm:size-36",
    top: "pt-10 sm:pt-14",
    name: "text-4xl sm:text-5xl",
    alias: "text-base",
    description: "text-base",
  },
  compact: {
    bannerHeight: 170,
    avatarPx: 80,
    avatar: "size-16 sm:size-20",
    avatarInline: "size-16 sm:size-20",
    top: "pt-6 sm:pt-8",
    name: "text-2xl",
    alias: "text-sm",
    description: "text-sm",
  },
} as const

const size = computed(() => {
  const s = SIZES[props.scale]
  // Without an overlapping avatar there is nothing to clear.
  return props.banners.length && props.avatar ? s : { ...s, top: props.scale === "page" ? "pt-8" : "pt-4" }
})

/** The page lines up with the content column below; the preview frames use a plain inset. */
const gutters = computed(() => (props.scale === "page" ? "mx-auto max-w-page px-4 md:px-6" : "px-4"))
</script>
