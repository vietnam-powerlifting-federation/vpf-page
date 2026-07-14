<template>
  <div class="min-h-full">
    <h1 class="text-2xl font-bold mb-6 text-surface-0">{{ $t("profile.tabs.voucher") }}</h1>
    <p class="mb-4 text-surface-500 text-sm">
      <span class="rounded bg-surface-700 px-2 py-0.5">{{ $t("profile.demo") }}</span>
    </p>

    <DataTable :value="demoVouchers" striped-rows class="w-full border border-surface-200 dark:border-surface-700">
      <template #empty>
        <div class="text-surface-400">{{ $t("profile.voucherTable.noVouchers") }}</div>
      </template>
      <Column field="receivedDate" :header="$t('profile.voucherTable.receivedDate')" />
      <Column field="expiryDate" :header="$t('profile.voucherTable.expiryDate')" />
      <Column :header="$t('profile.voucherTable.voucherType')">
        <template #body="{ data }">
          <span :class="data.active ? 'text-primary' : ''">{{ data.type }}</span>
        </template>
      </Column>
      <Column :header="$t('profile.voucherTable.status')">
        <template #body="{ data }">
          <span :class="data.active ? 'text-primary' : 'text-surface-400'">{{ data.statusLabel }}</span>
        </template>
      </Column>
      <Column :header="$t('profile.voucherTable.action')">
        <template #body="{ data }">
          <Button size="small" :label="$t('profile.voucherTable.viewDetail')" :disabled="!data.active" @click="() => {}" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
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

useHead({ title: () => t("profile.tabs.voucher") })
</script>
