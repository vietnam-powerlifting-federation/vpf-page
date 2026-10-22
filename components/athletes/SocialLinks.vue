<template>
  <ul v-if="links.length" class="flex flex-wrap items-center gap-2" :aria-label="label">
    <li v-for="link in links" :key="link.key">
      <a
        :href="link.href"
        :target="link.external ? '_blank' : undefined"
        :rel="link.external ? 'noopener noreferrer' : undefined"
        :aria-label="link.label"
        class="grid size-11 place-items-center rounded-full transition-colors duration-120 ease-snap"
        :class="onBoard ? 'bg-board-2 text-board-ink ring-1 ring-board-line hover:bg-board-line' : 'bg-surface-100 text-color hover:bg-surface-200'"
      >
        <AppIcon :name="link.icon" class="size-5" />
      </a>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { normalizeExternalUrl } from "~/lib/domain/patch-payload"
import type { VipBenefits } from "~/types/vip"

/** Partial so the VIP settings form can pass its in-progress state straight in. */
type SocialSettings = Partial<
  Pick<
    VipBenefits,
    | "facebook" | "displayFacebook"
    | "instagram" | "displayInstagram"
    | "tiktok" | "displayTiktok"
    | "youtube" | "displayYoutube"
    | "vipPhoneNumber" | "displayMobilePhone"
  >
>

const props = defineProps<{ vipSettings: SocialSettings; label?: string; onBoard?: boolean }>()
const { t } = useI18n()

const links = computed(() => {
  const s = props.vipSettings
  const socials = [
    { key: "facebook", icon: "lucide:facebook", shown: s.displayFacebook, value: s.facebook },
    { key: "instagram", icon: "lucide:instagram", shown: s.displayInstagram, value: s.instagram },
    { key: "tiktok", icon: "lucide:music-2", shown: s.displayTiktok, value: s.tiktok },
    { key: "youtube", icon: "lucide:youtube", shown: s.displayYoutube, value: s.youtube },
  ]

  const result = socials
    .filter((item) => item.shown && item.value)
    .map((item) => ({ key: item.key, icon: item.icon, label: t(`athlete.social.${item.key}`), href: normalizeExternalUrl(item.value), external: true }))
    .filter((item): item is typeof item & { href: string } => !!item.href)

  if (s.displayMobilePhone && s.vipPhoneNumber) {
    result.push({ key: "phone", icon: "lucide:phone", label: t("athlete.social.phone", { phone: s.vipPhoneNumber }), href: `tel:${s.vipPhoneNumber}`, external: false })
  }
  return result
})
</script>
