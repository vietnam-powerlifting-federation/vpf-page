<template>
  <AdminPage :title="$t('admin.meets.title')" :subtitle="$t('admin.meets.subtitle')">
    <template #actions>
      <Button v-slot="slotProps" as-child><NuxtLinkLocale to="/admin/meets/new" :class="slotProps.class"><AppIcon name="lucide:plus" class="size-4" />{{ $t('admin.meets.create') }}</NuxtLinkLocale></Button>
    </template>

    <div class="mb-4 flex flex-wrap gap-2 items-center">
      <IconField>
        <InputIcon><AppIcon name="lucide:search" class="size-4" /></InputIcon>
        <InputText v-model="meets.search" :placeholder="$t('admin.meets.search')" class="w-64" />
      </IconField>
      <Button outlined severity="secondary" :aria-pressed="meets.showHidden" @click="meets.showHidden = !meets.showHidden">
        <AppIcon :name="meets.showHidden ? 'lucide:eye' : 'lucide:eye-off'" class="size-4" />
        {{ meets.showHidden ? $t('admin.meets.showingHidden') : $t('admin.meets.showHidden') }}
      </Button>
      <Button :aria-label="$t('admin.common.refresh')" text severity="secondary" @click="meets.refresh"><AppIcon name="lucide:refresh-cw" class="size-4" /></Button>
    </div>

    <div v-if="meets.pending" class="flex justify-center py-12"><ProgressSpinner /></div>
    <DataTable
      v-else
      :value="meets.filtered"
      striped-rows
      paginator
      :rows="25"
      class="border border-surface-200"
    >
      <Column :header="$t('admin.meets.name')">
        <template #body="{ data }">
          <NuxtLinkLocale :to="`/admin/meets/${data.meetId}`" class="font-medium text-accent hover:underline">
            {{ data.meetName }}
          </NuxtLinkLocale>
          <div class="text-xs text-muted-color font-mono">{{ data.meetSlug }}</div>
        </template>
      </Column>
      <Column :header="$t('admin.meets.hostDate')">
        <template #body="{ data }">{{ formatDateDMY(data.hostDate) }}</template>
      </Column>
      <Column :header="$t('admin.meets.systemYear')" field="systemYear" />
      <Column :header="$t('admin.meets.registration')">
        <template #body="{ data }">
          <span class="text-sm">{{ meets.windowOf(data) }}</span>
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
            <Button v-slot="slotProps" as-child size="small" text><NuxtLinkLocale :to="`/admin/meets/${data.meetId}/entries`" :class="slotProps.class">{{ $t('admin.meets.entries') }}</NuxtLinkLocale></Button>
            <Button v-if="!data.legacy" v-slot="slotProps" as-child size="small" text><NuxtLinkLocale :to="`/admin/meets/${data.meetId}/results`" :class="slotProps.class">{{ $t('admin.meets.results') }}</NuxtLinkLocale></Button>
          </div>
        </template>
      </Column>
    </DataTable>
  </AdminPage>
</template>

<script setup lang="ts">
import { formatDateDMY } from "~/lib/domain/date"

/** Every meet, published or hidden: search, open one to edit, jump to its entries or results, or create a new one. */
const meets = await useAdminMeets()
</script>
