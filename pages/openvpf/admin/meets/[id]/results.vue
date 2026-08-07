<template>
  <div class="p-4 md:p-8">
    <NuxtLinkLocale :to="`/openvpf/admin/meets/${meetId}`" class="text-sm text-primary hover:underline">
      ← {{ $t("admin.meets.title") }}
    </NuxtLinkLocale>

    <h1 class="text-2xl font-bold mt-2 mb-1 text-surface-900 dark:text-surface-0">{{ $t("admin.import.title") }}</h1>
    <p class="text-sm text-surface-600 dark:text-surface-300 mb-6">{{ $t("admin.import.subtitle") }}</p>

    <!-- Step 1 — pick a file. -->
    <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 md:p-5 mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <span class="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-contrast text-sm font-semibold">1</span>
        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0 flex-1">{{ $t("admin.import.step1") }}</h2>
        <input
          ref="fileInput"
          type="file"
          accept=".csv,text/csv"
          class="hidden"
          @change="onFileChange"
        >
        <Button icon="pi pi-file" :label="$t('admin.import.chooseFile')" outlined @click="fileInput?.click()" />
        <span v-if="fileName" class="text-sm text-surface-600 dark:text-surface-300 font-mono">{{ fileName }}</span>
      </div>
      <p class="mt-3 text-sm text-surface-500">{{ $t("admin.import.step1Hint") }}</p>
    </section>

    <!-- Step 2 — preview. Nothing has been written. -->
    <section v-if="preview" class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 md:p-5 mb-6">
      <div class="flex items-center gap-3 mb-4">
        <span class="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-contrast text-sm font-semibold">2</span>
        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ $t("admin.import.step2") }}</h2>
      </div>

      <Message v-for="issue in preview.issues" :key="issue.code" severity="error" class="mb-3">
        {{ localized(issue.message) }}
      </Message>

      <div v-if="preview.rows.length" class="flex flex-wrap gap-2 mb-4">
        <Tag :value="`${preview.counts.create} ${$t('admin.import.new')}`" severity="success" />
        <Tag :value="`${preview.counts.update} ${$t('admin.import.changed')}`" severity="info" />
        <Tag :value="`${preview.counts.unchanged} ${$t('admin.import.unchanged')}`" severity="secondary" />
        <Tag v-if="preview.counts.delete" :value="`${preview.counts.delete} ${$t('admin.import.removed')}`" severity="danger" />
        <Tag v-if="preview.counts.skip" :value="`${preview.counts.skip} ${$t('admin.import.skipped')}`" severity="warn" />
        <Tag v-if="preview.counts.errors" :value="`${preview.counts.errors} ${$t('admin.import.errors')}`" severity="danger" />
        <Tag v-if="preview.counts.warnings" :value="`${preview.counts.warnings} ${$t('admin.import.warnings')}`" severity="warn" />
      </div>

      <Message v-if="preview.teamsToCreate.length" severity="info" size="small" class="mb-4">
        {{ $t("admin.import.teamsToCreate", { teams: preview.teamsToCreate.join(", ") }) }}
      </Message>

      <!-- Bounded by one meet's roster, so a plain client-side table is correct here. -->
      <DataTable
        v-if="preview.rows.length"
        :value="preview.rows"
        size="small"
        striped-rows
        scrollable
        class="border border-surface-200 dark:border-surface-700"
        :row-class="rowClass"
      >
        <Column :header="$t('admin.import.line')" style="width: 4rem">
          <template #body="{ data }">{{ data.row.lineNumber }}</template>
        </Column>

        <Column :header="$t('admin.import.athlete')">
          <template #body="{ data }">
            <div class="font-medium text-surface-900 dark:text-surface-0">{{ data.row.name }}</div>
            <div class="text-xs text-surface-500">
              <span v-if="data.match.vpfId" class="font-mono">{{ data.match.vpfId }}</span>
              <span v-else>{{ $t("admin.import.unmatched") }}</span>
              <span v-if="data.match.method"> · {{ $t(`admin.import.matchedBy.${data.match.method}`) }}</span>
            </div>

            <!-- Unmatched rows get a search box to bind a VPF id, or a skip. -->
            <div v-if="!data.match.vpfId && data.action !== 'skip'" class="mt-2 flex flex-wrap gap-1 items-center">
              <Select
                v-if="data.match.candidates.length"
                :model-value="overrides[data.row.lineNumber]?.vpfId ?? null"
                :options="data.match.candidates"
                option-label="fullName"
                option-value="vpfId"
                size="small"
                class="w-56"
                :placeholder="$t('admin.import.pickAthlete')"
                @update:model-value="(value: string) => bind(data.row.lineNumber, value)"
              />
              <InputText
                v-else
                size="small"
                class="w-40 font-mono"
                placeholder="VPF000123"
                @change="(event: Event) => bind(data.row.lineNumber, (event.target as HTMLInputElement).value)"
              />
              <Button size="small" text :label="$t('admin.import.skipRow')" @click="skip(data.row.lineNumber)" />
            </div>
            <Button
              v-else-if="data.action === 'skip' && overrides[data.row.lineNumber]?.skip"
              size="small"
              text
              :label="$t('admin.import.unskipRow')"
              @click="unskip(data.row.lineNumber)"
            />
          </template>
        </Column>

        <Column :header="$t('general.division')">
          <template #body="{ data }">
            <div>{{ data.row.division ?? "—" }}</div>
            <div class="text-xs text-surface-500">{{ data.row.divisionRaw }}</div>
          </template>
        </Column>

        <Column :header="$t('general.weightClass')">
          <template #body="{ data }">
            {{ data.row.weightClass === 999 ? "120+/84+" : data.row.weightClass ?? "—" }}
            <div class="text-xs text-surface-500">{{ data.row.bodyWeight }} kg</div>
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
              <div class="text-xs text-surface-500">
                GL {{ data.derived.gl ?? "—" }} ·
                {{ data.derived.disqualified ? $t("admin.import.dq") : `#${data.derived.placement}` }}
              </div>
              <Tag
                v-if="data.derived.disqualified"
                class="mt-1"
                severity="danger"
                :value="$t('admin.import.dq')"
              />
              <div v-for="(reason, i) in data.derived.dqReasons" :key="i" class="text-xs text-red-500">
                {{ localized(reason) }}
              </div>
            </template>
            <span v-else class="text-surface-400">—</span>
          </template>
        </Column>

        <Column :header="$t('admin.import.action')">
          <template #body="{ data }">
            <Tag :value="$t(`admin.import.actions.${data.action}`)" :severity="actionSeverity(data.action)" />
            <div v-if="data.createsTeam" class="text-xs text-surface-500 mt-1">
              {{ $t("admin.import.newTeam", { team: data.createsTeam }) }}
            </div>
            <div v-if="data.changes.length" class="text-xs text-surface-500 mt-1">
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
              :class="issue.severity === 'error' ? 'text-red-500' : 'text-amber-500'"
            >
              {{ localized(issue.message) }}
            </div>
          </template>
        </Column>
      </DataTable>

      <!-- A withdrawn lifter must actually disappear. -->
      <div v-if="preview.deletions.length" class="mt-4">
        <p class="text-sm font-medium text-red-500 mb-1">{{ $t("admin.import.willDelete") }}</p>
        <ul class="text-sm text-surface-600 dark:text-surface-300 list-disc list-inside">
          <li v-for="deletion in preview.deletions" :key="deletion.vpfId">
            {{ deletion.fullName }} ({{ deletion.vpfId }}) — {{ deletion.division }} {{ deletion.weightClass }}
          </li>
        </ul>
      </div>
    </section>

    <!-- Step 3 — commit. -->
    <section v-if="preview && preview.rows.length" class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 md:p-5">
      <div class="flex items-center gap-3 mb-4">
        <span class="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-contrast text-sm font-semibold">3</span>
        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ $t("admin.import.step3") }}</h2>
      </div>

      <Message v-if="preview.blocked" severity="error" size="small" class="mb-3">
        {{ $t("admin.import.blocked") }}
      </Message>
      <Message v-else severity="secondary" size="small" class="mb-3">
        {{ $t("admin.import.replaceWarning") }}
      </Message>

      <Button
        :label="$t('admin.import.confirm')"
        :disabled="preview.blocked"
        :loading="confirming"
        @click="confirm"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { ApiResponse } from "~/types/api"
import type { BilingualText, FieldChange, ImportPreview, ImportResult, RowAction } from "~/types/attempts"

definePageMeta({ layout: "openvpf-admin", middleware: "admin" })

const { t, locale } = useI18n()
const route = useRoute()
const toast = useToast()
const msg = useApiMessage()

const meetId = computed(() => String(route.params.id))

const fileInput = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const fileName = ref("")
const preview = ref<ImportPreview | null>(null)
const confirming = ref(false)

/**
 * Per-row decisions carried back to the server on both preview and confirm.
 * Replaced wholesale rather than mutated so the watcher below fires reliably.
 */
type RowOverride = { vpfId?: string; skip?: boolean }
const overrides = ref<Record<number, RowOverride>>({})

function setOverride(lineNumber: number, value: RowOverride | null) {
  overrides.value = Object.fromEntries(
    Object.entries(overrides.value)
      .filter(([line]) => Number(line) !== lineNumber)
      .concat(value ? [[String(lineNumber), value]] : []),
  )
}

function localized(message: BilingualText) {
  return message[locale.value as "en" | "vi"] ?? message.en
}

function actionSeverity(action: RowAction) {
  return { create: "success", update: "info", unchanged: "secondary", delete: "danger", skip: "warn" }[action]
}

function rowClass(row: { row: { issues: { severity: string }[] } }) {
  return row.row.issues.some((issue) => issue.severity === "error") ? "!bg-red-50 dark:!bg-red-950/30" : ""
}

async function onFileChange(event: Event) {
  const picked = (event.target as HTMLInputElement).files?.[0] ?? null
  file.value = picked
  fileName.value = picked?.name ?? ""
  overrides.value = {}
  await runPreview()
}

async function runPreview() {
  if (!file.value) return
  const body = new FormData()
  body.append("file", file.value)
  body.append("overrides", JSON.stringify(overrides.value))

  const res = await $fetch<ApiResponse<ImportPreview>>(`/api/meets/${meetId.value}/results/import`, {
    method: "POST",
    credentials: "include",
    ignoreResponseError: true,
    body,
  })

  if (!res.success) {
    preview.value = null
    toast.add({ severity: "error", summary: t("general.error"), detail: msg(res), life: 6000 })
    return
  }
  preview.value = res.data
}

function bind(lineNumber: number, vpfId: string) {
  if (!vpfId) return
  setOverride(lineNumber, { vpfId: vpfId.trim() })
}

function skip(lineNumber: number) {
  setOverride(lineNumber, { skip: true })
}

function unskip(lineNumber: number) {
  setOverride(lineNumber, null)
}

// Any change to the bindings re-derives the whole preview server-side, so the
// table always reflects what would actually be written.
watch(overrides, () => { void runPreview() })

async function confirm() {
  if (!file.value || !preview.value) return
  confirming.value = true
  try {
    const body = new FormData()
    body.append("file", file.value)
    body.append("checksum", preview.value.checksum)
    body.append("overrides", JSON.stringify(overrides.value))

    const res = await $fetch<ApiResponse<ImportResult>>(`/api/meets/${meetId.value}/results/import/confirm`, {
      method: "POST",
      credentials: "include",
      ignoreResponseError: true,
      body,
    })

    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 6000,
    })

    if (res.success) await runPreview()
  } finally {
    confirming.value = false
  }
}

useHead({ title: () => t("admin.import.title") })
</script>
