<template>
  <AdminPage :title="$t('admin.violations.title')" :subtitle="$t('admin.violations.subtitle')" width="5xl">
    <form class="mb-8 rounded-md border border-surface-200 p-4 md:p-5 space-y-4" @submit.prevent="violations.record">
      <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.violations.recordTitle") }}</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AppField v-slot="f" :label="$t('admin.violations.athlete')">
          <InputText :id="f.id" v-model="violations.form.vpfId" placeholder="VPF000123" required />
        </AppField>

        <AppField v-slot="f" :label="$t('admin.violations.expireYear')">
          <InputNumber v-model="violations.form.expireYear" :input-id="f.id" :use-grouping="false" :min="1900" :max="2200" show-clear />
          <!-- A blank field here is a permanent sanction, which is not what blank usually implies. -->
          <small class="text-warn">{{ $t("admin.violations.expireYearHint") }}</small>
        </AppField>

        <AppField v-slot="f" :label="$t('admin.violations.note')" class="md:col-span-3">
          <InputText :id="f.id" v-model="violations.form.note" required />
        </AppField>
      </div>

      <div v-if="violations.form.expireYear === null" class="flex items-center gap-2">
        <Checkbox v-model="violations.form.confirmPermanent" input-id="permanent" binary />
        <label for="permanent" class="text-sm text-warn">{{ $t("admin.violations.confirmPermanent") }}</label>
      </div>

      <!--
        Show the resulting level and its consequence as you type: the count-based
        rule is not obvious from a list of rows (§5.1).
      -->
      <Message v-if="violations.impact" :severity="violations.impact.severity" size="small">{{ violations.impact.text }}</Message>

      <Button type="submit" :label="$t('admin.violations.record')" :loading="violations.saving" :disabled="!violations.canRecord" />
    </form>

    <div class="mb-4 flex flex-wrap gap-2 items-center">
      <IconField>
        <InputIcon><AppIcon name="lucide:search" class="size-4" /></InputIcon>
        <InputText v-model="violations.filterVpfId" :placeholder="$t('admin.violations.filterAthlete')" class="w-56" />
      </IconField>
      <div class="flex items-center gap-2">
        <Checkbox v-model="violations.inForceOnly" input-id="inForce" binary />
        <label for="inForce" class="text-sm text-muted-color">{{ $t("admin.violations.inForceOnly") }}</label>
      </div>
      <Button :aria-label="$t('admin.common.refresh')" text severity="secondary" @click="violations.refresh"><AppIcon name="lucide:refresh-cw" class="size-4" /></Button>
    </div>

    <div v-if="violations.pending" class="flex justify-center py-12"><ProgressSpinner /></div>
    <div v-else-if="!violations.rows.length" class="text-muted-color py-8">{{ $t("admin.violations.none") }}</div>
    <DataTable v-else :value="violations.rows" striped-rows class="border border-surface-200">
      <Column :header="$t('admin.violations.athlete')">
        <template #body="{ data }">
          <NuxtLinkLocale :to="`/admin/athletes/${data.vpfId}`" class="font-medium hover:underline">
            {{ data.userName }}
          </NuxtLinkLocale>
          <div class="text-xs text-muted-color font-mono">{{ data.vpfId }}</div>
        </template>
      </Column>
      <Column :header="$t('admin.violations.note')" field="note" />
      <Column :header="$t('admin.violations.expireYear')">
        <template #body="{ data }">
          <span v-if="data.expireYear">{{ data.expireYear }}</span>
          <Tag v-else severity="danger" :value="$t('admin.violations.never')" />
        </template>
      </Column>
      <Column :header="$t('admin.violations.consequence')">
        <template #body="{ data }">
          <Tag :value="`${$t('admin.violations.level')} ${data.level}`" :severity="OUTCOME_SEVERITY[data.outcome as ViolationOutcome]" />
          <div class="text-xs text-muted-color mt-1">{{ $t(`admin.violations.outcomes.${data.outcome}`) }}</div>
        </template>
      </Column>
      <Column :header="$t('general.date')">
        <template #body="{ data }">{{ formatDateDMY(data.createdAt) }}</template>
      </Column>
      <Column>
        <template #body="{ data }">
          <Button size="small" text severity="danger" :label="$t('admin.violations.lift')" @click="violations.openLift(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog :visible="violations.liftOpen" modal :header="$t('admin.violations.liftTitle')" class="w-full max-w-md" @update:visible="violations.liftOpen = $event">
      <p class="text-sm text-muted-color mb-3">{{ $t("admin.violations.liftPrompt") }}</p>
      <AppField v-slot="f" :label="$t('admin.common.reason')">
        <InputText :id="f.id" v-model="violations.liftReason" />
      </AppField>
      <template #footer>
        <Button text :label="$t('admin.common.cancel')" @click="violations.liftOpen = false" />
        <Button severity="danger" :label="$t('admin.violations.lift')" :disabled="!violations.liftReason" :loading="violations.lifting" @click="violations.lift" />
      </template>
    </Dialog>
  </AdminPage>
</template>

<script setup lang="ts">
import { formatDateDMY } from "~/lib/domain/date"
import type { ViolationOutcome } from "~/types/competitions"

const OUTCOME_SEVERITY = { ok: "secondary", pledge: "warn", blocked: "danger" } as const

/** Record a violation, with the consequence previewed as you type, browse those recorded, and lift one. */
const violations = await useAdminViolations()
</script>
