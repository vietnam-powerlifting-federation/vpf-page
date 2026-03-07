<template>
  <div class="min-h-full">
    <h1 class="text-2xl font-bold mb-6 text-surface-0">{{ $t("profile.tabs.voucher") }}</h1>
    <p class="mb-4 text-surface-500 text-sm">
      <span class="rounded bg-surface-700 px-2 py-0.5">{{ $t("profile.demo") }}</span>
    </p>

    <div class="overflow-x-auto">
      <table class="w-full border border-surface-700 rounded-lg overflow-hidden">
        <thead class="bg-surface-800 text-surface-300 text-left text-sm">
          <tr>
            <th class="p-3 font-medium">{{ $t("profile.voucherTable.receivedDate") }}</th>
            <th class="p-3 font-medium">{{ $t("profile.voucherTable.expiryDate") }}</th>
            <th class="p-3 font-medium">{{ $t("profile.voucherTable.voucherType") }}</th>
            <th class="p-3 font-medium">{{ $t("profile.voucherTable.status") }}</th>
            <th class="p-3 font-medium">{{ $t("profile.voucherTable.action") }}</th>
          </tr>
        </thead>
        <tbody class="text-surface-200">
          <tr v-for="(v, i) in demoVouchers" :key="i" class="border-t border-surface-700 hover:bg-surface-800/50">
            <td class="p-3">{{ v.receivedDate }}</td>
            <td class="p-3">{{ v.expiryDate }}</td>
            <td class="p-3" :class="v.active ? 'text-primary' : ''">{{ v.type }}</td>
            <td class="p-3" :class="v.active ? 'text-primary' : 'text-surface-400'">{{ v.statusLabel }}</td>
            <td class="p-3">
              <Button
                size="small"
                :label="$t('profile.voucherTable.viewDetail')"
                :disabled="!v.active"
                @click="() => {}"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!demoVouchers.length" class="text-surface-400">{{ $t("profile.voucherTable.noVouchers") }}</p>
  </div>
</template>

<script setup lang="ts">
import Button from "@/components/volt/Button.vue"

definePageMeta({
  layout: "openvpf-profile",
  middleware: "auth",
})

const { t } = useI18n()
const demoVouchers = [
  {
    receivedDate: "18/04/2025",
    expiryDate: "18/04/2025",
    type: "-20% for souvenir items",
    active: true,
    statusLabel: t("profile.voucherTable.active"),
  },
  {
    receivedDate: "15/04/2025",
    expiryDate: "15/04/2025",
    type: "Free competition registration",
    active: false,
    statusLabel: t("profile.voucherTable.expired"),
  },
  {
    receivedDate: "18/04/2025",
    expiryDate: "18/04/2025",
    type: "Free annual membership",
    active: false,
    statusLabel: t("profile.voucherTable.used"),
  },
]

useHead({ title: () => useI18n().t("profile.tabs.voucher") })
</script>
