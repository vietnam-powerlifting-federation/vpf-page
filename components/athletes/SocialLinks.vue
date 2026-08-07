<template>
  <div class="flex gap-3 items-center flex-wrap">
    <a
      v-for="link in links"
      :key="link.icon"
      :href="link.href"
      :target="link.external ? '_blank' : undefined"
      :rel="link.external ? 'noopener noreferrer' : undefined"
      class="w-9 h-9 rounded-full bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-surface-100 transition-colors"
    >
      <i :class="link.icon" />
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { normalizeExternalUrl } from "~/lib/utils/client"
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

const props = defineProps<{ vipSettings: SocialSettings }>()

const links = computed(() => {
  const s = props.vipSettings
  const socials: { icon: string; shown?: boolean | null; value?: string | null }[] = [
    { icon: "pi pi-facebook", shown: s.displayFacebook, value: s.facebook },
    { icon: "pi pi-instagram", shown: s.displayInstagram, value: s.instagram },
    { icon: "pi pi-tiktok", shown: s.displayTiktok, value: s.tiktok },
    { icon: "pi pi-youtube", shown: s.displayYoutube, value: s.youtube },
  ]

  const result = socials
    .filter((item) => item.shown && item.value)
    .map((item) => ({ icon: item.icon, href: normalizeExternalUrl(item.value), external: true }))
    .filter((item): item is { icon: string; href: string; external: boolean } => !!item.href)

  if (s.displayMobilePhone && s.vipPhoneNumber) {
    result.push({ icon: "pi pi-phone", href: `tel:${s.vipPhoneNumber}`, external: false })
  }

  return result
})
</script>
