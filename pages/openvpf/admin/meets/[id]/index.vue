<template>
  <div class="p-4 md:p-8 max-w-4xl">
    <NuxtLinkLocale to="/openvpf/admin/meets" class="text-sm text-primary hover:underline">
      ← {{ $t("admin.meets.title") }}
    </NuxtLinkLocale>

    <h1 class="text-2xl font-bold mt-2 mb-6 text-surface-900 dark:text-surface-0">
      {{ isNew ? $t("admin.meets.create") : form.meetName }}
    </h1>

    <form class="space-y-6" @submit.prevent="save">
      <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 md:p-5 space-y-4">
        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ $t("admin.meets.sectionBasics") }}</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label for="meetName" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.meets.name") }}</label>
            <InputText id="meetName" v-model="form.meetName" required @blur="suggestSlug" />
          </div>

          <div class="flex flex-col gap-1">
            <label for="meetSlug" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.meets.slug") }}</label>
            <InputText id="meetSlug" v-model="form.meetSlug" class="font-mono" />
            <small class="text-surface-500">{{ $t("admin.meets.slugHint") }}</small>
          </div>

          <div class="flex flex-col gap-1">
            <label for="city" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.meets.city") }}</label>
            <InputText id="city" v-model="form.city" />
          </div>

          <div class="flex flex-col gap-1">
            <label for="type" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.meets.type") }}</label>
            <Select id="type" v-model="form.type" :options="typeOptions" option-label="label" option-value="value" show-clear />
          </div>

          <div class="flex flex-col gap-1 md:col-span-2">
            <label for="mediaLink" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.meets.mediaLink") }}</label>
            <InputText id="mediaLink" v-model="form.mediaLink" />
          </div>
        </div>
      </section>

      <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 md:p-5 space-y-4">
        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ $t("admin.meets.sectionDates") }}</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.meets.hostDate") }}</label>
            <DatePicker v-model="hostDate" date-format="dd/mm/yy" show-icon show-button-bar @update:model-value="syncSystemYear" />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.meets.startRegistration") }}</label>
            <DatePicker v-model="startRegistration" date-format="dd/mm/yy" show-icon show-button-bar />
            <small class="text-surface-500">{{ $t("admin.meets.openEndedStart") }}</small>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.meets.closeRegistration") }}</label>
            <DatePicker v-model="closeRegistration" date-format="dd/mm/yy" show-icon show-button-bar />
            <small class="text-surface-500">{{ $t("admin.meets.openEndedClose") }}</small>
          </div>

          <div class="flex flex-col gap-1">
            <label for="systemYear" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.meets.systemYear") }}</label>
            <InputNumber id="systemYear" v-model="form.systemYear" :use-grouping="false" :min="1900" :max="2200" />
            <small class="text-surface-500">{{ $t("admin.meets.systemYearHint") }}</small>
          </div>
        </div>
      </section>

      <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 md:p-5 space-y-4">
        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ $t("admin.meets.sectionEntry") }}</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label for="entryFee" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.meets.entryFee") }}</label>
            <InputNumber id="entryFee" v-model="form.entryFee" :min="0" :step="50000" suffix=" ₫" />
            <small class="text-surface-500">{{ $t("admin.meets.entryFeeHint") }}</small>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <ToggleSwitch v-model="published" input-id="published" />
            <label for="published" class="text-sm text-surface-700 dark:text-surface-200">{{ $t("admin.meets.publish") }}</label>
          </div>
          <div class="flex items-center gap-2">
            <ToggleSwitch v-model="form.allowGuestRegistration" input-id="guests" />
            <label for="guests" class="text-sm text-surface-700 dark:text-surface-200">{{ $t("admin.meets.allowGuests") }}</label>
          </div>
          <div class="flex items-center gap-2">
            <ToggleSwitch v-model="form.allowSpotterRegistration" input-id="spotters" />
            <label for="spotters" class="text-sm text-surface-700 dark:text-surface-200">{{ $t("admin.meets.allowSpotters") }}</label>
          </div>
          <Message v-if="form.allowSpotterRegistration" severity="secondary" size="small" variant="simple">
            {{ $t("admin.meets.spotterStub") }}
          </Message>
          <div class="flex items-center gap-2">
            <ToggleSwitch v-model="form.legacy" input-id="legacy" :disabled="legacyLocked" />
            <label for="legacy" class="text-sm text-surface-700 dark:text-surface-200">{{ $t("admin.meets.legacyFlag") }}</label>
          </div>
          <Message v-if="legacyLocked" severity="warn" size="small" variant="simple">
            {{ $t("admin.meets.legacyLocked") }}
          </Message>
        </div>
      </section>

      <div class="flex flex-wrap gap-2">
        <Button type="submit" :label="$t('admin.meets.save')" :loading="saving" />
        <Button
          v-if="!isNew"
          type="button"
          severity="secondary"
          outlined
          icon="pi pi-copy"
          :label="$t('admin.meets.clone')"
          @click="cloneDialog = true"
        />
        <NuxtLinkLocale v-if="!isNew" :to="`/openvpf/admin/meets/${meetId}/entries`">
          <Button type="button" text :label="$t('admin.meets.entries')" />
        </NuxtLinkLocale>
        <NuxtLinkLocale v-if="!isNew && !form.legacy" :to="`/openvpf/admin/meets/${meetId}/results`">
          <Button type="button" text :label="$t('admin.meets.results')" />
        </NuxtLinkLocale>
        <div class="flex-1" />
        <Button
          v-if="!isNew"
          type="button"
          severity="danger"
          outlined
          icon="pi pi-trash"
          :label="$t('admin.meets.delete')"
          @click="deleteDialog = true"
        />
      </div>
    </form>

    <!-- Ban list (§5.3): meet-scoped, so it lives here rather than on a global screen. -->
    <section v-if="!isNew" class="mt-10 rounded-lg border border-surface-200 dark:border-surface-700 p-4 md:p-5">
      <h2 class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ $t("admin.banList.title") }}</h2>
      <p class="text-sm text-surface-600 dark:text-surface-300 mb-4">{{ $t("admin.banList.subtitle") }}</p>

      <div class="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3 items-end mb-4">
        <div class="flex flex-col gap-1">
          <label for="banVpfId" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.banList.athlete") }}</label>
          <InputText id="banVpfId" v-model="banForm.vpfId" placeholder="VPF000123" />
        </div>
        <div class="flex flex-col gap-1">
          <label for="banReason" class="text-sm text-surface-600 dark:text-surface-300">{{ $t("admin.banList.reason") }}</label>
          <InputText id="banReason" v-model="banForm.reason" :placeholder="$t('admin.banList.reasonPlaceholder')" />
        </div>
        <Button :label="$t('admin.banList.add')" :loading="banSaving" @click="addBan" />
      </div>

      <!--
        The reason is shown to the athlete verbatim, so the admin is authoring
        public-facing copy inside a data field. Preview it with the same i18n key
        the registration wizard uses, so the two can never drift.
      -->
      <Message v-if="banForm.reason" severity="info" size="small" class="mb-4">
        <span class="text-sm">{{ banPreview }}</span>
      </Message>

      <DataTable v-if="bans.length" :value="bans" size="small" class="border border-surface-200 dark:border-surface-700">
        <Column :header="$t('admin.banList.athlete')">
          <template #body="{ data }">
            <div class="font-medium">{{ data.userName }}</div>
            <div class="text-xs text-surface-500">{{ data.vpfId }}</div>
          </template>
        </Column>
        <Column :header="$t('admin.banList.reason')" field="reason" />
        <Column>
          <template #body="{ data }">
            <Button size="small" text severity="danger" :label="$t('admin.banList.remove')" @click="removeBan(data.vpfId)" />
          </template>
        </Column>
      </DataTable>
      <p v-else class="text-sm text-surface-500">{{ $t("admin.banList.empty") }}</p>
    </section>

    <Dialog v-model:visible="cloneDialog" modal :header="$t('admin.meets.cloneTitle')" class="w-full max-w-md">
      <p class="text-sm text-surface-600 dark:text-surface-300 mb-4">{{ $t("admin.meets.cloneHint") }}</p>
      <div class="space-y-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm">{{ $t("admin.meets.name") }}</label>
          <InputText v-model="cloneForm.meetName" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm">{{ $t("admin.meets.systemYear") }}</label>
          <InputNumber v-model="cloneForm.systemYear" :use-grouping="false" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm">{{ $t("admin.meets.hostDate") }}</label>
          <DatePicker v-model="cloneHostDate" date-format="dd/mm/yy" show-icon show-button-bar />
        </div>
      </div>
      <template #footer>
        <Button text :label="$t('admin.common.cancel')" @click="cloneDialog = false" />
        <Button :label="$t('admin.meets.clone')" :loading="cloning" @click="cloneMeet" />
      </template>
    </Dialog>

    <Dialog v-model:visible="deleteDialog" modal :header="$t('admin.meets.deleteTitle')" class="w-full max-w-md">
      <Message severity="warn" size="small" class="mb-3">{{ $t("admin.meets.deleteWarning") }}</Message>
      <div class="space-y-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm">{{ $t("admin.meets.deleteConfirm", { name: form.meetName }) }}</label>
          <InputText v-model="deleteForm.confirmName" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm">{{ $t("admin.common.reason") }}</label>
          <InputText v-model="deleteForm.reason" />
        </div>
      </div>
      <template #footer>
        <Button text :label="$t('admin.common.cancel')" @click="deleteDialog = false" />
        <Button
          severity="danger"
          :label="$t('admin.meets.delete')"
          :disabled="deleteForm.confirmName !== form.meetName || !deleteForm.reason"
          :loading="deleting"
          @click="deleteMeet"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { slugifyMeetName } from "~/lib/utils/meet-formatters"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"
import type { MeetType } from "~/types/union-types"
import type { CompetitionBanWithUser } from "~/types/violations"

definePageMeta({ layout: "openvpf-admin", middleware: "admin" })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const toast = useToast()
const msg = useApiMessage()

const meetId = computed(() => String(route.params.id))
const isNew = computed(() => meetId.value === "new")

const form = reactive({
  meetName: "",
  meetSlug: "",
  city: "" as string | null,
  type: null as MeetType | null,
  mediaLink: "" as string | null,
  systemYear: new Date().getFullYear(),
  entryFee: null as number | null,
  allowGuestRegistration: true,
  allowSpotterRegistration: true,
  legacy: false,
})

const published = ref(false)
const hostDate = ref<Date | null>(null)
const startRegistration = ref<Date | null>(null)
const closeRegistration = ref<Date | null>(null)
const legacyLocked = ref(false)

const typeOptions = computed(() => ([
  { label: t("general.meetTypeNational"), value: "national" },
  { label: t("general.meetTypeNationalQualifier"), value: "national_qualifier" },
  { label: t("general.meetTypeAmateur"), value: "amateur" },
  { label: t("general.meetTypeProfessional"), value: "professional" },
  { label: t("general.meetTypeOther"), value: "other" },
]))

/** The API takes YYYY-MM-DD; read the local parts so the picker's day is kept. */
function toIsoDate(date: Date | null) {
  if (!date) return null
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function fromIsoDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`) : null
}

if (!isNew.value) {
  const res = await $fetch<ApiResponse<{ meet: MeetPublic }>>(`/api/meets/${meetId.value}`, {
    credentials: "include",
    ignoreResponseError: true,
  })
  if (res.success) {
    const meet = res.data.meet
    Object.assign(form, {
      meetName: meet.meetName,
      meetSlug: meet.meetSlug,
      city: meet.city,
      type: meet.type,
      mediaLink: meet.mediaLink,
      systemYear: meet.systemYear,
      entryFee: meet.entryFee,
      allowGuestRegistration: meet.allowGuestRegistration ?? true,
      allowSpotterRegistration: meet.allowSpotterRegistration ?? true,
      legacy: meet.legacy ?? false,
    })
    published.value = !meet.hidden
    hostDate.value = fromIsoDate(meet.hostDate)
    startRegistration.value = fromIsoDate(meet.startRegistration)
    closeRegistration.value = fromIsoDate(meet.closeRegistration)
    // `legacy` picks which table backs the meet, so it is immutable once results exist.
    legacyLocked.value = (res.data as { results?: unknown[] }).results?.length ? true : false
  }
}

function suggestSlug() {
  if (!form.meetSlug && form.meetName) form.meetSlug = slugifyMeetName(form.meetName)
}

/** The system year defaults from the host date but stays editable (§2). */
function syncSystemYear() {
  if (hostDate.value && isNew.value) form.systemYear = hostDate.value.getFullYear()
}

const saving = ref(false)

async function save() {
  saving.value = true
  try {
    const body = {
      ...form,
      city: form.city || null,
      mediaLink: form.mediaLink || null,
      meetSlug: form.meetSlug || undefined,
      hidden: !published.value,
      hostDate: toIsoDate(hostDate.value),
      startRegistration: toIsoDate(startRegistration.value),
      closeRegistration: toIsoDate(closeRegistration.value),
    }

    const res = await $fetch<ApiResponse<MeetPublic>>(
      isNew.value ? "/api/meets" : `/api/meets/${meetId.value}`,
      {
        method: isNew.value ? "POST" : "PATCH",
        credentials: "include",
        ignoreResponseError: true,
        body,
      },
    )

    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 4000,
    })

    if (res.success && isNew.value) {
      router.replace(localePath(`/openvpf/admin/meets/${res.data.meetId}`))
    }
  } finally {
    saving.value = false
  }
}

const cloneDialog = ref(false)
const cloning = ref(false)
const cloneHostDate = ref<Date | null>(null)
const cloneForm = reactive({ meetName: "", systemYear: new Date().getFullYear() + 1 })

async function cloneMeet() {
  cloning.value = true
  try {
    const res = await $fetch<ApiResponse<MeetPublic>>(`/api/meets/${meetId.value}/clone`, {
      method: "POST",
      credentials: "include",
      ignoreResponseError: true,
      body: {
        meetName: cloneForm.meetName,
        systemYear: cloneForm.systemYear,
        hostDate: toIsoDate(cloneHostDate.value),
      },
    })
    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 5000,
    })
    if (res.success) {
      cloneDialog.value = false
      router.push(localePath(`/openvpf/admin/meets/${res.data.meetId}`))
    }
  } finally {
    cloning.value = false
  }
}

const deleteDialog = ref(false)
const deleting = ref(false)
const deleteForm = reactive({ confirmName: "", reason: "" })

async function deleteMeet() {
  deleting.value = true
  try {
    const res = await $fetch<ApiResponse<{ meetId: number }>>(`/api/meets/${meetId.value}`, {
      method: "DELETE",
      credentials: "include",
      ignoreResponseError: true,
      body: { ...deleteForm },
    })
    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 5000,
    })
    if (res.success) router.push(localePath("/openvpf/admin/meets"))
  } finally {
    deleting.value = false
    deleteDialog.value = false
  }
}

// ---- Ban list ----
const bans = ref<CompetitionBanWithUser[]>([])
const banForm = reactive({ vpfId: "", reason: "" })
const banSaving = ref(false)

const banPreview = computed(() =>
  t("competitionRegistration.blockedCompetitionBan", {
    meet: form.meetName,
    reason: banForm.reason,
  }))

async function loadBans() {
  if (isNew.value) return
  const res = await $fetch<ApiResponse<CompetitionBanWithUser[]>>(`/api/meets/${meetId.value}/ban-list`, {
    credentials: "include",
    ignoreResponseError: true,
  })
  bans.value = res.success ? res.data : []
}

async function addBan() {
  banSaving.value = true
  try {
    const res = await $fetch<ApiResponse<CompetitionBanWithUser>>(`/api/meets/${meetId.value}/ban-list`, {
      method: "POST",
      credentials: "include",
      ignoreResponseError: true,
      body: { vpfId: banForm.vpfId.trim(), reason: banForm.reason.trim() },
    })
    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 4000,
    })
    if (res.success) {
      banForm.vpfId = ""
      banForm.reason = ""
      await loadBans()
    }
  } finally {
    banSaving.value = false
  }
}

async function removeBan(vpfId: string) {
  const res = await $fetch<ApiResponse<unknown>>(`/api/meets/${meetId.value}/ban-list/${vpfId}`, {
    method: "DELETE",
    credentials: "include",
    ignoreResponseError: true,
  })
  toast.add({
    severity: res.success ? "success" : "error",
    summary: t(res.success ? "general.success" : "general.error"),
    detail: msg(res),
    life: 4000,
  })
  if (res.success) await loadBans()
}

onMounted(loadBans)

useHead({ title: () => (isNew.value ? t("admin.meets.create") : form.meetName) })
</script>
