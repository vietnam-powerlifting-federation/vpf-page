<template>
  <div class="p-4 md:p-8">
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">{{ $t("admin.meets.title") }}</h1>
        <p class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.meets.subtitle") }}</p>
      </div>
      <NuxtLinkLocale to="/openvpf/admin/meets/new">
        <Button icon="pi pi-plus" :label="$t('admin.meets.create')" />
      </NuxtLinkLocale>
    </div>

    <div class="mb-4 flex flex-wrap gap-2 items-center">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" :placeholder="$t('admin.meets.search')" class="w-64" />
      </IconField>
      <Button
        :icon="showHidden ? 'pi pi-eye' : 'pi pi-eye-slash'"
        :label="showHidden ? $t('admin.meets.showingHidden') : $t('admin.meets.showHidden')"
        outlined
        severity="secondary"
        @click="showHidden = !showHidden"
      />
      <Button icon="pi pi-refresh" text severity="secondary" @click="() => refresh()" />
    </div>

    <div v-if="pending" class="flex justify-center py-12"><ProgressSpinner /></div>
    <DataTable
      v-else
      :value="filtered"
      striped-rows
      paginator
      :rows="25"
      class="border border-surface-200 dark:border-surface-700"
    >
      <Column :header="$t('admin.meets.name')">
        <template #body="{ data }">
          <NuxtLinkLocale :to="`/openvpf/admin/meets/${data.meetId}`" class="font-medium text-primary hover:underline">
            {{ data.meetName }}
          </NuxtLinkLocale>
          <div class="text-xs text-surface-500 font-mono">{{ data.meetSlug }}</div>
        </template>
      </Column>
      <Column :header="$t('admin.meets.hostDate')">
        <template #body="{ data }">{{ formatDateDMY(data.hostDate) }}</template>
      </Column>
      <Column :header="$t('admin.meets.systemYear')" field="systemYear" />
      <Column :header="$t('admin.meets.registration')">
        <template #body="{ data }">
          <span class="text-sm">{{ registrationWindow(data) }}</span>
        </template>
      </Column>
      <Column :header="$t('admin.meets.status')">
        <template #body="{ data }">
          <Tag
            :value="data.hidden ? $t('admin.meets.hidden') : $t('admin.meets.published')"
            :severity="data.hidden ? 'secondary' : 'success'"
          />
          <Tag v-if="data.legacy" class="ml-1" :value="$t('admin.meets.legacy')" severity="warn" />
        </template>
      </Column>
      <Column :header="$t('admin.meets.tools')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <NuxtLinkLocale :to="`/openvpf/admin/meets/${data.meetId}/entries`">
              <Button size="small" text :label="$t('admin.meets.entries')" />
            </NuxtLinkLocale>
            <NuxtLinkLocale v-if="!data.legacy" :to="`/openvpf/admin/meets/${data.meetId}/results`">
              <Button size="small" text :label="$t('admin.meets.results')" />
            </NuxtLinkLocale>
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { formatDateDMY } from "~/lib/utils/date"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"

definePageMeta({ layout: "openvpf-admin", middleware: "admin" })

const { t } = useI18n()

const showHidden = ref(true)
const search = ref("")

const { data: response, pending, refresh } = await useFetch<ApiResponse<MeetPublic[]>>("/api/meets", {
  query: computed(() => (showHidden.value ? { includeHidden: "true" } : {})),
  credentials: "include",
  ignoreResponseError: true,
})

const rows = computed(() => (response.value?.success ? response.value.data : []))

// One federation's meets fit comfortably in memory, so the search is client-side.
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return rows.value
  return rows.value.filter((meet) =>
    meet.meetName.toLowerCase().includes(term) || meet.meetSlug.toLowerCase().includes(term))
})

/** A null bound means "open on that side", which an empty date box would not convey. */
function registrationWindow(meet: MeetPublic) {
  const from = meet.startRegistration ? formatDateDMY(meet.startRegistration) : t("admin.meets.noLimit")
  const to = meet.closeRegistration ? formatDateDMY(meet.closeRegistration) : t("admin.meets.noLimit")
  return `${from} → ${to}`
}

useHead({ title: () => t("admin.meets.title") })
</script>
