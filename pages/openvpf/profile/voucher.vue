<template>
  <div class="min-h-full">
    <h1 class="text-2xl font-bold mb-6 text-surface-0">{{ $t("profile.tabs.voucher") }}</h1>

    <div v-if="pending" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <Message v-else-if="error" severity="error" :closable="false">
      {{ $t("profile.voucherTable.loadError") }}
    </Message>

    <DataTable v-else :value="vouchers" striped-rows class="w-full border border-surface-200 dark:border-surface-700">
      <template #empty>
        <div class="text-surface-400">{{ $t("profile.voucherTable.noVouchers") }}</div>
      </template>
      <Column :header="$t('profile.voucherTable.receivedDate')">
        <template #body="{ data }">{{ formatDateDMY(data.createdAt) }}</template>
      </Column>
      <Column :header="$t('profile.voucherTable.expiryDate')">
        <template #body="{ data }">{{ formatDateDMY(data.expiresAt) }}</template>
      </Column>
      <Column :header="$t('profile.voucherTable.voucherType')">
        <template #body="{ data }">
          <span :class="data.status === 'active' ? 'text-primary' : 'text-surface-300'">{{ describe(data) }}</span>
        </template>
      </Column>
      <Column :header="$t('profile.voucherTable.status')">
        <template #body="{ data }">
          <Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" />
        </template>
      </Column>
      <Column :header="$t('profile.voucherTable.action')">
        <template #body="{ data }">
          <Button size="small" :label="$t('profile.voucherTable.viewDetail')" outlined @click="openDetail(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="detailVisible"
      :header="$t('profile.voucherTable.detailTitle')"
      modal
      class="w-full max-w-md"
    >
      <dl v-if="selected" class="space-y-3 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-surface-400">{{ $t("profile.voucherTable.code") }}</dt>
          <dd class="font-mono font-semibold text-primary">{{ selected.code }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-surface-400">{{ $t("profile.voucherTable.discount") }}</dt>
          <dd class="text-surface-0">{{ describe(selected) }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-surface-400">{{ $t("profile.voucherTable.expiryDate") }}</dt>
          <dd class="text-surface-0">{{ formatDateDMY(selected.expiresAt) }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-surface-400">{{ $t("profile.voucherTable.status") }}</dt>
          <dd><Tag :value="statusLabel(selected.status)" :severity="statusSeverity(selected.status)" /></dd>
        </div>
        <div v-if="selected.redeemedRefCode" class="flex justify-between gap-4">
          <dt class="text-surface-400">{{ $t("profile.voucherTable.usedOn") }}</dt>
          <dd class="font-mono text-surface-0">VPF{{ selected.redeemedRefCode }}</dd>
        </div>
        <div class="border-t border-surface-700 pt-3">
          <dt class="text-surface-400 mb-1">{{ $t("profile.voucherTable.note") }}</dt>
          <dd class="text-surface-0">{{ selected.note || $t("profile.voucherTable.noNote") }}</dd>
        </div>
      </dl>
      <template #footer>
        <Button :label="$t('profile.voucherTable.close')" text @click="detailVisible = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { formatDateDMY } from "~/lib/utils/date"
import type { Voucher } from "~/types/vouchers"

definePageMeta({
  layout: "openvpf-profile",
  middleware: "auth",
})

const { t } = useI18n()
const { vouchers, pending, error } = useAthleteVouchers()
const { describe, statusLabel, statusSeverity } = useVoucherDisplay()

const detailVisible = ref(false)
const selected = ref<Voucher | null>(null)

function openDetail(voucher: Voucher) {
  selected.value = voucher
  detailVisible.value = true
}

useHead({ title: () => t("profile.tabs.voucher") })
</script>
