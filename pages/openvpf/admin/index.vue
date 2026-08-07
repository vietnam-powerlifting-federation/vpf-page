<template>
  <div class="p-4 md:p-8 max-w-6xl">
    <h1 class="text-2xl font-bold mb-1 text-surface-900 dark:text-surface-0">{{ $t("admin.dashboard.title") }}</h1>
    <p class="text-sm text-surface-600 dark:text-surface-300 mb-6">{{ $t("admin.dashboard.subtitle") }}</p>

    <div v-if="pending" class="flex justify-center py-12"><ProgressSpinner /></div>

    <template v-else-if="data">
      <div v-if="queueEmpty" class="rounded-lg border border-surface-200 dark:border-surface-700 p-8 text-center">
        <i class="pi pi-check-circle text-3xl text-green-500 mb-2" />
        <p class="text-surface-600 dark:text-surface-300">{{ $t("admin.dashboard.allClear") }}</p>
      </div>

      <div v-else class="space-y-3">
        <!-- Each row links straight into the tool with the filter pre-applied. -->
        <NuxtLinkLocale
          v-if="data.pendingVerifications > 0"
          to="/openvpf/admin/verifications"
          class="flex items-center gap-4 rounded-lg border border-surface-200 dark:border-surface-700 p-4 hover:border-primary"
        >
          <i class="pi pi-id-card text-xl text-primary" />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-surface-900 dark:text-surface-0">{{ $t("admin.dashboard.verifications") }}</p>
            <p class="text-sm text-surface-500">{{ $t("admin.dashboard.verificationsHint") }}</p>
          </div>
          <Tag :value="String(data.pendingVerifications)" severity="warn" />
        </NuxtLinkLocale>

        <NuxtLinkLocale
          v-if="data.stalePurchases > 0"
          to="/openvpf/admin/purchases?status=pending&order=oldest"
          class="flex items-center gap-4 rounded-lg border border-surface-200 dark:border-surface-700 p-4 hover:border-primary"
        >
          <i class="pi pi-wallet text-xl text-primary" />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-surface-900 dark:text-surface-0">{{ $t("admin.dashboard.stalePurchases") }}</p>
            <p class="text-sm text-surface-500">
              {{ $t("admin.dashboard.stalePurchasesHint", { amount: formatVnd(data.stalePurchaseValue) }) }}
            </p>
          </div>
          <Tag :value="String(data.stalePurchases)" severity="danger" />
        </NuxtLinkLocale>

        <div
          v-for="meet in data.meetsMissingResults"
          :key="`results-${meet.meetId}`"
          class="rounded-lg border border-surface-200 dark:border-surface-700 p-4"
        >
          <div class="flex items-center gap-4">
            <i class="pi pi-upload text-xl text-primary" />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-surface-900 dark:text-surface-0 truncate">{{ meet.meetName }}</p>
              <p class="text-sm text-surface-500">
                {{ $t("admin.dashboard.missingResults", { date: formatDateDMY(meet.hostDate) }) }}
              </p>
            </div>
            <NuxtLinkLocale :to="`/openvpf/admin/meets/${meet.meetId}/results`">
              <Button size="small" :label="$t('admin.dashboard.importResults')" outlined />
            </NuxtLinkLocale>
          </div>
        </div>

        <div
          v-for="meet in data.meetsNeedingEntries"
          :key="`entries-${meet.meetId}`"
          class="rounded-lg border border-surface-200 dark:border-surface-700 p-4"
        >
          <div class="flex items-center gap-4">
            <i class="pi pi-list text-xl text-primary" />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-surface-900 dark:text-surface-0 truncate">{{ meet.meetName }}</p>
              <p class="text-sm text-surface-500">
                {{ $t("admin.dashboard.needsEntries", { count: meet.paidRegistrations ?? 0 }) }}
              </p>
            </div>
            <NuxtLinkLocale :to="`/openvpf/admin/meets/${meet.meetId}/entries`">
              <Button size="small" :label="$t('admin.dashboard.buildRoster')" outlined />
            </NuxtLinkLocale>
          </div>
        </div>

        <div
          v-for="meet in data.meetsClosingSoon"
          :key="`closing-${meet.meetId}`"
          class="rounded-lg border border-surface-200 dark:border-surface-700 p-4"
        >
          <div class="flex items-center gap-4">
            <i class="pi pi-clock text-xl text-surface-500" />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-surface-900 dark:text-surface-0 truncate">{{ meet.meetName }}</p>
              <p class="text-sm text-surface-500">
                {{ $t("admin.dashboard.closingSoon", { date: formatDateDMY(meet.closeRegistration) }) }}
              </p>
            </div>
            <NuxtLinkLocale :to="`/openvpf/admin/meets/${meet.meetId}`">
              <Button size="small" :label="$t('admin.dashboard.openMeet')" text />
            </NuxtLinkLocale>
          </div>
        </div>
      </div>

      <!-- Vanity metrics, deliberately below the fold. -->
      <div class="mt-10 pt-6 border-t border-surface-200 dark:border-surface-800">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="stat in stats" :key="stat.label">
            <p class="text-xs uppercase tracking-wide text-surface-500">{{ $t(stat.label) }}</p>
            <p class="text-xl font-semibold text-surface-900 dark:text-surface-0">{{ stat.value }}</p>
          </div>
        </div>
        <Button
          class="mt-6"
          size="small"
          outlined
          severity="secondary"
          icon="pi pi-refresh"
          :label="$t('admin.dashboard.rebuildCache')"
          :loading="rebuilding"
          @click="rebuildCache"
        />
        <p class="mt-2 text-xs text-surface-500">{{ $t("admin.dashboard.rebuildCacheHint") }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { formatDateDMY } from "~/lib/utils/date"
import type { ApiResponse } from "~/types/api"
import type { AdminDashboard } from "~/types/admin"

definePageMeta({ layout: "openvpf-admin", middleware: "admin" })

const { t } = useI18n()
const toast = useToast()
const msg = useApiMessage()

const { data: response, pending } = await useFetch<ApiResponse<AdminDashboard>>("/api/admin/dashboard", {
  credentials: "include",
  ignoreResponseError: true,
})

const data = computed(() => (response.value?.success ? response.value.data : null))

const queueEmpty = computed(() => {
  const queue = data.value
  if (!queue) return true
  return queue.pendingVerifications === 0
    && queue.stalePurchases === 0
    && queue.meetsMissingResults.length === 0
    && queue.meetsClosingSoon.length === 0
    && queue.meetsNeedingEntries.length === 0
})

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount)
}

const stats = computed(() => [
  { label: "admin.dashboard.statAthletes", value: data.value?.totals.athletes ?? 0 },
  { label: "admin.dashboard.statActiveMembers", value: data.value?.totals.activeMembers ?? 0 },
  { label: "admin.dashboard.statMeets", value: data.value?.totals.meets ?? 0 },
  { label: "admin.dashboard.statPendingValue", value: formatVnd(data.value?.totals.pendingValue ?? 0) },
])

const rebuilding = ref(false)

/**
 * Cached public data expires on its own after a day, and only a results import
 * clears it early. Staff need a visible way to force a rebuild for everything
 * else — a meet renamed, or a record fixed directly in the database (§3.6).
 */
async function rebuildCache() {
  rebuilding.value = true
  try {
    const res = await $fetch<ApiResponse<{ cleared: number }>>("/api/admin/records-cache", {
      method: "POST",
      credentials: "include",
      ignoreResponseError: true,
    })
    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 4000,
    })
  } finally {
    rebuilding.value = false
  }
}

useHead({ title: () => t("admin.dashboard.title") })
</script>
