<template>
  <!-- Filters -->
  <div class="mb-4 flex flex-wrap gap-2 items-center">
    <SelectButton
      v-model="vouchers.statusFilter"
      :options="vouchers.statusOptions"
      option-label="label"
      option-value="value"
      :allow-empty="false"
    />
    <InputText v-model="vouchers.vpfIdFilter" :placeholder="$t('adminVouchers.filterAthlete')" class="w-48" />
    <Button outlined @click="vouchers.refresh"><AppIcon name="lucide:refresh-cw" class="size-4" />{{ $t('adminVouchers.refresh') }}</Button>
  </div>

  <div v-if="vouchers.pending" class="flex justify-center py-12">
    <ProgressSpinner />
  </div>
  <div v-else-if="!vouchers.rows.length" class="text-muted-color py-8">{{ $t("adminVouchers.empty") }}</div>
  <DataTable v-else :value="vouchers.rows" striped-rows class="w-full border border-surface-200">
    <Column :header="$t('adminVouchers.code')">
      <template #body="{ data }">
        <span class="font-mono font-semibold text-accent">{{ data.code }}</span>
      </template>
    </Column>
    <Column :header="$t('adminVouchers.athlete')">
      <template #body="{ data }">
        <div class="font-medium text-color">{{ data.userName }}</div>
        <div class="text-xs text-muted-color">{{ data.vpfId }}</div>
      </template>
    </Column>
    <Column :header="$t('adminVouchers.discount')">
      <template #body="{ data }">{{ describe(data) }}</template>
    </Column>
    <Column :header="$t('profile.voucherTable.expiryDate')">
      <template #body="{ data }">{{ formatDateDMY(data.expiresAt) }}</template>
    </Column>
    <Column :header="$t('adminVouchers.status')">
      <template #body="{ data }">
        <Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" />
      </template>
    </Column>
    <Column :header="$t('adminVouchers.usedOn')">
      <template #body="{ data }">
        <span v-if="data.redeemedRefCode" class="font-mono text-sm">VPF{{ data.redeemedRefCode }}</span>
        <span v-else class="text-muted-color">—</span>
      </template>
    </Column>
    <Column :header="$t('adminVouchers.action')">
      <template #body="{ data }">
        <div class="flex gap-1">
          <!--
            Editing exists so fixing an expiry date no longer means delete and
            recreate, which loses the code the athlete was already given.
          -->
          <Button
            size="small"
            outlined
            :label="$t('adminVouchers.edit')"
            :disabled="data.status === 'used'"
            @click="vouchers.openEdit(data)"
          />
          <Button
            size="small"
            severity="danger"
            outlined
            :label="$t('adminVouchers.revoke')"
            :disabled="data.status === 'used' || vouchers.actingCode === data.code"
            @click="vouchers.openRevoke(data)"
          />
        </div>
      </template>
    </Column>
  </DataTable>
</template>

<script setup lang="ts">
import { formatDateDMY } from "~/lib/domain/date"

/** Every voucher, filtered by status or athlete, with edit and revoke on each one that is not yet used. */
const vouchers = useAdminVouchers()
const { describe, statusLabel, statusSeverity } = useVoucherDisplay()
</script>
