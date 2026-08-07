<template>
  <div class="rounded-lg overflow-hidden bg-surface-900 border border-surface-700">
    <!-- Nothing to show yet -->
    <div
      v-if="isEmpty"
      class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-surface-600 rounded-lg m-3 py-10 px-4 text-center"
    >
      <i class="pi pi-image text-3xl text-surface-500" />
      <p class="text-sm text-surface-400">{{ $t("profile.vipBenefits.previewEmpty") }}</p>
    </div>

    <template v-else>
      <!-- Banner with the avatar overlapping its bottom-left, as on the public profile -->
      <div v-if="bannerPreviews.length > 0" class="relative">
        <BannerSlideshow :banners="bannerPreviews" :height="bannerHeight" />
        <div class="absolute bottom-0 left-0 right-0 translate-y-1/4 z-10 pointer-events-none">
          <div class="px-4 pointer-events-auto">
            <AthleteAvatar
              v-if="avatarPreview"
              :src="avatarPreview"
              :decorator1="form.decorator1"
              :decorator2="form.decorator2"
              :class="avatarClass"
            />
          </div>
        </div>
      </div>

      <div class="px-4 pb-4" :class="overlapClass">
        <!-- No banner: the avatar sits inline instead of overlapping -->
        <AthleteAvatar
          v-if="avatarPreview && bannerPreviews.length === 0"
          :src="avatarPreview"
          :decorator1="form.decorator1"
          :decorator2="form.decorator2"
          :class="[avatarClass, 'mb-3']"
        />

        <div class="flex justify-between items-start gap-4">
          <div class="min-w-0">
            <h2
              class="font-bold break-words"
              :class="[nameSizeClass, hasDecorator ? '' : 'text-surface-0']"
              :style="nameStyle"
            >
              {{ fullName }}
            </h2>
            <p v-if="form.displayAlias && form.alias" class="text-surface-400 mt-1" :class="aliasSizeClass">
              ({{ form.alias }})
            </p>
          </div>
          <SocialLinks :vip-settings="form" class="shrink-0" />
        </div>

        <p
          v-if="form.displayProfileDescription && form.profileDescription"
          class="mt-3 text-surface-300 whitespace-pre-line"
          :class="scale === 'full' ? 'text-base' : 'text-sm'"
        >
          {{ form.profileDescription }}
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import AthleteAvatar from "~/components/athletes/AthleteAvatar.vue"
import BannerSlideshow from "~/components/athletes/BannerSlideshow.vue"
import SocialLinks from "~/components/athletes/SocialLinks.vue"
import { nameGradientStyle } from "~/lib/utils/client"
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
const avatarClass = computed(() =>
  props.scale === "full" ? "w-28 h-28 sm:w-44 sm:h-44 lg:w-56 lg:h-56" : "w-16 h-16 sm:w-20 sm:h-20",
)
const nameSizeClass = computed(() => (props.scale === "full" ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"))
const aliasSizeClass = computed(() => (props.scale === "full" ? "text-base" : "text-sm"))

// Clear the part of the avatar that hangs below the banner.
const overlapClass = computed(() => {
  if (props.bannerPreviews.length === 0 || !props.avatarPreview) return "pt-4"
  return props.scale === "full" ? "pt-10 sm:pt-14" : "pt-6 sm:pt-8"
})

const hasDecorator = computed(() => !!(props.form.decorator1 || props.form.decorator2))
// Returns {} when no decorator is set, hence the text-surface-0 class fallback above.
const nameStyle = computed(() => nameGradientStyle(props.form.decorator1, props.form.decorator2))
</script>
