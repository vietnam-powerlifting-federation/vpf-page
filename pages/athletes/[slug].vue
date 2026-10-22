<template>
  <div v-if="profile">
    <PageHeader :kicker="$t('athlete.kicker')" compact>
      <template #title>
        <span :style="nameDecoratorStyle(vip?.decorator1, vip?.decorator2, 'board')">{{ athlete.fullName }}</span>
      </template>
      <template #lede>
        <span v-if="vip?.displayAlias && vip.alias" class="mb-1 block text-board-ink">“{{ vip.alias }}”</span>
        <span class="tabular-nums">{{ metaLine }}</span>
      </template>
      <template v-if="vip && (vip.avatarImageUrl || hasSocials)" #aside>
        <div class="flex flex-wrap items-center gap-4 lg:flex-col lg:items-end">
          <AthleteAvatar
            v-if="vip.avatarImageUrl"
            :src="vip.avatarImageUrl"
            :alt="$t('athlete.avatarAlt', { name: athlete.fullName })"
            :decorator1="vip.decorator1"
            :decorator2="vip.decorator2"
            class="size-28 sm:size-36 lg:size-44"
          />
          <SocialLinks :vip-settings="vip" :label="$t('athlete.social.label', { name: athlete.fullName })" on-board />
        </div>
      </template>
    </PageHeader>

    <PageSection class="grid gap-10">
      <LazyBannerSlideshow v-if="banners.length" :banners="banners" />
      <p v-if="vip?.displayProfileDescription && vip.profileDescription" class="max-w-prose text-lg whitespace-pre-line">
        {{ vip.profileDescription }}
      </p>
      <AthletePbs :personal-best="profile.personalBest" :comp-history="profile.compHistory" />
      <AthleteRecords
        v-if="profile.records.length"
        :records="profile.records"
        :comp-history="profile.compHistory"
        :meets="profile.meets"
        :athlete="athlete"
        :can-attach="isOwner && !!vip"
      />
      <AthleteHistory :comp-history="profile.compHistory" :meets="profile.meets" :name="athlete.fullName" />
    </PageSection>
  </div>
</template>

<script setup lang="ts">
import { SEX_LABEL_KEY, nameDecoratorStyle } from "~/lib/domain/format"
import type { ApiResponse } from "~/types/api"
import type { AthleteProfileData } from "~/types/users"

definePageMeta({ layout: "default" })

const route = useRoute()
const { t } = useI18n()

// The /profile route returns the whole aggregate: athlete, PBs, history, meets, records and VIP settings.
const { data } = await useFetch<ApiResponse<AthleteProfileData>>(`/api/athletes/${route.params.slug}/profile`)
const profile = computed(() => (data.value?.success ? data.value.data : null))

if (!profile.value) {
  throw createError({ statusCode: 404, statusMessage: t("athlete.notFound"), fatal: true })
}

const athlete = computed(() => profile.value!.athlete)
const vip = computed(() => profile.value?.vipSettings ?? null)

const sex = computed(() => profile.value?.compHistory[0]?.sex ?? null)
const metaLine = computed(() => [
  sex.value ? t(SEX_LABEL_KEY[sex.value]) : null,
  athlete.value.vpfId,
  athlete.value.dob ? t("athlete.born", { year: athlete.value.dob }) : null,
  athlete.value.nationality,
].filter(Boolean).join(" · "))

const banners = computed(() => {
  const v = vip.value
  if (!v) return []
  return [v.bannerImageUrl1, v.bannerImageUrl2, v.bannerImageUrl3, v.bannerImageUrl4, v.bannerImageUrl5].filter((url): url is string => !!url)
})

const hasSocials = computed(() => {
  const v = vip.value
  if (!v) return false
  return (v.displayFacebook && !!v.facebook) || (v.displayInstagram && !!v.instagram) || (v.displayTiktok && !!v.tiktok)
    || (v.displayYoutube && !!v.youtube) || (v.displayMobilePhone && !!v.vipPhoneNumber)
})

// Only the athlete may attach a photo to their own certificates. Who is signed in
// is read in the browser (see SiteHeader), so this never affects the shared HTML.
const { athlete: me } = useAuthSession()
const isOwner = computed(() => me.value?.athlete.vpfId === athlete.value.vpfId)

useSeoMeta({
  title: () => athlete.value.fullName,
  description: () => metaLine.value,
  ogTitle: () => athlete.value.fullName,
  ogType: "profile",
})
</script>
