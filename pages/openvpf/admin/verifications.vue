<template>
  <div class="min-h-full p-4 md:p-8">
    <h1 class="text-2xl font-bold mb-2 text-surface-900 dark:text-surface-0">{{ $t("adminVerifications.title") }}</h1>
    <p class="text-sm text-surface-600 dark:text-surface-300 mb-6">{{ $t("adminVerifications.subtitle") }}</p>

    <div class="mb-4 flex gap-2">
      <SelectButton
        v-model="statusFilter"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
      />
      <Button icon="pi pi-refresh" :label="$t('adminVerifications.refresh')" outlined @click="refresh" />
    </div>

    <div v-if="pending" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <div v-else-if="!rows.length" class="text-surface-500 py-8">
      {{ $t("adminVerifications.empty") }}
    </div>
    <DataTable v-else :value="rows" striped-rows class="w-full border border-surface-200 dark:border-surface-700">
      <Column :header="$t('adminVerifications.athlete')">
        <template #body="{ data }">
          <div class="font-medium text-surface-900 dark:text-surface-0">{{ data.fullName }}</div>
          <div class="text-xs text-surface-500">{{ data.vpfId }} · {{ data.userEmail }}</div>
        </template>
      </Column>
      <Column field="nationalId" :header="$t('verification.nationalId')" />
      <Column field="dob" :header="$t('verification.dob')" />
      <Column field="phoneNumber" :header="$t('verification.phoneNumber')" />
      <Column :header="$t('adminVerifications.idCard')">
        <template #body="{ data }">
          <button type="button" class="text-primary hover:underline text-sm" @click="openImage(data.idCardFrontUrl)">
            {{ $t("adminVerifications.viewImage") }}
          </button>
        </template>
      </Column>
      <Column :header="$t('adminVerifications.status')">
        <template #body="{ data }">
          <Tag :value="statusText(data.status)" :severity="statusSeverity(data.status)" />
        </template>
      </Column>
      <Column :header="$t('adminVerifications.action')">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              size="small"
              :label="$t('adminVerifications.approve')"
              severity="success"
              :disabled="data.status === 'approved' || actingId === data.id"
              @click="approve(data)"
            />
            <Button
              size="small"
              :label="$t('adminVerifications.reject')"
              severity="danger"
              outlined
              :disabled="actingId === data.id"
              @click="openReject(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Image preview dialog -->
    <Dialog v-model:visible="imageDialog" :header="$t('adminVerifications.idCard')" modal class="max-w-3xl">
      <img v-if="imageUrl" :src="imageUrl" alt="ID card" class="w-full object-contain">
    </Dialog>

    <!-- Reject reason dialog -->
    <Dialog v-model:visible="rejectDialog" :header="$t('adminVerifications.rejectTitle')" modal class="w-full max-w-md">
      <p class="text-sm text-surface-600 dark:text-surface-300 mb-3">{{ $t("adminVerifications.rejectPrompt") }}</p>
      <Textarea v-model="rejectNote" rows="3" class="w-full" :placeholder="$t('adminVerifications.rejectPlaceholder')" />
      <template #footer>
        <Button :label="$t('adminVerifications.cancel')" text @click="rejectDialog = false" />
        <Button :label="$t('adminVerifications.confirmReject')" severity="danger" :loading="actingId !== null" @click="confirmReject" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import DataTable from "primevue/datatable"
import Column from "primevue/column"
import Button from "primevue/button"
import Dialog from "primevue/dialog"
import Textarea from "primevue/textarea"
import Tag from "primevue/tag"
import SelectButton from "primevue/selectbutton"
import ProgressSpinner from "primevue/progressspinner"
import { useToast } from "primevue/usetoast"
import type { ApiResponse } from "~/types/api"
import type { IdentityVerification, IdentityVerificationWithUser } from "~/types/verifications"

const { t, locale } = useI18n()
const toast = useToast()

const statusFilter = ref<"pending" | "approved" | "rejected" | "all">("pending")
const statusOptions = computed(() => [
  { label: t("adminVerifications.filterPending"), value: "pending" },
  { label: t("adminVerifications.filterApproved"), value: "approved" },
  { label: t("adminVerifications.filterRejected"), value: "rejected" },
  { label: t("adminVerifications.filterAll"), value: "all" },
])

const msg = (r: ApiResponse<unknown>) => r.message[locale.value as "en" | "vi"] || r.message.en

const query = computed(() => (statusFilter.value === "all" ? {} : { status: statusFilter.value }))

const { data: listResponse, pending, refresh } = await useFetch<ApiResponse<IdentityVerificationWithUser[]>>(
  "/api/verifications",
  {
    query,
    credentials: "include",
    ignoreResponseError: true,
  },
)

const rows = computed(() => (listResponse.value?.success ? listResponse.value.data : []))

const actingId = ref<number | null>(null)

const imageDialog = ref(false)
const imageUrl = ref<string | null>(null)
const openImage = (url: string) => {
  imageUrl.value = url
  imageDialog.value = true
}

const rejectDialog = ref(false)
const rejectNote = ref("")
const rejectTarget = ref<IdentityVerificationWithUser | null>(null)
const openReject = (row: IdentityVerificationWithUser) => {
  rejectTarget.value = row
  rejectNote.value = ""
  rejectDialog.value = true
}

const statusText = (s: string) =>
  s === "approved" ? t("verification.statusApproved") : s === "rejected" ? t("verification.statusRejected") : t("verification.statusPending")
const statusSeverity = (s: string) => (s === "approved" ? "success" : s === "rejected" ? "danger" : "warn")

const review = async (row: IdentityVerificationWithUser, decision: "approved" | "rejected", note?: string) => {
  actingId.value = row.id
  try {
    const res = await $fetch(`/api/verifications/${row.id}/review`, {
      method: "PATCH",
      body: { decision, reviewNote: note },
      ignoreResponseError: true,
      credentials: "include",
    }) as ApiResponse<IdentityVerification>
    if (res.success) {
      toast.add({ severity: "success", summary: t("general.success"), detail: msg(res), life: 4000 })
      await refresh()
    } else {
      toast.add({ severity: "error", summary: t("general.error"), detail: msg(res), life: 5000 })
    }
  } catch (e) {
    toast.add({ severity: "error", summary: t("general.error"), detail: e instanceof Error ? e.message : "", life: 5000 })
  } finally {
    actingId.value = null
  }
}

const approve = (row: IdentityVerificationWithUser) => review(row, "approved")

const confirmReject = async () => {
  if (!rejectTarget.value) return
  await review(rejectTarget.value, "rejected", rejectNote.value.trim() || undefined)
  rejectDialog.value = false
}

useHead({ title: () => t("adminVerifications.title") })

definePageMeta({
  layout: "openvpf",
  middleware: "admin",
})
</script>
