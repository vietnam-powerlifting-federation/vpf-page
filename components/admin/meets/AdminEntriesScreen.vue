<template>
  <AdminPage
    :title="$t('admin.entries.title')"
    :subtitle="$t('admin.entries.subtitle')"
    :back-to="`/admin/meets/${entries.meetId}`"
    :back-label="$t('admin.meets.title')"
  >
    <Message v-if="entries.roster?.resultsImported" severity="info" class="mb-4">
      {{ $t("admin.entries.readOnly") }}
    </Message>

    <div class="flex flex-wrap gap-2 items-center mb-4">
      <Button
        :loading="entries.generating"
        :disabled="entries.roster?.resultsImported"
        @click="entries.generate"><AppIcon name="lucide:refresh-ccw" class="size-4" />{{ $t('admin.entries.generate') }}</Button>
      <Button v-slot="slotProps" as-child outlined>
        <a :href="entries.exportUrl" download :class="slotProps.class"><AppIcon name="lucide:download" class="size-4" />{{ $t('admin.entries.export') }}</a>
      </Button>
      <Button :aria-label="$t('admin.common.refresh')" text severity="secondary" @click="entries.refresh"><AppIcon name="lucide:refresh-cw" class="size-4" /></Button>

      <div class="flex-1" />

      <template v-if="entries.selected.length && !entries.roster?.resultsImported">
        <span class="text-sm text-muted-color">
          {{ $t("admin.entries.selected", { count: entries.selected.length }) }}
        </span>
        <InputText v-model="entries.bulk.session" class="w-24" :placeholder="$t('admin.entries.session')" :aria-label="$t('admin.entries.session')" />
        <InputText v-model="entries.bulk.flight" class="w-24" :placeholder="$t('admin.entries.flight')" :aria-label="$t('admin.entries.flight')" />
        <InputText v-model="entries.bulk.platform" class="w-24" :placeholder="$t('admin.entries.platform')" :aria-label="$t('admin.entries.platform')" />
        <Button size="small" :label="$t('admin.entries.assign')" :loading="entries.assigning" @click="entries.bulkAssign" />
      </template>
    </div>

    <div v-if="entries.roster" class="flex flex-wrap gap-2 mb-4">
      <Tag :value="`${entries.roster.counts.total} ${$t('admin.entries.total')}`" severity="secondary" />
      <Tag :value="`${entries.roster.counts.paid} ${$t('admin.entries.paid')}`" severity="success" />
      <Tag v-if="entries.roster.counts.unpaid" :value="`${entries.roster.counts.unpaid} ${$t('admin.entries.unpaid')}`" severity="warn" />
      <Tag v-if="entries.roster.counts.withdrawn" :value="`${entries.roster.counts.withdrawn} ${$t('admin.entries.withdrawn')}`" severity="danger" />
    </div>

    <!-- Counts per weight class and division: what session planning actually needs. -->
    <div v-if="entries.groupCounts.length" class="mb-6 flex flex-wrap gap-2">
      <span
        v-for="group in entries.groupCounts"
        :key="group.key"
        class="text-xs rounded border border-surface-200 px-2 py-1 text-muted-color"
      >
        {{ group.key }}: <strong>{{ group.count }}</strong>
      </span>
    </div>

    <div v-if="entries.pending" class="flex justify-center py-12"><ProgressSpinner /></div>
    <DataTable
      v-else
      v-model:selection="entries.selected"
      :value="entries.entries"
      size="small"
      striped-rows
      data-key="entryId"
      edit-mode="cell"
      class="border border-surface-200"
      :row-class="(row: MeetEntryWithAthlete) => (row.withdrawn ? 'opacity-50' : '')"
      @cell-edit-complete="entries.onCellEdit"
    >
      <Column selection-mode="multiple" style="width: 3rem" />

      <Column :header="$t('admin.entries.athlete')">
        <template #body="{ data }">
          <div class="font-medium text-color">{{ data.fullName }}</div>
          <div class="text-xs text-muted-color font-mono">{{ data.vpfId }}</div>
        </template>
      </Column>

      <Column :header="$t('admin.entries.category')">
        <template #body="{ data }">
          {{ $t(data.sex === "male" ? "general.male" : "general.female") }} ·
          {{ data.weightClass === 999 ? "120+/84+" : data.weightClass }} ·
          {{ data.division }}
        </template>
      </Column>

      <Column :header="$t('admin.entries.payment')">
        <template #body="{ data }">
          <Tag
            :value="data.purchaseStatus ?? $t('admin.entries.doorEntry')"
            :severity="data.purchaseStatus === 'active' ? 'success' : 'warn'"
          />
          <div v-if="data.refCode" class="text-xs text-muted-color font-mono">VPF{{ data.refCode }}</div>
          <Tag v-if="data.mediaPlus" class="mt-1" severity="info" :value="$t('admin.entries.mediaPlus')" />
        </template>
      </Column>

      <Column field="platform" :header="$t('admin.entries.platform')">
        <template #editor="{ data, field }"><InputText v-model="data[field]" size="small" class="w-20" /></template>
      </Column>
      <Column field="session" :header="$t('admin.entries.session')">
        <template #editor="{ data, field }"><InputText v-model="data[field]" size="small" class="w-20" /></template>
      </Column>
      <Column field="flight" :header="$t('admin.entries.flight')">
        <template #editor="{ data, field }"><InputText v-model="data[field]" size="small" class="w-20" /></template>
      </Column>
      <Column field="lot" :header="$t('admin.entries.lot')">
        <template #editor="{ data, field }"><InputNumber v-model="data[field]" size="small" :use-grouping="false" /></template>
      </Column>

      <Column :header="$t('admin.entries.openers')">
        <template #body="{ data }">
          <span class="text-sm">{{ data.squatOpener ?? "—" }} / {{ data.benchOpener ?? "—" }} / {{ data.deadliftOpener ?? "—" }}</span>
        </template>
      </Column>

      <Column :header="$t('admin.entries.rackHeights')">
        <template #body="{ data }">
          <span class="text-sm">S{{ data.squatRackPin ?? "—" }} · B{{ data.benchRackPin ?? "—" }}</span>
        </template>
      </Column>

      <!--
        Once results are back, comparing the assignments that went out against
        the ones that came home is a cheap consistency check: a divergence means
        the meet was re-organised on the day, which is useful and harmless.
      -->
      <Column v-if="entries.roster?.resultsImported" :header="$t('admin.entries.actual')">
        <template #body="{ data }">
          <span v-if="!data.resultAssignment" class="text-muted-color">—</span>
          <span v-else-if="entries.matchesResult(data)" class="text-sm text-success">✓</span>
          <span v-else class="text-sm text-warn">
            {{ data.resultAssignment.platform }}/{{ data.resultAssignment.session }}/{{ data.resultAssignment.flight }}
          </span>
        </template>
      </Column>

      <Column>
        <template #body="{ data }">
          <Button
            v-if="!data.withdrawn"
            size="small"
            text
            severity="danger"
            :label="$t('admin.entries.withdraw')"
            :disabled="entries.roster?.resultsImported"
            @click="entries.withdraw(data)"
          />
          <Tag v-else severity="danger" :value="$t('admin.entries.withdrawn')" />
        </template>
      </Column>
    </DataTable>
  </AdminPage>
</template>

<script setup lang="ts">
import type { MeetEntryWithAthlete } from "~/types/entries"

/** A meet's roster: build it from paid registrations, assign platforms, sessions and flights, and withdraw lifters. */
const entries = await useAdminMeetEntries()
</script>
