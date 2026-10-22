<template>
  <div class="p-4 md:p-8 max-w-4xl">
    <NuxtLinkLocale to="/admin/athletes" class="text-sm text-accent hover:underline">
      ← {{ $t("admin.athletes.title") }}
    </NuxtLinkLocale>

    <h1 class="mt-2 font-display text-3xl font-extrabold uppercase">{{ form.fullName }}</h1>
    <p class="text-sm text-muted-color font-mono mb-6">{{ vpfId }}</p>

    <form class="space-y-6" @submit.prevent="save">
      <section class="rounded-md border border-surface-200 p-4 md:p-5 space-y-4">
        <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.athletes.sectionIdentity") }}</h2>
        <Message severity="secondary" size="small" variant="simple">{{ $t("admin.athletes.identityHint") }}</Message>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppField v-slot="f" :label="$t('general.name')">
            <InputText :id="f.id" v-model="form.fullName" />
          </AppField>
          <AppField v-slot="f" :label="$t('general.yearOfBirth')">
            <InputNumber v-model="form.dob" :input-id="f.id" :use-grouping="false" :min="1900" :max="2200" />
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.nationalId')">
            <InputText :id="f.id" v-model="form.nationalId" />
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.nationality')">
            <InputText :id="f.id" v-model="form.nationality" />
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.phone')">
            <InputText :id="f.id" v-model="form.phoneNumber" />
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.email')">
            <InputText :id="f.id" v-model="form.email" />
            <small v-if="emailChanged" class="text-warn">{{ $t("admin.athletes.emailChangeHint") }}</small>
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.address')" class="md:col-span-2">
            <InputText :id="f.id" v-model="form.address" />
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.slug')" class="md:col-span-2">
            <InputText :id="f.id" v-model="form.slug" class="font-mono" />
            <small v-if="slugChanged" class="text-warn">{{ $t("admin.athletes.slugChangeHint") }}</small>
          </AppField>
        </div>
      </section>

      <section class="rounded-md border border-surface-200 p-4 md:p-5 space-y-4">
        <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.athletes.sectionMembership") }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppField v-slot="f" :label="$t('admin.athletes.vpfExpiry')">
            <DatePicker v-model="vpfExpiry" :input-id="f.id" date-format="dd/mm/yy" show-icon show-button-bar />
          </AppField>
          <AppField v-slot="f" :label="$t('admin.athletes.vipExpiry')">
            <DatePicker v-model="vipExpiry" :input-id="f.id" date-format="dd/mm/yy" show-icon show-button-bar />
            <!-- Clearing this revokes VIP (`isVipActive`); permanent VIP = a far-future date. -->
            <small class="text-warn">{{ $t("admin.athletes.vipNullHint") }}</small>
          </AppField>
        </div>
      </section>

      <section class="rounded-md border border-surface-200 p-4 md:p-5 space-y-4">
        <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.athletes.sectionRack") }}</h2>
        <p class="text-sm text-muted-color">{{ $t("admin.athletes.rackHint") }}</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AppField v-for="pin in rackPins" :key="pin.field" v-slot="f" :label="$t(pin.label)">
            <InputNumber v-model="form[pin.field]" :input-id="f.id" :use-grouping="false" :min="0" />
          </AppField>
        </div>
      </section>

      <section class="rounded-md border border-surface-200 p-4 md:p-5 space-y-4">
        <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase">{{ $t("admin.athletes.sectionSanctions") }}</h2>

        <div class="flex items-center gap-2">
          <ToggleSwitch v-model="form.drugViolate" input-id="doping" />
          <label for="doping" class="text-sm text-color">{{ $t("admin.athletes.dopingBan") }}</label>
        </div>
        <Message v-if="dopingChanged" severity="warn" size="small">
          {{ $t("admin.athletes.dopingWarning") }}
        </Message>
        <AppField v-if="dopingChanged" v-slot="f" :label="$t('admin.common.reason')">
            <InputText :id="f.id" v-model="drugViolateReason" required />
        </AppField>

        <AppField v-slot="f" :label="$t('admin.athletes.role')">
            <Select v-model="form.role" :aria-labelledby="f.labelId" :options="roleOptions" option-label="label" option-value="value" class="w-48" />
        </AppField>

        <AppField v-slot="f" :label="$t('admin.athletes.notes')">
            <Textarea :id="f.id" v-model="form.notes" rows="3" auto-resize />
          <small class="text-muted-color">{{ $t("admin.athletes.notesHint") }}</small>
        </AppField>
      </section>

      <Button type="submit" :label="$t('admin.common.save')" :loading="saving" :disabled="dopingChanged && !drugViolateReason" />
    </form>

    <!-- Violations for this athlete, with the consequence spelled out. -->
    <section class="mt-10 rounded-md border border-surface-200 p-4 md:p-5">
      <h2 class="font-display text-lg font-bold tracking-[0.04em] uppercase mb-1">{{ $t("admin.violations.title") }}</h2>
      <p class="text-sm mb-4" :class="outcomeClass">{{ outcomeText }}</p>

      <DataTable v-if="violations.length" :value="violations" size="small" class="border border-surface-200">
        <Column :header="$t('admin.violations.note')" field="note" />
        <Column :header="$t('admin.violations.expireYear')">
          <template #body="{ data }">
            {{ data.expireYear ?? $t("admin.violations.never") }}
          </template>
        </Column>
        <Column :header="$t('general.date')">
          <template #body="{ data }">{{ formatDateDMY(data.createdAt) }}</template>
        </Column>
      </DataTable>
      <p v-else class="text-sm text-muted-color">{{ $t("admin.violations.none") }}</p>

      <Button v-slot="slotProps" as-child size="small" text><NuxtLinkLocale to="/admin/violations" :class="slotProps.class">{{ $t('admin.violations.manage') }}</NuxtLinkLocale></Button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { formatDateDMY } from "~/lib/domain/date"
import type { ApiResponse } from "~/types/api"
import type { AthleteRecordData, UserPrivate } from "~/types/users"
import type { Role } from "~/types/union-types"
import type { UserViolationWithUser } from "~/types/violations"

definePageMeta({ layout: "admin", middleware: "admin" })

const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const msg = useApiMessage()

const vpfId = computed(() => String(route.params.id))

const rackPins = [
  { field: "squatRackPin", label: "admin.athletes.squatRackPin" },
  { field: "benchRackPin", label: "admin.athletes.benchRackPin" },
  { field: "benchSafetyPin", label: "admin.athletes.benchSafetyPin" },
  { field: "benchFootBlock", label: "admin.athletes.benchFootBlock" },
] as const

const form = reactive({
  fullName: "",
  dob: null as number | null,
  nationalId: "" as string | null,
  nationality: "" as string | null,
  phoneNumber: "" as string | null,
  email: "" as string | null,
  address: "" as string | null,
  slug: "" as string | null,
  squatRackPin: 0 as number | null,
  benchRackPin: 0 as number | null,
  benchSafetyPin: 0 as number | null,
  benchFootBlock: 0 as number | null,
  drugViolate: false,
  role: "user" as Role,
  notes: "" as string | null,
})

const original = reactive({ email: "" as string | null, slug: "" as string | null, drugViolate: false })
const vpfExpiry = ref<Date | null>(null)
const vipExpiry = ref<Date | null>(null)
const drugViolateReason = ref("")

const roleOptions = computed(() => [
  { label: t("admin.athletes.roleUser"), value: "user" },
  { label: t("admin.athletes.roleAdmin"), value: "admin" },
])

function toIsoDate(date: Date | null) {
  if (!date) return null
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function fromIsoDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`) : null
}

const detail = await $fetch<ApiResponse<AthleteRecordData>>(`/api/athletes/${vpfId.value}`, {
  credentials: "include",
  ignoreResponseError: true,
})

/**
 * The `scope` check is not a formality. This form reads and writes back private
 * columns, and the server answers publicly to a caller it does not consider an
 * admin — an expired session, a revoked role. Without the check those columns
 * would be `undefined` here and get saved as blanks over real data.
 */
if (detail.success && detail.data.scope === "private") {
  const athlete = detail.data.athlete
  Object.assign(form, {
    fullName: athlete.fullName,
    dob: athlete.dob,
    nationalId: athlete.nationalId,
    nationality: athlete.nationality,
    phoneNumber: athlete.phoneNumber,
    email: athlete.email,
    address: athlete.address,
    slug: athlete.slug,
    squatRackPin: athlete.squatRackPin,
    benchRackPin: athlete.benchRackPin,
    benchSafetyPin: athlete.benchSafetyPin,
    benchFootBlock: athlete.benchFootBlock,
    drugViolate: athlete.drugViolate ?? false,
    role: athlete.role,
    notes: athlete.notes,
  })
  Object.assign(original, { email: athlete.email, slug: athlete.slug, drugViolate: athlete.drugViolate ?? false })
  vpfExpiry.value = fromIsoDate(athlete.vpfMembershipExpiresAt)
  vipExpiry.value = fromIsoDate(athlete.vipMembershipExpiresAt)
}

const emailChanged = computed(() => form.email !== original.email)
const slugChanged = computed(() => form.slug !== original.slug)
const dopingChanged = computed(() => form.drugViolate !== original.drugViolate)

const saving = ref(false)

async function save() {
  saving.value = true
  try {
    const res = await $fetch<ApiResponse<UserPrivate>>(`/api/athletes/${vpfId.value}`, {
      method: "PATCH",
      credentials: "include",
      ignoreResponseError: true,
      body: {
        ...form,
        vpfMembershipExpiresAt: toIsoDate(vpfExpiry.value),
        vipMembershipExpiresAt: toIsoDate(vipExpiry.value),
        ...(dopingChanged.value ? { drugViolateReason: drugViolateReason.value } : {}),
      },
    })

    toast.add({
      severity: res.success ? "success" : "error",
      summary: t(res.success ? "general.success" : "general.error"),
      detail: msg(res),
      life: 4000,
    })

    if (res.success) {
      Object.assign(original, { email: form.email, slug: form.slug, drugViolate: form.drugViolate })
      drugViolateReason.value = ""
    }
  } finally {
    saving.value = false
  }
}

const violations = ref<UserViolationWithUser[]>([])

const violationLevel = computed(() => violations.value[0]?.level ?? 0)
const outcomeClass = computed(() =>
  violationLevel.value >= 2 ? "text-red-500" : violationLevel.value === 1 ? "text-amber-500" : "text-surface-500")
const outcomeText = computed(() => {
  if (violationLevel.value >= 2) return t("admin.violations.outcomeBlocked", { level: violationLevel.value })
  if (violationLevel.value === 1) return t("admin.violations.outcomePledge")
  return t("admin.violations.outcomeOk")
})

onMounted(async () => {
  const res = await $fetch<ApiResponse<UserViolationWithUser[]>>("/api/violations", {
    query: { vpfId: vpfId.value },
    credentials: "include",
    ignoreResponseError: true,
  })
  violations.value = res.success ? res.data : []
})

useHead({ title: () => form.fullName || t("admin.athletes.title") })
</script>
