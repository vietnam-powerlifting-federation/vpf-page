<template>
  <!-- Violations for this athlete, with the consequence spelled out. -->
  <section class="mt-10 rounded-md border border-surface-200 p-4 md:p-5">
    <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase mb-1">{{ $t("admin.violations.title") }}</h2>
    <p class="text-sm mb-4" :class="athlete.outcomeClass">{{ athlete.outcomeText }}</p>

    <DataTable v-if="athlete.violations.length" :value="athlete.violations" size="small" class="border border-surface-200">
      <Column :header="$t('admin.violations.note')" field="note" />
      <Column :header="$t('admin.violations.expireYear')">
        <template #body="{ data }">
          {{ data.expireYear ?? $t("admin.violations.never") }}
        </template>
      </Column>
      <Column :header="$t('general.date')">
        <template #body="{ data }">{{ formatDateDMY(data.createdAt) }}</template>
      </Column>
    </DataTable>
    <p v-else class="text-sm text-muted-color">{{ $t("admin.violations.none") }}</p>

    <Button v-slot="slotProps" as-child size="small" text><NuxtLinkLocale to="/admin/violations" :class="slotProps.class">{{ $t('admin.violations.manage') }}</NuxtLinkLocale></Button>
  </section>
</template>

<script setup lang="ts">
import { formatDateDMY } from "~/lib/domain/date"

/** An athlete's violations and what their level means for registering. */
const props = defineProps<{ vpfId: string }>()

const athlete = useAthleteViolations(props.vpfId)
</script>
