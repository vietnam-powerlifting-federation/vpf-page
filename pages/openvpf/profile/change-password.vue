<template>
  <div class="min-h-full">
    <h1 class="text-2xl font-bold mb-6 text-surface-0">{{ $t("profile.tabs.changePassword") }}</h1>
    <p class="mb-4 text-surface-500 text-sm">
      <span class="rounded bg-surface-700 px-2 py-0.5">{{ $t("profile.demo") }}</span>
    </p>

    <div class="max-w-md space-y-4">
      <div>
        <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.changePassword.currentPassword") }}</label>
        <Password v-model="currentPassword" :placeholder="$t('profile.changePassword.enterCurrent')" class="w-full" disabled />
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.changePassword.newPassword") }}</label>
        <Password v-model="newPassword" :placeholder="$t('profile.changePassword.enterNew')" class="w-full" disabled />
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.changePassword.confirmPassword") }}</label>
        <Password v-model="confirmPassword" :placeholder="$t('profile.changePassword.enterConfirm')" class="w-full" disabled />
      </div>
      <div class="pt-2">
        <Button :label="$t('profile.changePassword.submit')" disabled />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import Button from "@/components/volt/Button.vue"
import Password from "@/components/volt/Password.vue"

definePageMeta({
  layout: "openvpf-profile",
  middleware: "auth",
})

const currentPassword = ref("")
const newPassword = ref("")
const confirmPassword = ref("")

useHead({ title: () => useI18n().t("profile.tabs.changePassword") })
</script>
