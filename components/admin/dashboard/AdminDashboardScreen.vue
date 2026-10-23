<template>
  <AdminPage :title="$t('admin.dashboard.title')" :subtitle="$t('admin.dashboard.subtitle')" width="6xl">
    <div v-if="dashboard.pending" class="flex justify-center py-12"><ProgressSpinner /></div>

    <template v-else-if="dashboard.data">
      <div v-if="dashboard.queueEmpty" class="rounded-md border border-surface-200 p-8 text-center">
        <AppIcon name="lucide:circle-check" class="size-8 text-success mb-2" />
        <p class="text-muted-color">{{ $t("admin.dashboard.allClear") }}</p>
      </div>

      <div v-else class="space-y-3">
        <!-- Each row links straight into the tool with the filter pre-applied. -->
        <NuxtLinkLocale
          v-if="dashboard.data.pendingVerifications > 0"
          to="/admin/verifications"
          class="flex items-center gap-4 rounded-md border border-surface-200 p-4 hover:border-accent"
        >
          <AppIcon name="lucide:id-card" class="size-5 text-accent" />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-color">{{ $t("admin.dashboard.verifications") }}</p>
            <p class="text-sm text-muted-color">{{ $t("admin.dashboard.verificationsHint") }}</p>
          </div>
          <Tag :value="String(dashboard.data.pendingVerifications)" severity="warn" />
        </NuxtLinkLocale>

        <NuxtLinkLocale
          v-if="dashboard.data.stalePurchases > 0"
          to="/admin/purchases?status=pending&order=oldest"
          class="flex items-center gap-4 rounded-md border border-surface-200 p-4 hover:border-accent"
        >
          <AppIcon name="lucide:wallet" class="size-5 text-accent" />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-color">{{ $t("admin.dashboard.stalePurchases") }}</p>
            <p class="text-sm text-muted-color">
              {{ $t("admin.dashboard.stalePurchasesHint", { amount: dashboard.stalePurchaseValue }) }}
            </p>
          </div>
          <Tag :value="String(dashboard.data.stalePurchases)" severity="danger" />
        </NuxtLinkLocale>

        <div
          v-for="meet in dashboard.data.meetsMissingResults"
          :key="`results-${meet.meetId}`"
          class="rounded-md border border-surface-200 p-4"
        >
          <div class="flex items-center gap-4">
            <AppIcon name="lucide:upload" class="size-5 text-accent" />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-color truncate">{{ meet.meetName }}</p>
              <p class="text-sm text-muted-color">
                {{ $t("admin.dashboard.missingResults", { date: formatDateDMY(meet.hostDate) }) }}
              </p>
            </div>
            <Button v-slot="slotProps" as-child size="small" outlined><NuxtLinkLocale :to="`/admin/meets/${meet.meetId}/results`" :class="slotProps.class">{{ $t('admin.dashboard.importResults') }}</NuxtLinkLocale></Button>
          </div>
        </div>

        <div
          v-for="meet in dashboard.data.meetsNeedingEntries"
          :key="`entries-${meet.meetId}`"
          class="rounded-md border border-surface-200 p-4"
        >
          <div class="flex items-center gap-4">
            <AppIcon name="lucide:list" class="size-5 text-accent" />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-color truncate">{{ meet.meetName }}</p>
              <p class="text-sm text-muted-color">
                {{ $t("admin.dashboard.needsEntries", { count: meet.paidRegistrations ?? 0 }) }}
              </p>
            </div>
            <Button v-slot="slotProps" as-child size="small" outlined><NuxtLinkLocale :to="`/admin/meets/${meet.meetId}/entries`" :class="slotProps.class">{{ $t('admin.dashboard.buildRoster') }}</NuxtLinkLocale></Button>
          </div>
        </div>

        <div
          v-for="meet in dashboard.data.meetsClosingSoon"
          :key="`closing-${meet.meetId}`"
          class="rounded-md border border-surface-200 p-4"
        >
          <div class="flex items-center gap-4">
            <AppIcon name="lucide:clock" class="size-5 text-muted-color" />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-color truncate">{{ meet.meetName }}</p>
              <p class="text-sm text-muted-color">
                {{ $t("admin.dashboard.closingSoon", { date: formatDateDMY(meet.closeRegistration) }) }}
              </p>
            </div>
            <Button v-slot="slotProps" as-child size="small" text><NuxtLinkLocale :to="`/admin/meets/${meet.meetId}`" :class="slotProps.class">{{ $t('admin.dashboard.openMeet') }}</NuxtLinkLocale></Button>
          </div>
        </div>
      </div>

      <!-- Vanity metrics, deliberately below the fold. -->
      <div class="mt-10 pt-6 border-t border-surface-200">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="stat in dashboard.stats" :key="stat.label">
            <p class="text-xs uppercase tracking-wide text-muted-color">{{ $t(stat.label) }}</p>
            <p class="text-xl font-semibold text-color">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </template>
  </AdminPage>
</template>

<script setup lang="ts">
import { formatDateDMY } from "~/lib/domain/date"

/** The admin dashboard: a queue of what needs attention, each row linking into the right tool, and the totals. */
const dashboard = useAdminDashboard()
</script>
