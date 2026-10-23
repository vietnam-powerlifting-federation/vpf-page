<template>
  <PagePanel :title="$t('profile.tabs.voucher')" ruled flush>
    <LoadingState v-if="pending" />
    <Message v-else-if="error" severity="error" :closable="false" class="mx-4 mb-6 md:mx-6">{{ $t("profile.voucherTable.loadError") }}</Message>
    <p v-else-if="vouchers.length === 0" class="px-4 pb-6 text-muted-color md:px-6">{{ $t("profile.voucherTable.noVouchers") }}</p>
    <ResultsTable v-else :columns="columns" :rows="vouchers" :caption="$t('profile.tabs.voucher')" :row-key="(row) => row.code">
      <template #cell-type="{ row }">
        <span class="font-semibold">{{ describe(row) }}</span>
      </template>
      <template #cell-received="{ row }">
        <span class="tabular-nums">{{ formatDate(row.createdAt, locale) }}</span>
      </template>
      <template #cell-expires="{ row }">
        <span class="tabular-nums">{{ formatDate(row.expiresAt, locale) }}</span>
      </template>
      <template #cell-status="{ row }">
        <Tag :value="statusLabel(row.status)" :severity="statusSeverity(row.status)" />
      </template>
      <template #cell-action="{ row }">
        <Button size="small" severity="secondary" variant="outlined" :label="$t('profile.voucherTable.viewDetail')" @click="openDetail(row)" />
      </template>
    </ResultsTable>

    <Dialog v-model:visible="detailVisible" :header="$t('profile.voucherTable.detailTitle')" modal class="w-[min(28rem,92vw)]">
      <dl v-if="selected" class="grid gap-3 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-muted-color">{{ $t("profile.voucherTable.code") }}</dt>
          <dd class="font-mono font-semibold">{{ selected.code }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-muted-color">{{ $t("profile.voucherTable.discount") }}</dt>
          <dd>{{ describe(selected) }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-muted-color">{{ $t("profile.voucherTable.expiryDate") }}</dt>
          <dd class="tabular-nums">{{ formatDate(selected.expiresAt, locale) }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-muted-color">{{ $t("profile.voucherTable.status") }}</dt>
          <dd><Tag :value="statusLabel(selected.status)" :severity="statusSeverity(selected.status)" /></dd>
        </div>
        <div v-if="selected.redeemedRefCode" class="flex justify-between gap-4">
          <dt class="text-muted-color">{{ $t("profile.voucherTable.usedOn") }}</dt>
          <dd class="font-mono">VPF{{ selected.redeemedRefCode }}</dd>
        </div>
        <div class="border-t border-surface-200 pt-3">
          <dt class="mb-1 text-muted-color">{{ $t("profile.voucherTable.note") }}</dt>
          <dd>{{ selected.note || $t("profile.voucherTable.noNote") }}</dd>
        </div>
      </dl>
      <template #footer>
        <Button :label="$t('profile.voucherTable.close')" severity="secondary" @click="detailVisible = false" />
      </template>
    </Dialog>
  </PagePanel>
</template>

<script setup lang="ts">
import { formatDate } from "~/lib/domain/format"
import type { TableColumn } from "~/types/tables"
import type { Voucher } from "~/types/vouchers"

/** The athlete's vouchers, with a dialog for the details of one. */
const { t, locale } = useI18n()
const { vouchers, pending, error } = useAthleteVouchers()
const { describe, statusLabel, statusSeverity } = useVoucherDisplay()

const columns = computed<TableColumn[]>(() => [
  { key: "type", label: t("profile.voucherTable.voucherType"), rowHeader: true },
  { key: "received", label: t("profile.voucherTable.receivedDate") },
  { key: "expires", label: t("profile.voucherTable.expiryDate") },
  { key: "status", label: t("profile.voucherTable.status") },
  { key: "action", label: t("profile.voucherTable.action") },
])

const detailVisible = ref(false)
const selected = ref<Voucher | null>(null)

function openDetail(voucher: Voucher) {
  selected.value = voucher
  detailVisible.value = true
}
</script>
