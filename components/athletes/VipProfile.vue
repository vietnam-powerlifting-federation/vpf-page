<template>
  <div class="min-h-screen">
    <!-- Banner Slideshow -->
    <div v-if="banners.length > 0" class="relative">
      <BannerSlideshow :banners="banners" />
      <!-- Avatar overlapping banner bottom-left, aligned with content container -->
      <div class="absolute bottom-0 left-0 right-0 translate-y-1/4 z-10 pointer-events-none">
        <div class="container mx-auto px-4 pointer-events-auto">
          <AthleteAvatar
            v-if="vipSettings.avatarImageUrl"
            :src="vipSettings.avatarImageUrl"
            :decorator1="vipSettings.decorator1"
            :decorator2="vipSettings.decorator2"
            class="w-72 h-72"
          />
        </div>
      </div>
    </div>

    <!-- Name + Info Section -->
    <div
      class="container mx-auto px-4"
      :class="banners.length > 0 && vipSettings.avatarImageUrl ? 'mt-24' : 'mt-8'"
    >
      <div class="flex justify-between items-start mb-2">
        <div>
          <h1 class="text-3xl md:text-4xl font-bold" :style="nameStyle">
            {{ athlete.fullName }}{{ sexLabel ? ` (${sexLabel})` : "" }}
          </h1>
          <p v-if="vipSettings.displayAlias && vipSettings.alias" class="text-lg text-surface-400 mt-1">
            ({{ vipSettings.alias }})
          </p>
        </div>
        <SocialLinks v-if="hasSocialLinks" :vip-settings="vipSettings" class="mt-2" />
      </div>

      <div v-if="vipSettings.displayProfileDescription && vipSettings.profileDescription" class="mb-8 text-surface-300 whitespace-pre-line">
        {{ vipSettings.profileDescription }}
      </div>

      <div class="mb-10">
        <AthletePbs :personal-best="personalBest" :comp-history="compHistory" />
      </div>

      <div class="mb-10">
        <AthleteCompHistory :comp-history="compHistory" :meets="meets" />
      </div>

      <div v-if="records.length > 0">
        <AthleteRecords :records="records" :comp-history="compHistory" :meets="meets" :athlete="athlete" :show-certificate="true" :can-attach="isOwner" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import BannerSlideshow from "~/components/athletes/BannerSlideshow.vue"
import AthleteAvatar from "~/components/athletes/AthleteAvatar.vue"
import SocialLinks from "~/components/athletes/SocialLinks.vue"
import AthletePbs from "~/components/athletes/AthletePbs.vue"
import AthleteCompHistory from "~/components/athletes/AthleteCompHistory.vue"
import AthleteRecords from "~/components/athletes/AthleteRecords.vue"
import type { UserPublic } from "~/types/users"
import type { VipBenefits } from "~/types/vip"
import type { PersonalBestSummary, Result } from "~/types/results"
import type { MeetPublic } from "~/types/meets"
import type { LiftRecord } from "~/types/records"

const props = defineProps<{
  athlete: UserPublic
  vipSettings: VipBenefits
  personalBest: PersonalBestSummary
  compHistory: Result[]
  meets: MeetPublic[]
  records: LiftRecord[]
}>()

const sexLabel = computed(() => {
  const sex = props.compHistory[0]?.sex
  if (!sex) return null
  return sex === "male" ? "M" : "F"
})

// The logged-in owner of this profile may attach a photo to their own certificates (client-side only).
// Auth is an HttpOnly cookie, so forward it during SSR (see middleware/auth.ts).
const sessionHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined
const { data: session } = await useFetch<{ success: boolean; data: { vpfId: string } | null }>(
  "/api/auth/session",
  { credentials: "include", headers: sessionHeaders },
)
const isOwner = computed(() => session.value?.data?.vpfId === props.athlete.vpfId)

const banners = computed(() =>
  [
    props.vipSettings.bannerImageUrl1,
    props.vipSettings.bannerImageUrl2,
    props.vipSettings.bannerImageUrl3,
    props.vipSettings.bannerImageUrl4,
    props.vipSettings.bannerImageUrl5,
  ].filter((url): url is string => !!url)
)

const nameStyle = computed(() => {
  const c1 = props.vipSettings.decorator1 || null
  const c2 = props.vipSettings.decorator2 || null
  if (!c1 && !c2) return {}
  const from = c1 || "#ffffff"
  const to = c2 || "#ffffff"
  return {
    background: `linear-gradient(to right, ${from}, ${to})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    color: "transparent",
  }
})

const hasSocialLinks = computed(() =>
  (props.vipSettings.displayFacebook && !!props.vipSettings.facebook) ||
  (props.vipSettings.displayInstagram && !!props.vipSettings.instagram) ||
  (props.vipSettings.displayTiktok && !!props.vipSettings.tiktok) ||
  (props.vipSettings.displayYoutube && !!props.vipSettings.youtube) ||
  (props.vipSettings.displayMobilePhone && !!props.vipSettings.vipPhoneNumber)
)
</script>
