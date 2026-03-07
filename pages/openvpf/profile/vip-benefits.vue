<template>
  <div class="min-h-full">
    <h1 class="text-2xl font-bold mb-6 text-surface-0">{{ $t("profile.tabs.vipBenefits") }}</h1>

    <div v-if="pending" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <div v-else class="space-y-6">
      <p class="text-surface-300">{{ $t("profile.vipBenefits.description") }}</p>
      <p class="text-surface-400 text-sm">{{ $t("profile.vipBenefits.features") }}</p>
      <img :src="vipPreview" alt="" class="h-full w-full object-cover"></img>
      <div v-if="!userData?.vipMembershipActive" class="pt-4">
        <Button :label="$t('profile.vipBenefits.registerNow')" class="bg-primary" />
        <span class="ml-3 text-sm text-surface-500">({{ $t("profile.demo") }})</span>
      </div>
      <div v-else class="rounded-lg border border-surface-700 bg-surface-900 p-4 text-surface-300">
        <span class="font-medium text-surface-0">VIP active</span>
        <span class="ml-2 text-sm">— {{ $t("profile.demo") }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from "@/components/volt/Button.vue"
import ProgressSpinner from "@/components/volt/ProgressSpinner.vue"
import { useProfileUser } from "~/composables/useProfileData"
import { computed } from "vue"
import vipPreview from "~/assets/img/vip-preview.png"

definePageMeta({
  layout: "openvpf-profile",
  middleware: "auth",
})

const { data: userResponse, pending } = useProfileUser()
const userData = computed(() => userResponse.value?.data ?? null)

useHead({ title: () => useI18n().t("profile.tabs.vipBenefits") })
</script>
