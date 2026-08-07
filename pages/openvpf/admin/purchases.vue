<template>
  <div class="p-4 md:p-8">
    <h1 class="text-2xl font-bold mb-1 text-surface-900 dark:text-surface-0">{{ $t("admin.purchases.title") }}</h1>
    <p class="text-sm text-surface-600 dark:text-surface-300 mb-6">{{ $t("admin.purchases.subtitle") }}</p>

    <div class="mb-4 flex flex-wrap gap-2 items-center">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" :placeholder="$t('admin.purchases.search')" class="w-72" />
      </IconField>

      <SelectButton
        v-model="status"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
      />

      <Select
        v-model="type"
        :options="typeOptions"
        option-label="label"
        option-value="value"
        class="w-48"
        show-clear
        :placeholder="$t('admin.purchases.type')"
      />

      <ToggleButton
        v-model="oldestFirst"
        :on-label="$t('admin.purchases.oldestFirst')"
        :off-label="$t('admin.purchases.newestFirst')"
      />

      <Button icon="pi pi-refresh" text severity="secondary" @click="() => refresh()" />
    </div>

    <div v-if="pending" class="flex justify-center py-12"><ProgressSpinner /></div>
    <div v-else-if="!rows.length" class="text-surface-500 py-8">{{ $t("admin.purchases.empty") }}</div>
    <DataTable
      v-else
      :value="rows"
      striped-rows
      paginator
      :rows="25"
      class="border border-surface-200 dark:border-surface-700"
    >
      <Column :header="$t('admin.purchases.memo')">
        <template #body="{ data }">
          <!-- The memo is the key to matching a bank transfer (§7.2). -->
          <span class="font-mono font-semibold text-primary">{{ data.expectedMemo }}</span>
          <div class="text-xs text-surface-500">{{ age(data.createdAt) }}</div>
        </template>
      </Column>

      <Column :header="$t('admin.purchases.athlete')">
        <template #body="{ data }">
          <NuxtLinkLocale :to="`/openvpf/admin/athletes/${data.vpfId}`" class="font-medium hover:underline">
            {{ data.userName }}
          </NuxtLinkLocale>
          <div class="text-xs text-surface-500">{{ data.userEmail }}</div>
        </template>
      </Column>

      <Column :header="$t('admin.purchases.items')">
        <template #body="{ data }">
          <div class="flex flex-wrap gap-1">
            <Tag v-for="itemType in data.type" :key="itemType" :value="$t(`admin.purchases.types.${itemType}`)" severity="secondary" />
          </div>
          <div v-if="data.meetName" class="text-xs text-surface-500 mt-1">
            {{ data.meetName }} · {{ data.division }} {{ data.weightClass === 999 ? "+" : data.weightClass }}
            <span v-if="data.mediaPlus"> · Media Plus</span>
          </div>
          <div v-if="data.vipDurationMonths" class="text-xs text-surface-500 mt-1">
            {{ $t("admin.purchases.vipMonths", { months: data.vipDurationMonths }) }}
          </div>
          <div v-if="data.membershipYear" class="text-xs text-surface-500 mt-1">
            {{ $t("admin.purchases.membershipYear", { year: data.membershipYear }) }}
          </div>
        </template>
      </Column>

      <Column :header="$t('admin.purchases.amount')">
        <template #body="{ data }">
          <span class="font-medium">{{ formatVnd(data.amount) }} ₫</span>
          <div v-for="voucher in data.vouchers" :key="voucher.code" class="text-xs text-green-600">
            {{ voucher.code }} −{{ formatVnd(voucher.discount) }} ₫
          </div>
        </template>
      </Column>

      <Column :header="$t('admin.purchases.status')">
        <template #body="{ data }">
          <Tag :value="$t(`admin.purchases.statuses.${data.status}`)" :severity="statusSeverity(data.status)" />
          <div v-if="data.approvedBy" class="text-xs text-surface-500 mt-1">
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
              :loading="acting === data.refCode"
              @click="approve(data)"
            />
            <Button
              size="small"
              severity="danger"
              outlined
              :label="$t('admin.purchases.cancel')"
              :loading="acting === data.refCode"
              @click="cancel(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import type { ApiResponse } from "~/types/api"
import type { AdminPurchase } from "~/types/purchases"
import type { PurchaseStatusValue } from "~/types/union-types"

definePageMeta({ layout: "openvpf-admin", middleware: "admin" })

const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const msg = useApiMessage()

// The dashboard links here with the filter pre-applied (§1.2).
const search = ref("")
const status = ref<PurchaseStatusValue | "all">((route.query.status as PurchaseStatusValue) ?? "pending")
const type = ref<string | null>(null)
const oldestFirst = ref(route.query.order === "oldest")

const statusOptions = computed(() => [
  { label: t("admin.purchases.statuses.pending"), value: "pending" },
  { label: t("admin.purchases.statuses.active"), value: "active" },
  { label: t("admin.purchases.statuses.cancelled"), value: "cancelled" },
  { label: t("admin.purchases.filterAll"), value: "all" },
])

const typeOptions = computed(() => [
  { label: t("admin.purchases.types.competition"), value: "competition" },
  { label: t("admin.purchases.types.vpf_membership"), value: "vpf_membership" },
  { label: t("admin.purchases.types.vip"), value: "vip" },
])

const query = computed(() => ({
  ...(status.value === "all" ? {} : { status: status.value }),
  ...(type.value ? { type: type.value } : {}),
  ...(search.value.trim() ? { search: search.value.trim() } : {}),
  order: oldestFirst.value ? "oldest" : "newest",
}))

const { data: response, pending, refresh } = await useFetch<ApiResponse<AdminPurchase[]>>("/api/purchases/all", {
  query,
  credentials: "include",
  ignoreResponseError: true,
})

const rows = computed(() => (response.value?.success ? response.value.data : []))

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount)
}

function statusSeverity(value: PurchaseStatusValue) {
  return { pending: "warn", active: "success", cancelled: "danger", expired: "secondary" }[value]
}

/** Reconciliation is worked by age, so how old a pending row is matters more than its date. */
function age(createdAt: string) {
  const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000)
  if (hours < 1) return t("admin.purchases.ageMinutes")
  if (hours < 24) return t("admin.purchases.ageHours", { hours })
  return t("admin.purchases.ageDays", { days: Math.floor(hours / 24) })
}

const acting = ref<string | null>(null)

/** Approval goes through `approvePurchase` and nothing else. */
async function approve(purchase: AdminPurchase) {
  acting.value = purchase.refCode
  try {
    const res = await $fetch<ApiResponse<unknown>>(`/api/purchases/${purchase.refCode}/approve`, {
      method: "PATCH",
      credentials: "include",
      ignoreResponseError: true,
    })
    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 4000,
    })
    if (res.success) await refresh()
  } finally {
    acting.value = null
  }
}

async function cancel(purchase: AdminPurchase) {
  acting.value = purchase.refCode
  try {
    const res = await $fetch<ApiResponse<unknown>>(`/api/purchases/${purchase.refCode}/cancel`, {
      method: "PATCH",
      credentials: "include",
      ignoreResponseError: true,
    })
    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 4000,
    })
    if (res.success) await refresh()
  } finally {
    acting.value = null
  }
}

useHead({ title: () => t("admin.purchases.title") })
</script>
