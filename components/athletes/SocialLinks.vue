<template>
  <div class="flex gap-3 items-center flex-wrap">
    <a
      v-if="vipSettings.displayFacebook && vipSettings.facebook"
      :href="vipSettings.facebook"
      target="_blank"
      rel="noopener noreferrer"
      class="w-9 h-9 rounded-full bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-surface-100 transition-colors"
    >
      <i class="pi pi-facebook" />
    </a>
    <a
      v-if="vipSettings.displayInstagram && vipSettings.instagram"
      :href="vipSettings.instagram"
      target="_blank"
      rel="noopener noreferrer"
      class="w-9 h-9 rounded-full bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-surface-100 transition-colors"
    >
      <i class="pi pi-instagram" />
    </a>
    <a
      v-if="vipSettings.displayTiktok && vipSettings.tiktok"
      :href="vipSettings.tiktok"
      target="_blank"
      rel="noopener noreferrer"
      class="w-9 h-9 rounded-full bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-surface-100 transition-colors"
    >
      <i class="pi pi-tiktok" />
    </a>
    <a
      v-if="vipSettings.displayYoutube && vipSettings.youtube"
      :href="vipSettings.youtube"
      target="_blank"
      rel="noopener noreferrer"
      class="w-9 h-9 rounded-full bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-surface-100 transition-colors"
    >
      <i class="pi pi-youtube" />
    </a>
    <a
      v-if="vipSettings.displayMobilePhone && vipSettings.vipPhoneNumber"
      :href="`tel:${vipSettings.vipPhoneNumber}`"
      class="w-9 h-9 rounded-full bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-surface-100 transition-colors"
    >
      <i class="pi pi-phone" />
    </a>
  </div>
</template>

<script setup lang="ts">
import type { VipBenefits } from "~/types/vip"

defineProps<{ vipSettings: VipBenefits }>()
</script>
