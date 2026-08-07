<template>
  <div class="min-h-full p-4 md:p-8">
    <h1 class="text-2xl font-bold mb-2 text-surface-900 dark:text-surface-0">{{ $t("adminVouchers.title") }}</h1>
    <p class="text-sm text-surface-600 dark:text-surface-300 mb-6">{{ $t("adminVouchers.subtitle") }}</p>

    <!-- Issued vs redeemed vs expired, and what it cost (§8). -->
    <div v-if="stats" class="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
      <div v-for="stat in statTiles" :key="stat.label">
        <p class="text-xs uppercase tracking-wide text-surface-500">{{ $t(stat.label) }}</p>
        <p class="text-xl font-semibold text-surface-900 dark:text-surface-0">{{ stat.value }}</p>
      </div>
    </div>

    <!-- Issue form -->
    <form
      class="mb-8 border border-surface-200 dark:border-surface-700 rounded-lg p-4 md:p-5 space-y-4"
      @submit.prevent="issue"
    >
      <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ $t("adminVouchers.issueTitle") }}</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="flex flex-col gap-1">
          <label for="vpfId" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("adminVouchers.athlete") }}</label>
          <InputText id="vpfId" v-model="form.vpfId" placeholder="VPF000123" required />
          <small class="text-surface-500">{{ $t("adminVouchers.athleteHint") }}</small>
        </div>

        <div class="flex flex-col gap-1">
          <label for="type" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("adminVouchers.type") }}</label>
          <Select id="type" v-model="form.type" :options="typeOptions" option-label="label" option-value="value" />
        </div>

        <div class="flex flex-col gap-1">
          <label for="expiresAt" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("adminVouchers.expiresAt") }}</label>
          <DatePicker id="expiresAt" v-model="form.expiresAt" date-format="dd/mm/yy" :min-date="today" show-icon />
        </div>

        <div class="flex flex-col gap-1">
          <label for="discountKind" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("adminVouchers.discountKind") }}</label>
          <Select
            id="discountKind"
            v-model="form.discountKind"
            :options="discountKindOptions"
            option-label="label"
            option-value="value"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="discountValue" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("adminVouchers.discountValue") }}</label>
          <InputNumber
            id="discountValue"
            v-model="form.discountValue"
            :min="1"
            :max="form.discountKind === 'percent' ? 100 : undefined"
            :suffix="form.discountKind === 'percent' ? ' %' : ' ₫'"
            :step="form.discountKind === 'percent' ? 1 : 10000"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="note" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("adminVouchers.note") }}</label>
          <InputText id="note" v-model="form.note" :placeholder="$t('adminVouchers.notePlaceholder')" />
        </div>
      </div>

      <!--
        Bulk issue (§8): a Tết promotion to 200 athletes is otherwise 200 clicks.
        Every recipient still gets their own code — a voucher is single-use and
        per-athlete, and a shared code could be neither.
      -->
      <div class="flex items-center gap-2">
        <Checkbox v-model="bulkMode" input-id="bulkMode" binary />
        <label for="bulkMode" class="text-sm text-surface-700 dark:text-surface-200">{{ $t("adminVouchers.bulkMode") }}</label>
      </div>

      <div v-if="bulkMode" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm text-surface-600 dark:text-surface-300">{{ $t("adminVouchers.bulkAudience") }}</label>
          <Select
            v-model="bulkAudience"
            :options="audienceOptions"
            option-label="label"
            option-value="value"
          />
        </div>
        <div v-if="bulkAudience === 'list'" class="flex flex-col gap-1">
          <label class="text-sm text-surface-600 dark:text-surface-300">{{ $t("adminVouchers.bulkIds") }}</label>
          <Textarea v-model="bulkIds" rows="3" :placeholder="$t('adminVouchers.bulkIdsHint')" />
        </div>
      </div>

      <Button
        v-if="bulkMode"
        type="button"
        :label="$t('adminVouchers.bulkIssue')"
        :loading="isIssuing"
        @click="issueBulk"
      />
      <Button v-else type="submit" :label="$t('adminVouchers.issue')" :loading="isIssuing" :disabled="!canIssue" />
    </form>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap gap-2 items-center">
      <SelectButton
        v-model="statusFilter"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
      />
      <InputText v-model="vpfIdFilter" :placeholder="$t('adminVouchers.filterAthlete')" class="w-48" />
      <Button icon="pi pi-refresh" :label="$t('adminVouchers.refresh')" outlined @click="() => refresh()" />
    </div>

    <div v-if="pending" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <div v-else-if="!rows.length" class="text-surface-500 py-8">{{ $t("adminVouchers.empty") }}</div>
    <DataTable v-else :value="rows" striped-rows class="w-full border border-surface-200 dark:border-surface-700">
      <Column :header="$t('adminVouchers.code')">
        <template #body="{ data }">
          <span class="font-mono font-semibold text-primary">{{ data.code }}</span>
        </template>
      </Column>
      <Column :header="$t('adminVouchers.athlete')">
        <template #body="{ data }">
          <div class="font-medium text-surface-900 dark:text-surface-0">{{ data.userName }}</div>
          <div class="text-xs text-surface-500">{{ data.vpfId }}</div>
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
          <span v-else class="text-surface-500">—</span>
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
              @click="openEdit(data)"
            />
            <Button
              size="small"
              severity="danger"
              outlined
              :label="$t('adminVouchers.revoke')"
              :disabled="data.status === 'used' || actingCode === data.code"
              @click="openRevoke(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="editDialog" :header="$t('adminVouchers.editTitle')" modal class="w-full max-w-md">
      <p class="text-sm text-surface-500 font-mono mb-4">{{ editTarget?.code }}</p>
      <div class="space-y-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm">{{ $t("adminVouchers.discountKind") }}</label>
          <Select v-model="editForm.discountKind" :options="discountKindOptions" option-label="label" option-value="value" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm">{{ $t("adminVouchers.discountValue") }}</label>
          <InputNumber
            v-model="editForm.discountValue"
            :min="1"
            :max="editForm.discountKind === 'percent' ? 100 : undefined"
            :suffix="editForm.discountKind === 'percent' ? ' %' : ' ₫'"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm">{{ $t("adminVouchers.expiresAt") }}</label>
          <DatePicker v-model="editForm.expiresAt" date-format="dd/mm/yy" show-icon />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm">{{ $t("adminVouchers.note") }}</label>
          <InputText v-model="editForm.note" />
        </div>
      </div>
      <template #footer>
        <Button text :label="$t('adminVouchers.cancel')" @click="editDialog = false" />
        <Button :label="$t('adminVouchers.saveEdit')" :loading="isEditing" @click="saveEdit" />
      </template>
    </Dialog>

    <Dialog v-model:visible="revokeDialog" :header="$t('adminVouchers.revokeTitle')" modal class="w-full max-w-md">
      <p class="text-sm text-surface-600 dark:text-surface-300">
        {{ $t("adminVouchers.revokePrompt", { code: revokeTarget?.code ?? "" }) }}
      </p>
      <template #footer>
        <Button :label="$t('adminVouchers.cancel')" text @click="revokeDialog = false" />
        <Button
          :label="$t('adminVouchers.confirmRevoke')"
          severity="danger"
          :loading="actingCode !== null"
          @click="confirmRevoke"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue"
import { formatDateDMY } from "~/lib/utils/date"
import type { ApiResponse } from "~/types/api"
import type { PurchaseType, VoucherDiscountKind } from "~/types/union-types"
import type { Voucher, VoucherRevoked, VoucherWithUser } from "~/types/vouchers"

definePageMeta({
  layout: "openvpf-admin",
  middleware: "admin",
})

const { t } = useI18n()
const toast = useToast()
const msg = useApiMessage()
const { describe, typeLabel, statusLabel, statusSeverity } = useVoucherDisplay()

const today = new Date()

const form = reactive({
  vpfId: "",
  type: "competition" as PurchaseType,
  discountKind: "percent" as VoucherDiscountKind,
  discountValue: 20 as number | null,
  expiresAt: null as Date | null,
  note: "",
})

const typeOptions = computed<{ label: string; value: PurchaseType }[]>(() =>
  (["competition", "vpf_membership", "vip"] as const).map((value) => ({ label: typeLabel(value), value })),
)

const discountKindOptions = computed<{ label: string; value: VoucherDiscountKind }[]>(() => [
  { label: t("adminVouchers.percent"), value: "percent" },
  { label: t("adminVouchers.fixed"), value: "fixed" },
])

const canIssue = computed(
  () => Boolean(form.vpfId.trim()) && Boolean(form.expiresAt) && (form.discountValue ?? 0) > 0,
)

const statusFilter = ref<"all" | "available" | "used">("all")
const statusOptions = computed(() => [
  { label: t("adminVouchers.filterAll"), value: "all" },
  { label: t("adminVouchers.filterAvailable"), value: "available" },
  { label: t("adminVouchers.filterUsed"), value: "used" },
])
const vpfIdFilter = ref("")

const query = computed(() => ({
  ...(statusFilter.value === "all" ? {} : { redeemed: statusFilter.value === "used" }),
  ...(vpfIdFilter.value.trim() ? { vpfId: vpfIdFilter.value.trim() } : {}),
}))

const { data: listResponse, pending, refresh } = await useFetch<ApiResponse<VoucherWithUser[]>>("/api/vouchers/all", {
  query,
  credentials: "include",
  ignoreResponseError: true,
})

const rows = computed(() => (listResponse.value?.success ? listResponse.value.data : []))

const isIssuing = ref(false)

/** The API takes YYYY-MM-DD; read the local date parts so the picker's day is kept. */
function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

async function issue() {
  if (!canIssue.value || !form.expiresAt) return
  isIssuing.value = true
  try {
    const res = (await $fetch("/api/vouchers", {
      method: "POST",
      credentials: "include",
      ignoreResponseError: true,
      body: {
        vpfId: form.vpfId.trim(),
        type: form.type,
        discountKind: form.discountKind,
        discountValue: form.discountValue,
        expiresAt: toIsoDate(form.expiresAt),
        note: form.note.trim() || undefined,
      },
    })) as ApiResponse<Voucher>

    if (!res.success) {
      toast.add({ severity: "error", summary: t("general.error"), detail: msg(res), life: 5000 })
      return
    }

    toast.add({
      severity: "success",
      summary: t("adminVouchers.issued"),
      detail: `${res.data?.code} · ${msg(res)}`,
      life: 5000,
    })
    form.note = ""
    await Promise.all([refresh(), refreshStats()])
  } catch (e) {
    toast.add({ severity: "error", summary: t("general.error"), detail: e instanceof Error ? e.message : "", life: 5000 })
  } finally {
    isIssuing.value = false
  }
}

const bulkMode = ref(false)
const bulkAudience = ref<"list" | "active_members">("list")
const bulkIds = ref("")

const audienceOptions = computed(() => [
  { label: t("adminVouchers.audienceList"), value: "list" },
  { label: t("adminVouchers.audienceActiveMembers"), value: "active_members" },
])

async function issueBulk() {
  if (!form.expiresAt) return
  isIssuing.value = true
  try {
    const vpfIds = bulkIds.value
      .split(/[\s,;]+/)
      .map((id) => id.trim())
      .filter(Boolean)

    const res = (await $fetch("/api/vouchers/bulk", {
      method: "POST",
      credentials: "include",
      ignoreResponseError: true,
      body: {
        ...(bulkAudience.value === "active_members" ? { audience: "active_members" } : { vpfIds }),
        type: form.type,
        discountKind: form.discountKind,
        discountValue: form.discountValue,
        expiresAt: toIsoDate(form.expiresAt),
        note: form.note.trim() || undefined,
      },
    })) as ApiResponse<{ issued: number; unknownVpfIds: string[] }>

    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "adminVouchers.issued" : "general.error"),
      detail: msg(res),
      life: 6000,
    })
    if (res.success && res.data.unknownVpfIds.length) {
      toast.add({
        severity: "warn",
        summary: t("adminVouchers.bulkSkipped"),
        detail: res.data.unknownVpfIds.join(", "),
        life: 8000,
      })
    }
    if (res.success) await refresh()
  } finally {
    isIssuing.value = false
  }
}

const { data: statsResponse, refresh: refreshStats } = await useFetch<ApiResponse<{
  issued: number
  redeemed: number
  expired: number
  available: number
  totalDiscount: number
}>>("/api/vouchers/stats", { credentials: "include", ignoreResponseError: true })

const stats = computed(() => (statsResponse.value?.success ? statsResponse.value.data : null))

const statTiles = computed(() => [
  { label: "adminVouchers.statIssued", value: stats.value?.issued ?? 0 },
  { label: "adminVouchers.statRedeemed", value: stats.value?.redeemed ?? 0 },
  { label: "adminVouchers.statAvailable", value: stats.value?.available ?? 0 },
  { label: "adminVouchers.statExpired", value: stats.value?.expired ?? 0 },
  {
    label: "adminVouchers.statDiscount",
    value: `${new Intl.NumberFormat("vi-VN").format(stats.value?.totalDiscount ?? 0)} ₫`,
  },
])

const editDialog = ref(false)
const editTarget = ref<VoucherWithUser | null>(null)
const isEditing = ref(false)
const editForm = reactive({
  discountKind: "percent" as VoucherDiscountKind,
  discountValue: 20 as number | null,
  expiresAt: null as Date | null,
  note: "",
})

function openEdit(voucher: VoucherWithUser) {
  editTarget.value = voucher
  editForm.discountKind = voucher.discountKind
  editForm.discountValue = voucher.discountValue
  editForm.expiresAt = new Date(`${voucher.expiresAt}T00:00:00`)
  editForm.note = voucher.note ?? ""
  editDialog.value = true
}

async function saveEdit() {
  if (!editTarget.value || !editForm.expiresAt) return
  isEditing.value = true
  try {
    const res = (await $fetch(`/api/vouchers/${editTarget.value.code}`, {
      method: "PATCH",
      credentials: "include",
      ignoreResponseError: true,
      body: {
        discountKind: editForm.discountKind,
        discountValue: editForm.discountValue,
        expiresAt: toIsoDate(editForm.expiresAt),
        note: editForm.note.trim() || null,
      },
    })) as ApiResponse<Voucher>

    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 5000,
    })
    if (res.success) {
      editDialog.value = false
      await refresh()
    }
  } finally {
    isEditing.value = false
  }
}

const revokeDialog = ref(false)
const revokeTarget = ref<VoucherWithUser | null>(null)
const actingCode = ref<string | null>(null)

function openRevoke(row: VoucherWithUser) {
  revokeTarget.value = row
  revokeDialog.value = true
}

async function confirmRevoke() {
  const target = revokeTarget.value
  if (!target) return
  actingCode.value = target.code
  try {
    const res = (await $fetch(`/api/vouchers/${target.code}`, {
      method: "DELETE",
      credentials: "include",
      ignoreResponseError: true,
    })) as ApiResponse<VoucherRevoked>

    if (res.success) {
      toast.add({ severity: "success", summary: t("adminVouchers.revoked"), detail: msg(res), life: 4000 })
      await Promise.all([refresh(), refreshStats()])
    } else {
      toast.add({ severity: "error", summary: t("general.error"), detail: msg(res), life: 5000 })
    }
  } catch (e) {
    toast.add({ severity: "error", summary: t("general.error"), detail: e instanceof Error ? e.message : "", life: 5000 })
  } finally {
    actingCode.value = null
    revokeDialog.value = false
  }
}

useHead({ title: () => t("adminVouchers.title") })
</script>
