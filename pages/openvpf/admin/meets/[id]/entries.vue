<template>
  <div class="p-4 md:p-8">
    <NuxtLinkLocale :to="`/openvpf/admin/meets/${meetId}`" class="text-sm text-primary hover:underline">
      ← {{ $t("admin.meets.title") }}
    </NuxtLinkLocale>

    <h1 class="text-2xl font-bold mt-2 mb-1 text-surface-900 dark:text-surface-0">{{ $t("admin.entries.title") }}</h1>
    <p class="text-sm text-surface-600 dark:text-surface-300 mb-6">{{ $t("admin.entries.subtitle") }}</p>

    <Message v-if="roster?.resultsImported" severity="info" class="mb-4">
      {{ $t("admin.entries.readOnly") }}
    </Message>

    <div class="flex flex-wrap gap-2 items-center mb-4">
      <Button
        icon="pi pi-sync"
        :label="$t('admin.entries.generate')"
        :loading="generating"
        :disabled="roster?.resultsImported"
        @click="generate"
      />
      <a :href="exportUrl" download>
        <Button icon="pi pi-download" outlined :label="$t('admin.entries.export')" />
      </a>
      <Button icon="pi pi-refresh" text severity="secondary" @click="() => refresh()" />

      <div class="flex-1" />

      <template v-if="selected.length && !roster?.resultsImported">
        <span class="text-sm text-surface-600 dark:text-surface-300">
          {{ $t("admin.entries.selected", { count: selected.length }) }}
        </span>
        <InputText v-model="bulk.session" class="w-24" :placeholder="$t('admin.entries.session')" />
        <InputText v-model="bulk.flight" class="w-24" :placeholder="$t('admin.entries.flight')" />
        <InputText v-model="bulk.platform" class="w-24" :placeholder="$t('admin.entries.platform')" />
        <Button size="small" :label="$t('admin.entries.assign')" :loading="assigning" @click="bulkAssign" />
      </template>
    </div>

    <div v-if="roster" class="flex flex-wrap gap-2 mb-4">
      <Tag :value="`${roster.counts.total} ${$t('admin.entries.total')}`" severity="secondary" />
      <Tag :value="`${roster.counts.paid} ${$t('admin.entries.paid')}`" severity="success" />
      <Tag v-if="roster.counts.unpaid" :value="`${roster.counts.unpaid} ${$t('admin.entries.unpaid')}`" severity="warn" />
      <Tag v-if="roster.counts.withdrawn" :value="`${roster.counts.withdrawn} ${$t('admin.entries.withdrawn')}`" severity="danger" />
    </div>

    <!-- Counts per weight class and division: what session planning actually needs. -->
    <div v-if="groupCounts.length" class="mb-6 flex flex-wrap gap-2">
      <span
        v-for="group in groupCounts"
        :key="group.key"
        class="text-xs rounded border border-surface-200 dark:border-surface-700 px-2 py-1 text-surface-600 dark:text-surface-300"
      >
        {{ group.key }}: <strong>{{ group.count }}</strong>
      </span>
    </div>

    <div v-if="pending" class="flex justify-center py-12"><ProgressSpinner /></div>
    <DataTable
      v-else
      v-model:selection="selected"
      :value="entries"
      size="small"
      striped-rows
      data-key="entryId"
      edit-mode="cell"
      class="border border-surface-200 dark:border-surface-700"
      :row-class="(row: MeetEntryWithAthlete) => (row.withdrawn ? 'opacity-50' : '')"
      @cell-edit-complete="onCellEdit"
    >
      <Column selection-mode="multiple" style="width: 3rem" />

      <Column :header="$t('admin.entries.athlete')">
        <template #body="{ data }">
          <div class="font-medium text-surface-900 dark:text-surface-0">{{ data.fullName }}</div>
          <div class="text-xs text-surface-500 font-mono">{{ data.vpfId }}</div>
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
          <div v-if="data.refCode" class="text-xs text-surface-500 font-mono">VPF{{ data.refCode }}</div>
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
      <Column v-if="roster?.resultsImported" :header="$t('admin.entries.actual')">
        <template #body="{ data }">
          <span v-if="!data.resultAssignment" class="text-surface-400">—</span>
          <span v-else-if="matchesResult(data)" class="text-sm text-green-600">✓</span>
          <span v-else class="text-sm text-amber-500">
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
            :disabled="roster?.resultsImported"
            @click="withdraw(data)"
          />
          <Tag v-else severity="danger" :value="$t('admin.entries.withdrawn')" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import type { ApiResponse } from "~/types/api"
import type { EntryGenerationResult, EntryRoster, MeetEntryWithAthlete } from "~/types/entries"

definePageMeta({ layout: "openvpf-admin", middleware: "admin" })

const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const msg = useApiMessage()

const meetId = computed(() => String(route.params.id))
const exportUrl = computed(() => `/api/meets/${meetId.value}/entries/export.csv`)

const { data: response, pending, refresh } = await useFetch<ApiResponse<EntryRoster>>(
  () => `/api/meets/${meetId.value}/entries`,
  { credentials: "include", ignoreResponseError: true },
)

const roster = computed(() => (response.value?.success ? response.value.data : null))
const entries = computed(() => roster.value?.entries ?? [])
const selected = ref<MeetEntryWithAthlete[]>([])

const groupCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of entries.value) {
    if (entry.withdrawn) continue
    const key = `${entry.division} ${entry.weightClass === 999 ? "+" : entry.weightClass}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => a.key.localeCompare(b.key))
})

function matchesResult(entry: MeetEntryWithAthlete) {
  const actual = entry.resultAssignment
  if (!actual) return true
  return actual.platform === entry.platform && actual.session === entry.session && actual.flight === entry.flight
}

const generating = ref(false)

async function generate() {
  generating.value = true
  try {
    const res = await $fetch<ApiResponse<EntryGenerationResult>>(`/api/meets/${meetId.value}/entries/generate`, {
      method: "POST",
      credentials: "include",
      ignoreResponseError: true,
    })
    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 5000,
    })
    if (res.success) await refresh()
  } finally {
    generating.value = false
  }
}

async function patchEntry(entryId: number, body: Record<string, unknown>) {
  const res = await $fetch<ApiResponse<unknown>>(`/api/meets/${meetId.value}/entries/${entryId}`, {
    method: "PATCH",
    credentials: "include",
    ignoreResponseError: true,
    body,
  })
  if (!res.success) {
    toast.add({ severity: "error", summary: t("general.error"), detail: msg(res), life: 5000 })
  }
  return res.success
}

async function onCellEdit(event: { data: MeetEntryWithAthlete; newValue: unknown; field: string }) {
  if (roster.value?.resultsImported) return
  const ok = await patchEntry(event.data.entryId, { [event.field]: event.newValue })
  if (ok) await refresh()
}

const bulk = reactive({ platform: "", session: "", flight: "" })
const assigning = ref(false)

async function bulkAssign() {
  assigning.value = true
  try {
    const body: Record<string, unknown> = { entryIds: selected.value.map((entry) => entry.entryId) }
    if (bulk.platform) body.platform = bulk.platform
    if (bulk.session) body.session = bulk.session
    if (bulk.flight) body.flight = bulk.flight

    const res = await $fetch<ApiResponse<{ updated: number }>>(`/api/meets/${meetId.value}/entries/assign`, {
      method: "PATCH",
      credentials: "include",
      ignoreResponseError: true,
      body,
    })
    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 4000,
    })
    if (res.success) {
      selected.value = []
      bulk.platform = bulk.session = bulk.flight = ""
      await refresh()
    }
  } finally {
    assigning.value = false
  }
}

async function withdraw(entry: MeetEntryWithAthlete) {
  if (await patchEntry(entry.entryId, { withdrawn: true })) {
    toast.add({ severity: "success", summary: t("admin.entries.withdrawn"), life: 3000 })
    await refresh()
  }
}

useHead({ title: () => t("admin.entries.title") })
</script>
