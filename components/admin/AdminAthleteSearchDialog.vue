<template>
  <Dialog
    :visible="visible"
    modal
    :header="$t(multiple ? 'admin.athleteSearch.titleMany' : 'admin.athleteSearch.title')"
    class="w-[min(60rem,96vw)]"
    @update:visible="visible = $event"
    @show="onShow"
    @after-hide="search.reset()"
  >
    <IconField class="mb-3">
      <InputIcon><AppIcon name="lucide:search" class="size-4" /></InputIcon>
      <InputText
        :id="inputId"
        v-model="search.query"
        :placeholder="$t('admin.athleteSearch.placeholder')"
        :aria-label="$t('admin.athleteSearch.placeholder')"
        class="w-full"
        autocomplete="off"
        @keydown.enter.prevent="pickOnlyResult"
      />
    </IconField>

    <!-- What is already chosen stays visible while the admin searches for the next one. -->
    <div v-if="multiple && chosen.length" class="mb-3 flex flex-wrap items-center gap-1.5">
      <span class="text-sm text-muted-color">{{ $t("admin.athleteSearch.selected", { count: chosen.length }) }}</span>
      <span
        v-for="athlete in chosen"
        :key="athlete.userId"
        class="inline-flex items-center gap-1 rounded border border-surface-300 bg-surface-100 py-0.5 pr-1 pl-2 text-sm"
      >
        {{ athlete.fullName }}
        <button
          type="button"
          class="grid size-6 cursor-pointer place-items-center rounded hover:bg-surface-200"
          :aria-label="$t('admin.athleteSearch.remove', { name: athlete.fullName })"
          @click="toggle(athlete)"
        >
          <AppIcon name="lucide:x" class="size-3.5" />
        </button>
      </span>
    </div>

    <p v-if="!search.query.trim()" class="py-10 text-center text-sm text-muted-color">{{ $t("admin.athleteSearch.hint") }}</p>
    <div v-else-if="search.pending && !search.results.length" class="flex justify-center py-10"><ProgressSpinner /></div>
    <p v-else-if="!search.results.length" class="py-10 text-center text-sm text-muted-color">{{ $t("admin.athleteSearch.none") }}</p>
    <template v-else>
      <!--
        The table's own selection drives the checkboxes and highlight, but the
        list is kept here through its events: "select all" then adds or removes
        only the rows on screen instead of replacing picks from earlier searches.
      -->
      <DataTable
        :value="search.results"
        data-key="userId"
        size="small"
        scrollable
        scroll-height="24rem"
        :selection-mode="multiple ? 'multiple' : 'single'"
        :selection="multiple ? chosen : null"
        :meta-key-selection="false"
        class="border border-surface-200"
        :class="{ 'opacity-60': search.pending }"
        @row-select="pick($event.data as UserPrivate)"
        @row-unselect="toggle($event.data as UserPrivate)"
        @row-select-all="add($event.data as UserPrivate[])"
        @row-unselect-all="remove(search.results)"
      >
        <Column v-if="multiple" selection-mode="multiple" header-style="width: 3rem" />
        <Column :header="$t('general.name')">
          <template #body="{ data }">
            <span class="font-medium" :class="!multiple && 'text-accent'">{{ data.fullName }}</span>
            <div class="font-mono text-xs text-muted-color">{{ data.vpfId }}</div>
          </template>
        </Column>
        <Column :header="$t('general.yearOfBirth')" field="dob" />
        <Column :header="$t('admin.athleteSearch.contact')">
          <template #body="{ data }">
            <div class="text-sm break-all">{{ data.email ?? "—" }}</div>
            <div v-if="data.phoneNumber" class="text-xs text-muted-color tabular-nums">{{ data.phoneNumber }}</div>
          </template>
        </Column>
        <Column :header="$t('admin.athletes.nationalId')">
          <template #body="{ data }"><span class="tabular-nums">{{ data.nationalId ?? "—" }}</span></template>
        </Column>
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
      <p v-if="search.total > search.results.length" class="mt-2 text-xs text-muted-color">
        {{ $t("admin.athleteSearch.more", { shown: search.results.length, total: search.total }) }}
      </p>
    </template>

    <template v-if="multiple" #footer>
      <Button text :label="$t('admin.common.cancel')" @click="visible = false" />
      <Button :label="$t('admin.athleteSearch.confirm', { count: chosen.length })" :disabled="!chosen.length" @click="confirm" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { formatDateDMY, isPastDate } from "~/lib/domain/date"
import type { UserPrivate } from "~/types/users"

/**
 * Find athletes by name, VPF id, email or national id and pick one — or, with
 * `multiple`, several, keeping the picks across searches. A single pick
 * returns as soon as it is clicked; several are confirmed from the footer.
 */
const props = defineProps<{
  multiple?: boolean
  /** Already chosen athletes, so reopening the dialog continues the same selection. */
  selected?: UserPrivate[]
}>()
const emit = defineEmits<{ select: [athletes: UserPrivate[]] }>()
const visible = defineModel<boolean>("visible", { required: true })

const search = useAthleteSearch()
const chosen = ref<UserPrivate[]>([])
const inputId = useId()

function onShow() {
  chosen.value = [...(props.selected ?? [])]
  // PrimeVue focuses the close button first; the search box is what the admin wants.
  nextTick(() => document.getElementById(inputId)?.focus())
}

const isChosen = (athlete: UserPrivate) => chosen.value.some((a) => a.userId === athlete.userId)

function add(athletes: UserPrivate[]) {
  chosen.value = [...chosen.value, ...athletes.filter((athlete) => !isChosen(athlete))]
}

function remove(athletes: UserPrivate[]) {
  const ids = new Set(athletes.map((athlete) => athlete.userId))
  chosen.value = chosen.value.filter((athlete) => !ids.has(athlete.userId))
}

function toggle(athlete: UserPrivate) {
  if (isChosen(athlete)) remove([athlete])
  else add([athlete])
}

function pick(athlete: UserPrivate) {
  if (props.multiple) return toggle(athlete)
  emit("select", [athlete])
  visible.value = false
}

/** Enter in the search box takes the result when there is exactly one. */
function pickOnlyResult() {
  if (search.results.length === 1 && !search.pending) pick(search.results[0]!)
}

function confirm() {
  emit("select", chosen.value)
  visible.value = false
}
</script>
