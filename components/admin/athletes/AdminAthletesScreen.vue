<template>
  <AdminPage :title="$t('admin.athletes.title')" :subtitle="$t('admin.athletes.subtitle')">
    <div class="mb-4 flex flex-wrap gap-2 items-center">
      <IconField>
        <InputIcon><AppIcon name="lucide:search" class="size-4" /></InputIcon>
        <InputText v-model="athletes.search" :placeholder="$t('admin.athletes.search')" class="w-72" />
      </IconField>

      <Select
        v-model="athletes.membership"
        :options="athletes.membershipOptions"
        option-label="label"
        option-value="value"
        class="w-48"
        show-clear
        :placeholder="$t('admin.athletes.membership')"
      />

      <MultiSelect
        v-model="athletes.flags"
        :options="athletes.flagOptions"
        option-label="label"
        option-value="value"
        class="w-64"
        :placeholder="$t('admin.athletes.flags')"
      />

      <Button :aria-label="$t('admin.common.refresh')" text severity="secondary" @click="athletes.refresh"><AppIcon name="lucide:refresh-cw" class="size-4" /></Button>
    </div>

    <div v-if="athletes.pending" class="flex justify-center py-12"><ProgressSpinner /></div>
    <DataTable
      v-else
      :value="athletes.rows"
      lazy
      paginator
      :rows="athletes.pageSize"
      :total-records="athletes.total"
      :first="(athletes.page - 1) * athletes.pageSize"
      striped-rows
      class="border border-surface-200"
      @page="athletes.setPage($event.page)"
    >
      <Column :header="$t('general.name')">
        <template #body="{ data }">
          <NuxtLinkLocale
            :to="`/admin/athletes/${data.vpfId}`"
            class="font-medium text-accent hover:underline"
          >
            {{ data.fullName }}
          </NuxtLinkLocale>
          <div class="text-xs text-muted-color font-mono">{{ data.vpfId }}</div>
        </template>
      </Column>
      <Column :header="$t('admin.athletes.email')" field="email" />
      <Column :header="$t('general.yearOfBirth')" field="dob" />
      <Column :header="$t('admin.athletes.membershipExpiry')">
        <template #body="{ data }">
          <span :class="isPastDate(data.vpfMembershipExpiresAt) ? 'text-warn' : ''">
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
  </AdminPage>
</template>

<script setup lang="ts">
import { formatDateDMY, isPastDate } from "~/lib/domain/date"

/** The athletes list: search by name or ID, filter by membership and flags, open one to edit. */
const athletes = await useAdminAthletes()
</script>
