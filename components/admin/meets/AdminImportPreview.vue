<template>
  <!-- Step 2 — preview. Nothing has been written. -->
  <section v-if="importer.preview" class="rounded-md border border-surface-200 p-4 md:p-5 mb-6">
    <div class="flex items-center gap-3 mb-4">
      <span class="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-contrast text-sm font-semibold">2</span>
      <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.import.step2") }}</h2>
    </div>

    <Message v-for="issue in importer.preview.issues" :key="issue.code" severity="error" class="mb-3">
      {{ importer.localized(issue.message) }}
    </Message>

    <div v-if="importer.preview.rows.length" class="flex flex-wrap gap-2 mb-4">
      <Tag :value="`${importer.preview.counts.create} ${$t('admin.import.new')}`" severity="success" />
      <Tag :value="`${importer.preview.counts.update} ${$t('admin.import.changed')}`" severity="info" />
      <Tag :value="`${importer.preview.counts.unchanged} ${$t('admin.import.unchanged')}`" severity="secondary" />
      <Tag v-if="importer.preview.counts.delete" :value="`${importer.preview.counts.delete} ${$t('admin.import.removed')}`" severity="danger" />
      <Tag v-if="importer.preview.counts.skip" :value="`${importer.preview.counts.skip} ${$t('admin.import.skipped')}`" severity="warn" />
      <Tag v-if="importer.preview.counts.errors" :value="`${importer.preview.counts.errors} ${$t('admin.import.errors')}`" severity="danger" />
      <Tag v-if="importer.preview.counts.warnings" :value="`${importer.preview.counts.warnings} ${$t('admin.import.warnings')}`" severity="warn" />
    </div>

    <Message v-if="importer.preview.teamsToCreate.length" severity="info" size="small" class="mb-4">
      {{ $t("admin.import.teamsToCreate", { teams: importer.preview.teamsToCreate.join(", ") }) }}
    </Message>

    <!-- Bounded by one meet's roster, so a plain client-side table is correct here. -->
    <DataTable
      v-if="importer.preview.rows.length"
      :value="importer.preview.rows"
      size="small"
      striped-rows
      scrollable
      class="border border-surface-200"
      :row-class="rowClass"
    >
      <Column :header="$t('admin.import.line')" style="width: 4rem">
        <template #body="{ data }">{{ data.row.lineNumber }}</template>
      </Column>

      <Column :header="$t('admin.import.athlete')">
        <template #body="{ data }">
          <div class="font-medium text-color">{{ data.row.name }}</div>
          <div class="text-xs text-muted-color">
            <span v-if="data.match.vpfId" class="font-mono">{{ data.match.vpfId }}</span>
            <span v-else>{{ $t("admin.import.unmatched") }}</span>
            <span v-if="data.match.method"> · {{ $t(`admin.import.matchedBy.${data.match.method}`) }}</span>
          </div>

          <!-- Unmatched rows get a search box to bind a VPF id, or a skip. -->
          <div v-if="!data.match.vpfId && data.action !== 'skip'" class="mt-2 flex flex-wrap gap-1 items-center">
            <Select
              v-if="data.match.candidates.length"
              :model-value="importer.overrides[data.row.lineNumber]?.vpfId ?? null"
              :options="data.match.candidates"
              option-label="fullName"
              option-value="vpfId"
              size="small"
              class="w-56"
              :placeholder="$t('admin.import.pickAthlete')"
              @update:model-value="(value: string) => importer.bind(data.row.lineNumber, value)"
            />
            <InputText
              v-else
              size="small"
              class="w-40 font-mono"
              placeholder="VPF000123"
              @change="(event: Event) => importer.bind(data.row.lineNumber, (event.target as HTMLInputElement).value)"
            />
            <Button size="small" text :label="$t('admin.import.skipRow')" @click="importer.skip(data.row.lineNumber)" />
          </div>
          <Button
            v-else-if="data.action === 'skip' && importer.overrides[data.row.lineNumber]?.skip"
            size="small"
            text
            :label="$t('admin.import.unskipRow')"
            @click="importer.unskip(data.row.lineNumber)"
          />
        </template>
      </Column>

      <Column :header="$t('general.division')">
        <template #body="{ data }">
          <div>{{ data.row.division ?? "—" }}</div>
          <div class="text-xs text-muted-color">{{ data.row.divisionRaw }}</div>
        </template>
      </Column>

      <Column :header="$t('general.weightClass')">
        <template #body="{ data }">
          {{ data.row.weightClass === 999 ? "120+/84+" : data.row.weightClass ?? "—" }}
          <div class="text-xs text-muted-color">{{ data.row.bodyWeight }} kg</div>
        </template>
      </Column>

      <!--
        Derived state, not an echo of the CSV. This column is why the preview
        step exists: a bodyweight outside the entered class disqualifies an
        athlete with no error anywhere else.
      -->
      <Column :header="$t('admin.import.derived')">
        <template #body="{ data }">
          <template v-if="data.action !== 'skip'">
            <div class="text-sm">
              {{ data.derived.bestSquat }} / {{ data.derived.bestBench }} / {{ data.derived.bestDeadlift }}
              = <strong>{{ data.derived.total }}</strong>
            </div>
            <div class="text-xs text-muted-color">
              GL {{ data.derived.gl ?? "—" }} ·
              {{ data.derived.disqualified ? $t("admin.import.dq") : `#${data.derived.placement}` }}
            </div>
            <Tag
              v-if="data.derived.disqualified"
              class="mt-1"
              severity="danger"
              :value="$t('admin.import.dq')"
            />
            <div v-for="(reason, i) in data.derived.dqReasons" :key="i" class="text-xs text-danger">
              {{ importer.localized(reason) }}
            </div>
          </template>
          <span v-else class="text-muted-color">—</span>
        </template>
      </Column>

      <Column :header="$t('admin.import.action')">
        <template #body="{ data }">
          <Tag :value="$t(`admin.import.actions.${data.action}`)" :severity="importer.actionSeverity(data.action)" />
          <div v-if="data.createsTeam" class="text-xs text-muted-color mt-1">
            {{ $t("admin.import.newTeam", { team: data.createsTeam }) }}
          </div>
          <div v-if="data.changes.length" class="text-xs text-muted-color mt-1">
            {{ data.changes.map((change: FieldChange) => change.field).join(", ") }}
          </div>
        </template>
      </Column>

      <Column :header="$t('admin.import.issues')">
        <template #body="{ data }">
          <div
            v-for="(issue, i) in data.row.issues"
            :key="i"
            class="text-xs"
            :class="issue.severity === 'error' ? 'text-danger' : 'text-warn'"
          >
            {{ importer.localized(issue.message) }}
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- A withdrawn lifter must actually disappear. -->
    <div v-if="importer.preview.deletions.length" class="mt-4">
      <p class="text-sm font-medium text-danger mb-1">{{ $t("admin.import.willDelete") }}</p>
      <ul class="text-sm text-muted-color list-disc list-inside">
        <li v-for="deletion in importer.preview.deletions" :key="deletion.vpfId">
          {{ deletion.fullName }} ({{ deletion.vpfId }}) — {{ deletion.division }} {{ deletion.weightClass }}
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { FieldChange } from "~/types/attempts"

/** Step 2: what the file would change, row by row, before anything is written. Unmatched rows can be bound to an athlete or skipped. */
const importer = useAdminResultsImport()

function rowClass(row: { row: { issues: { severity: string }[] } }) {
  return row.row.issues.some((issue) => issue.severity === "error") ? "!bg-red-50 dark:!bg-red-950/30" : ""
}
</script>
