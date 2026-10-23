<template>
  <AdminPage :title="$t('admin.purchases.title')" :subtitle="$t('admin.purchases.subtitle')">
    <div class="mb-4 flex flex-wrap gap-2 items-center">
      <IconField>
        <InputIcon><AppIcon name="lucide:search" class="size-4" /></InputIcon>
        <InputText v-model="purchases.search" :placeholder="$t('admin.purchases.search')" class="w-72" />
      </IconField>

      <SelectButton
        v-model="purchases.status"
        :options="purchases.statusOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
      />

      <Select
        v-model="purchases.type"
        :options="purchases.typeOptions"
        option-label="label"
        option-value="value"
        class="w-48"
        show-clear
        :placeholder="$t('admin.purchases.type')"
      />

      <ToggleButton
        v-model="purchases.oldestFirst"
        :on-label="$t('admin.purchases.oldestFirst')"
        :off-label="$t('admin.purchases.newestFirst')"
      />

      <Button :aria-label="$t('admin.common.refresh')" text severity="secondary" @click="purchases.refresh"><AppIcon name="lucide:refresh-cw" class="size-4" /></Button>
    </div>

    <div v-if="purchases.pending" class="flex justify-center py-12"><ProgressSpinner /></div>
    <div v-else-if="!purchases.rows.length" class="text-muted-color py-8">{{ $t("admin.purchases.empty") }}</div>
    <DataTable
      v-else
      :value="purchases.rows"
      striped-rows
      paginator
      :rows="25"
      class="border border-surface-200"
    >
      <Column :header="$t('admin.purchases.memo')">
        <template #body="{ data }">
          <!-- The memo is the key to matching a bank transfer (§7.2). -->
          <span class="font-mono font-semibold text-accent">{{ data.expectedMemo }}</span>
          <div class="text-xs text-muted-color">{{ purchases.age(data.createdAt) }}</div>
        </template>
      </Column>

      <Column :header="$t('admin.purchases.athlete')">
        <template #body="{ data }">
          <NuxtLinkLocale :to="`/admin/athletes/${data.vpfId}`" class="font-medium hover:underline">
            {{ data.userName }}
          </NuxtLinkLocale>
          <div class="text-xs text-muted-color">{{ data.userEmail }}</div>
        </template>
      </Column>

      <Column :header="$t('admin.purchases.items')">
        <template #body="{ data }">
          <div class="flex flex-wrap gap-1">
            <Tag v-for="itemType in data.type" :key="itemType" :value="$t(`admin.purchases.types.${itemType}`)" severity="secondary" />
          </div>
          <div v-if="data.meetName" class="text-xs text-muted-color mt-1">
            {{ data.meetName }} · {{ data.division }} {{ data.weightClass === 999 ? "+" : data.weightClass }}
            <span v-if="data.mediaPlus"> · Media Plus</span>
          </div>
          <div v-if="data.vipDurationMonths" class="text-xs text-muted-color mt-1">
            {{ $t("admin.purchases.vipMonths", { months: data.vipDurationMonths }) }}
          </div>
          <div v-if="data.membershipYear" class="text-xs text-muted-color mt-1">
            {{ $t("admin.purchases.membershipYear", { year: data.membershipYear }) }}
          </div>
        </template>
      </Column>

      <Column :header="$t('admin.purchases.amount')">
        <template #body="{ data }">
          <span class="font-medium">{{ formatNumber(data.amount) }} ₫</span>
          <div v-for="voucher in data.vouchers" :key="voucher.code" class="text-xs text-success">
            {{ voucher.code }} −{{ formatNumber(voucher.discount) }} ₫
          </div>
        </template>
      </Column>

      <Column :header="$t('admin.purchases.status')">
        <template #body="{ data }">
          <Tag :value="$t(`admin.purchases.statuses.${data.status}`)" :severity="ADMIN_PURCHASE_SEVERITY[data.status as PurchaseStatusValue]" />
          <div v-if="data.approvedBy" class="text-xs text-muted-color mt-1">
            {{ $t("admin.purchases.approvedBy", { who: data.approvedBy }) }}
          </div>
        </template>
      </Column>

      <Column :header="$t('admin.purchases.action')">
        <template #body="{ data }">
          <div v-if="data.status === 'pending'" class="flex gap-1">
            <Button
              size="small"
              :label="$t('admin.purchases.approve')"
              :loading="purchases.acting === data.refCode"
              @click="purchases.approve(data)"
            />
            <Button
              size="small"
              severity="danger"
              outlined
              :label="$t('admin.purchases.cancel')"
              :loading="purchases.acting === data.refCode"
              @click="purchases.cancel(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </AdminPage>
</template>

<script setup lang="ts">
import { ADMIN_PURCHASE_SEVERITY } from "~/lib/domain/purchase-status"
import type { PurchaseStatusValue } from "~/types/union-types"

/** Pending and settled purchases: find a bank transfer by its memo, then approve or cancel it. */
const purchases = await useAdminPurchases()

const formatNumber = (amount: number) => new Intl.NumberFormat("vi-VN").format(amount)
</script>
