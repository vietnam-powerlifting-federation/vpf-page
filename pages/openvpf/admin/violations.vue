<template>
  <div class="p-4 md:p-8 max-w-5xl">
    <h1 class="text-2xl font-bold mb-1 text-surface-900 dark:text-surface-0">{{ $t("admin.violations.title") }}</h1>
    <p class="text-sm text-surface-600 dark:text-surface-300 mb-6">{{ $t("admin.violations.subtitle") }}</p>

    <form class="mb-8 rounded-lg border border-surface-200 dark:border-surface-700 p-4 md:p-5 space-y-4" @submit.prevent="record">
      <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ $t("admin.violations.recordTitle") }}</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.violations.athlete") }}</label>
          <InputText v-model="form.vpfId" placeholder="VPF000123" required />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.violations.expireYear") }}</label>
          <InputNumber v-model="form.expireYear" :use-grouping="false" :min="1900" :max="2200" show-clear />
          <!-- A blank field here is a permanent sanction, which is not what blank usually implies. -->
          <small class="text-amber-500">{{ $t("admin.violations.expireYearHint") }}</small>
        </div>

        <div class="flex flex-col gap-1 md:col-span-3">
          <label class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.violations.note") }}</label>
          <InputText v-model="form.note" required />
        </div>
      </div>

      <div v-if="form.expireYear === null" class="flex items-center gap-2">
        <Checkbox v-model="form.confirmPermanent" input-id="permanent" binary />
        <label for="permanent" class="text-sm text-amber-500">{{ $t("admin.violations.confirmPermanent") }}</label>
      </div>

      <!--
        Show the resulting level and its consequence as you type: the count-based
        rule is not obvious from a list of rows (§5.1).
      -->
      <Message v-if="impact" :severity="impact.severity" size="small">{{ impact.text }}</Message>

      <Button type="submit" :label="$t('admin.violations.record')" :loading="saving" :disabled="!canRecord" />
    </form>

    <div class="mb-4 flex flex-wrap gap-2 items-center">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="filterVpfId" :placeholder="$t('admin.violations.filterAthlete')" class="w-56" />
      </IconField>
      <div class="flex items-center gap-2">
        <Checkbox v-model="inForceOnly" input-id="inForce" binary />
        <label for="inForce" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.violations.inForceOnly") }}</label>
      </div>
      <Button icon="pi pi-refresh" text severity="secondary" @click="() => refresh()" />
    </div>

    <div v-if="pending" class="flex justify-center py-12"><ProgressSpinner /></div>
    <div v-else-if="!rows.length" class="text-surface-500 py-8">{{ $t("admin.violations.none") }}</div>
    <DataTable v-else :value="rows" striped-rows class="border border-surface-200 dark:border-surface-700">
      <Column :header="$t('admin.violations.athlete')">
        <template #body="{ data }">
          <NuxtLinkLocale :to="`/openvpf/admin/athletes/${data.vpfId}`" class="font-medium hover:underline">
            {{ data.userName }}
          </NuxtLinkLocale>
          <div class="text-xs text-surface-500 font-mono">{{ data.vpfId }}</div>
        </template>
      </Column>
      <Column :header="$t('admin.violations.note')" field="note" />
      <Column :header="$t('admin.violations.expireYear')">
        <template #body="{ data }">
          <span v-if="data.expireYear">{{ data.expireYear }}</span>
          <Tag v-else severity="danger" :value="$t('admin.violations.never')" />
        </template>
      </Column>
      <Column :header="$t('admin.violations.consequence')">
        <template #body="{ data }">
          <Tag :value="`${$t('admin.violations.level')} ${data.level}`" :severity="outcomeSeverity(data.outcome)" />
          <div class="text-xs text-surface-500 mt-1">{{ $t(`admin.violations.outcomes.${data.outcome}`) }}</div>
        </template>
      </Column>
      <Column :header="$t('general.date')">
        <template #body="{ data }">{{ formatDateDMY(data.createdAt) }}</template>
      </Column>
      <Column>
        <template #body="{ data }">
          <Button size="small" text severity="danger" :label="$t('admin.violations.lift')" @click="openLift(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="liftDialog" modal :header="$t('admin.violations.liftTitle')" class="w-full max-w-md">
      <p class="text-sm text-surface-600 dark:text-surface-300 mb-3">{{ $t("admin.violations.liftPrompt") }}</p>
      <div class="flex flex-col gap-1">
        <label class="text-sm">{{ $t("admin.common.reason") }}</label>
        <InputText v-model="liftReason" />
      </div>
      <template #footer>
        <Button text :label="$t('admin.common.cancel')" @click="liftDialog = false" />
        <Button severity="danger" :label="$t('admin.violations.lift')" :disabled="!liftReason" :loading="lifting" @click="lift" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { formatDateDMY } from "~/lib/utils/date"
import type { ApiResponse } from "~/types/api"
import type { UserViolationWithUser } from "~/types/violations"
import type { ViolationOutcome } from "~/types/competitions"

definePageMeta({ layout: "openvpf-admin", middleware: "admin" })

const { t } = useI18n()
const toast = useToast()
const msg = useApiMessage()

const currentYear = new Date().getFullYear()

const form = reactive({
  vpfId: "",
  note: "",
  expireYear: currentYear + 1 as number | null,
  confirmPermanent: false,
})

const filterVpfId = ref("")
const inForceOnly = ref(true)

const query = computed(() => ({
  ...(filterVpfId.value.trim() ? { vpfId: filterVpfId.value.trim() } : {}),
  ...(inForceOnly.value ? { inForceOnly: "true" } : {}),
}))

const { data: response, pending, refresh } = await useFetch<ApiResponse<UserViolationWithUser[]>>("/api/violations", {
  query,
  credentials: "include",
  ignoreResponseError: true,
})

const rows = computed(() => (response.value?.success ? response.value.data : []))

function outcomeSeverity(outcome: ViolationOutcome) {
  return { ok: "secondary", pledge: "warn", blocked: "danger" }[outcome]
}

/**
 * The athlete's level is the count of rows still in force, so recording another
 * one moves them up a step. Say what that step means before it is taken.
 */
const impact = computed(() => {
  const vpfId = form.vpfId.trim()
  if (!vpfId) return null
  const current = rows.value.filter((row) => row.vpfId === vpfId && isInForce(row)).length
  const projected = current + 1
  if (projected >= 2) {
    return {
      severity: "error" as const,
      text: t("admin.violations.impactBlocked", { level: projected, year: form.expireYear ?? currentYear }),
    }
  }
  return { severity: "warn" as const, text: t("admin.violations.impactPledge") }
})

function isInForce(row: UserViolationWithUser) {
  return row.expireYear === null || row.expireYear >= currentYear
}

const canRecord = computed(() =>
  Boolean(form.vpfId.trim()) && Boolean(form.note.trim()) && (form.expireYear !== null || form.confirmPermanent))

const saving = ref(false)

async function record() {
  saving.value = true
  try {
    const res = await $fetch<ApiResponse<UserViolationWithUser>>("/api/violations", {
      method: "POST",
      credentials: "include",
      ignoreResponseError: true,
      body: {
        vpfId: form.vpfId.trim(),
        note: form.note.trim(),
        expireYear: form.expireYear,
        confirmPermanent: form.confirmPermanent,
      },
    })
    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 5000,
    })
    if (res.success) {
      form.note = ""
      form.confirmPermanent = false
      await refresh()
    }
  } finally {
    saving.value = false
  }
}

const liftDialog = ref(false)
const liftTarget = ref<UserViolationWithUser | null>(null)
const liftReason = ref("")
const lifting = ref(false)

function openLift(row: UserViolationWithUser) {
  liftTarget.value = row
  liftReason.value = ""
  liftDialog.value = true
}

async function lift() {
  if (!liftTarget.value) return
  lifting.value = true
  try {
    const res = await $fetch<ApiResponse<unknown>>(`/api/violations/${liftTarget.value.id}`, {
      method: "DELETE",
      credentials: "include",
      ignoreResponseError: true,
      query: { reason: liftReason.value },
    })
    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 4000,
    })
    if (res.success) await refresh()
  } finally {
    lifting.value = false
    liftDialog.value = false
  }
}

useHead({ title: () => t("admin.violations.title") })
</script>
