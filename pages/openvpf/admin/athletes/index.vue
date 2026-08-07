<template>
  <div class="p-4 md:p-8">
    <h1 class="text-2xl font-bold mb-1 text-surface-900 dark:text-surface-0">{{ $t("admin.athletes.title") }}</h1>
    <p class="text-sm text-surface-600 dark:text-surface-300 mb-6">{{ $t("admin.athletes.subtitle") }}</p>

    <div class="mb-4 flex flex-wrap gap-2 items-center">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" :placeholder="$t('admin.athletes.search')" class="w-72" />
      </IconField>

      <Select
        v-model="membership"
        :options="membershipOptions"
        option-label="label"
        option-value="value"
        class="w-48"
        show-clear
        :placeholder="$t('admin.athletes.membership')"
      />

      <MultiSelect
        v-model="flags"
        :options="flagOptions"
        option-label="label"
        option-value="value"
        class="w-64"
        :placeholder="$t('admin.athletes.flags')"
      />

      <Button icon="pi pi-refresh" text severity="secondary" @click="() => refresh()" />
    </div>

    <div v-if="pending" class="flex justify-center py-12"><ProgressSpinner /></div>
    <DataTable
      v-else
      :value="rows"
      lazy
      paginator
      :rows="pageSize"
      :total-records="total"
      :first="(page - 1) * pageSize"
      striped-rows
      class="border border-surface-200 dark:border-surface-700"
      @page="onPage"
    >
      <Column :header="$t('general.name')">
        <template #body="{ data }">
          <NuxtLinkLocale
            :to="`/openvpf/admin/athletes/${data.vpfId}`"
            class="font-medium text-primary hover:underline"
          >
            {{ data.fullName }}
          </NuxtLinkLocale>
          <div class="text-xs text-surface-500 font-mono">{{ data.vpfId }}</div>
        </template>
      </Column>
      <Column :header="$t('admin.athletes.email')" field="email" />
      <Column :header="$t('general.yearOfBirth')" field="dob" />
      <Column :header="$t('admin.athletes.membershipExpiry')">
        <template #body="{ data }">
          <span :class="isLapsed(data.vpfMembershipExpiresAt) ? 'text-amber-500' : ''">
            {{ data.vpfMembershipExpiresAt ? formatDateDMY(data.vpfMembershipExpiresAt) : $t("admin.athletes.noExpiry") }}
          </span>
        </template>
      </Column>
      <Column :header="$t('admin.athletes.status')">
        <template #body="{ data }">
          <div class="flex flex-wrap gap-1">
            <Tag v-if="data.role === 'admin'" :value="$t('admin.athletes.admin')" severity="info" />
            <Tag v-if="data.drugViolate" :value="$t('admin.athletes.doping')" severity="danger" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { formatDateDMY } from "~/lib/utils/date"
import type { ApiResponse } from "~/types/api"
import type { AthleteListPage, UserPrivate } from "~/types/users"

definePageMeta({ layout: "openvpf-admin", middleware: "admin" })

const { t } = useI18n()

const search = ref("")
const membership = ref<"active" | "expired" | null>(null)
const flags = ref<string[]>([])
const page = ref(1)
const pageSize = 25

const membershipOptions = computed(() => [
  { label: t("admin.athletes.membershipActive"), value: "active" },
  { label: t("admin.athletes.membershipExpired"), value: "expired" },
])

const flagOptions = computed(() => [
  { label: t("admin.athletes.identityVerified"), value: "identityVerified" },
  { label: t("admin.athletes.emailVerified"), value: "emailVerified" },
  { label: t("admin.athletes.doping"), value: "drugViolate" },
  { label: t("admin.athletes.admin"), value: "role" },
])

const query = computed(() => ({
  // Lapsed members are the population staff need for renewals, so the admin list
  // shows them unless a membership filter says otherwise (§4.2).
  includeInactive: "true",
  page: String(page.value),
  pageSize: String(pageSize),
  ...(search.value.trim() ? { search: search.value.trim() } : {}),
  ...(membership.value ? { membership: membership.value } : {}),
  ...(flags.value.includes("identityVerified") ? { identityVerified: "true" } : {}),
  ...(flags.value.includes("emailVerified") ? { emailVerified: "true" } : {}),
  ...(flags.value.includes("drugViolate") ? { drugViolate: "true" } : {}),
  ...(flags.value.includes("role") ? { role: "admin" } : {}),
}))

const { data: response, pending, refresh } = await useFetch<ApiResponse<AthleteListPage>>("/api/athletes", {
  query,
  credentials: "include",
  ignoreResponseError: true,
})

const rows = computed(() => (response.value?.success ? response.value.data.items as UserPrivate[] : []))
const total = computed(() => (response.value?.success ? response.value.data.total : 0))

// Any filter change starts from the first page, or the results look empty.
watch([search, membership, flags], () => { page.value = 1 })

function onPage(event: { page: number }) {
  page.value = event.page + 1
}

function isLapsed(expiry: string | null) {
  return Boolean(expiry) && expiry! < new Date().toISOString().slice(0, 10)
}

useHead({ title: () => t("admin.athletes.title") })
</script>
