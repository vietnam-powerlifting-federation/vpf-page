<template>
  <div>
    <PageHeader
      :kicker="eligibility?.meet.meetName ?? $t('meets.kicker')"
      :title="$t('competitionRegistration.title')"
      :lede="eligibility ? $t('competitionRegistration.subtitle', { meet: eligibility.meet.meetName }) : undefined"
      compact
    />

    <PageSection class="max-w-3xl">
      <LoadingState v-if="pending" />

      <Message v-else-if="!eligibility" severity="error" :closable="false">{{ $t("competitionRegistration.loadError") }}</Message>

      <template v-else>
        <!-- Reasons registration cannot start, in the order they are checked. -->
        <Message v-if="!eligibility.registrationOpen" severity="warn" :closable="false">
          {{ $t("competitionRegistration.notOpen") }}
        </Message>

        <Message v-else-if="eligibility.alreadyRegistered" severity="info" :closable="false">
          {{ $t("competitionRegistration.alreadyRegistered") }}
          <NuxtLinkLocale to="/profile/payment-history" class="ml-1 font-semibold underline">{{ $t("competitionRegistration.viewInProfile") }}</NuxtLinkLocale>
        </Message>

        <Message v-else-if="!eligibility.emailVerified" severity="warn" :closable="false">
          {{ $t("competitionRegistration.emailNotVerified") }}
          <NuxtLinkLocale to="/verify-email" class="ml-1 font-semibold underline">{{ $t("competitionRegistration.verifyEmail") }}</NuxtLinkLocale>
        </Message>

        <Message v-else-if="eligibility.bans?.blocked" severity="error" :closable="false">
          <p class="font-semibold">{{ $t("competitionRegistration.blockedTitle") }}</p>
          <p class="mt-1">{{ blockMessage }}</p>
        </Message>

        <div v-else class="grid gap-6">
          <StepIndicator :steps="stepLabels" :current="stepIndex" :label="$t('steps.progress')" />

          <Message v-if="eligibility.bans?.violationOutcome === 'pledge'" severity="warn" :closable="false">
            {{ $t("competitionRegistration.pledgeNotice") }}
          </Message>

          <PagePanel ruled>
            <!-- Step 1: identity verification (must be submitted before registering) -->
            <div v-if="step === 'identity'" class="grid gap-5">
              <h2 ref="stepHeading" tabindex="-1" class="font-display text-2xl font-bold uppercase focus:outline-none">{{ $t("competitionRegistration.stepIdentity") }}</h2>
              <Message v-if="identityStatus === 'approved'" severity="success" :closable="false">{{ $t("competitionRegistration.identityApprovedNotice") }}</Message>
              <Message v-else-if="identityStatus === 'pending'" severity="info" :closable="false">{{ $t("competitionRegistration.identityPendingNotice") }}</Message>
              <Message v-else severity="warn" :closable="false">{{ $t("competitionRegistration.identityRequired") }}</Message>

              <VerificationForm @update:status="(s) => (identityStatus = s ?? 'not_submitted')" @submitted="onVerificationSubmitted" />

              <div class="flex justify-end border-t border-surface-200 pt-4">
                <Button :disabled="!canProceedIdentity" @click="goTo('capacity')">
                  {{ $t("competitionRegistration.next") }}
                  <AppIcon name="lucide:arrow-right" class="size-4" />
                </Button>
              </div>
            </div>

            <!-- Step 2: member or guest, and consent -->
            <div v-else-if="step === 'capacity'" class="grid gap-5">
              <h2 ref="stepHeading" tabindex="-1" class="font-display text-2xl font-bold uppercase focus:outline-none">{{ $t("competitionRegistration.capacityLegend") }}</h2>

              <fieldset class="m-0 grid gap-3 border-0 p-0">
                <legend class="sr-only">{{ $t("competitionRegistration.capacityLegend") }}</legend>
                <label
                  v-for="option in capacityOptions"
                  :key="option.value"
                  class="flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors duration-120 ease-snap"
                  :class="form.capacity === option.value ? 'border-accent bg-accent-soft' : 'border-surface-300 hover:bg-surface-100'"
                >
                  <RadioButton v-model="form.capacity" :input-id="`cap-${option.value}`" :value="option.value" class="mt-0.5" />
                  <span>
                    <span class="block font-semibold">{{ option.label }}</span>
                    <span class="block text-sm text-muted-color">{{ option.hint }}</span>
                  </span>
                </label>
              </fieldset>

              <div class="grid gap-3">
                <label v-if="form.capacity === 'member'" class="flex min-h-11 cursor-pointer items-center gap-3">
                  <Checkbox v-model="form.membershipTermsAccepted" binary input-id="terms" />
                  <span>{{ $t("competitionRegistration.membershipTerms") }}</span>
                </label>
                <label class="flex min-h-11 cursor-pointer items-center gap-3">
                  <Checkbox v-model="form.dataConsentAccepted" binary input-id="consent" />
                  <span>{{ $t("competitionRegistration.dataConsent") }}</span>
                </label>
              </div>

              <div class="flex justify-between border-t border-surface-200 pt-4">
                <Button severity="secondary" variant="text" @click="goTo('identity')">
                  <AppIcon name="lucide:arrow-left" class="size-4" />
                  {{ $t("competitionRegistration.back") }}
                </Button>
                <Button :disabled="!canProceedCapacity" @click="goTo('details')">
                  {{ $t("competitionRegistration.next") }}
                  <AppIcon name="lucide:arrow-right" class="size-4" />
                </Button>
              </div>
            </div>

            <!-- Step 3: category and equipment settings -->
            <div v-else-if="step === 'details'" class="grid gap-5">
              <h2 ref="stepHeading" tabindex="-1" class="font-display text-2xl font-bold uppercase focus:outline-none">{{ $t("competitionRegistration.detailsLegend") }}</h2>

              <div class="grid gap-4 sm:grid-cols-3">
                <AppField v-slot="f" :label="$t('competitionRegistration.sportGender')" required>
                  <Select v-model="form.sex" :options="sexOptions" option-label="label" option-value="value" :aria-labelledby="f.labelId" class="w-full" />
                </AppField>
                <AppField v-slot="f" :label="$t('competitionRegistration.weightClass')" required>
                  <Select v-model="form.weightClass" :options="weightClassOptions" option-label="label" option-value="value" :aria-labelledby="f.labelId" class="w-full" />
                </AppField>
                <AppField v-slot="f" :label="$t('competitionRegistration.division')" :hint="form.capacity === 'guest' ? undefined : $t('filters.divisionHint')" required>
                  <p v-if="form.capacity === 'guest'" class="py-2 text-sm text-muted-color">{{ $t("competitionRegistration.guestDivisionNote") }}</p>
                  <Select
                    v-else-if="divisionOptions.length"
                    v-model="form.division"
                    :options="divisionOptions"
                    option-label="label"
                    option-value="value"
                    :aria-labelledby="f.labelId"
                    :aria-describedby="f.describedBy"
                    class="w-full"
                  />
                  <Message v-else severity="warn" :closable="false">{{ $t("competitionRegistration.noDivisions") }}</Message>
                </AppField>
              </div>

              <fieldset class="m-0 grid gap-3 border-0 p-0">
                <legend class="mb-2 p-0 text-sm font-semibold">{{ $t("competitionRegistration.rackPins") }}</legend>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <AppField v-for="pin in rackPins" :key="pin.key" v-slot="f" :label="$t(pin.label)">
                    <InputNumber v-model="form[pin.key]" :input-id="f.id" :min="0" :max="30" show-buttons button-layout="horizontal" class="w-full" input-class="w-full text-center" :increment-button-props="{ 'aria-label': '+' }" :decrement-button-props="{ 'aria-label': '−' }" />
                  </AppField>
                </div>
              </fieldset>

              <AppField
                v-slot="f"
                :label="$t('competitionRegistration.photo')"
                :hint="eligibility.athlete.competitionPhotoUrl ? $t('competitionRegistration.photoCurrent') : $t('competitionRegistration.photoHint')"
              >
                <input
                  :id="f.id"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  :aria-describedby="f.describedBy"
                  class="block w-full text-sm text-muted-color file:mr-3 file:min-h-11 file:cursor-pointer file:rounded file:border file:border-surface-300 file:bg-surface-0 file:px-4 file:font-semibold file:text-color hover:file:bg-surface-100"
                  @change="onPhotoChange"
                >
              </AppField>

              <label class="flex min-h-11 cursor-pointer items-center gap-3">
                <Checkbox v-model="form.mediaPlus" binary input-id="mediaplus" />
                <span>
                  {{ $t("competitionRegistration.mediaPlus") }}
                  <span class="text-muted-color">· {{ formatVnd(eligibility.fees.mediaPlusFee, locale) }}</span>
                </span>
              </label>

              <div class="flex justify-between border-t border-surface-200 pt-4">
                <Button severity="secondary" variant="text" @click="goTo('capacity')">
                  <AppIcon name="lucide:arrow-left" class="size-4" />
                  {{ $t("competitionRegistration.back") }}
                </Button>
                <Button :disabled="!canProceedDetails" @click="goTo('review')">
                  {{ $t("competitionRegistration.next") }}
                  <AppIcon name="lucide:arrow-right" class="size-4" />
                </Button>
              </div>
            </div>

            <!-- Step 4: vouchers, fees and confirm -->
            <div v-else-if="step === 'review'" class="grid gap-5">
              <h2 ref="stepHeading" tabindex="-1" class="font-display text-2xl font-bold uppercase focus:outline-none">{{ $t("competitionRegistration.reviewLegend") }}</h2>

              <div v-if="voucherTypes.length" class="grid gap-4 rounded-md border border-surface-200 bg-surface-50 p-4">
                <div>
                  <h3 class="font-semibold">{{ $t("competitionRegistration.voucherLegend") }}</h3>
                  <p class="text-sm text-muted-color">{{ $t("competitionRegistration.voucherHint") }}</p>
                </div>
                <VoucherPicker
                  v-for="vt in voucherTypes"
                  :key="vt"
                  :model-value="selectedVoucherCodes[vt] ?? null"
                  :type="vt"
                  :vouchers="vouchers"
                  @update:model-value="selectedVoucherCodes[vt] = $event"
                />
              </div>

              <CartSummary :lines="summaryLines" :total="totals.payable" />

              <div class="flex justify-between border-t border-surface-200 pt-4">
                <Button severity="secondary" variant="text" @click="goTo('details')">
                  <AppIcon name="lucide:arrow-left" class="size-4" />
                  {{ $t("competitionRegistration.back") }}
                </Button>
                <Button :label="$t('competitionRegistration.confirm')" :loading="isSubmitting" @click="submit" />
              </div>
            </div>

            <!-- Step 5: bank-transfer QR -->
            <div v-else-if="step === 'payment' && purchase?.qrUrl" class="grid gap-5">
              <h2 ref="stepHeading" tabindex="-1" class="font-display text-2xl font-bold uppercase focus:outline-none">{{ $t("competitionRegistration.stepPayment") }}</h2>
              <QrPayment :ref-code="purchase.refCode" :amount="purchase.amount" :qr-url="purchase.qrUrl" @paid="goTo('done')" @cancelled="goTo('review')" />
            </div>

            <!-- Step 6: done -->
            <div v-else-if="step === 'done' && purchase" class="grid gap-4">
              <h2 ref="stepHeading" tabindex="-1" class="flex items-center gap-2 font-display text-2xl font-bold uppercase focus:outline-none">
                <AppIcon :name="purchase.identityVerified ? 'lucide:circle-check' : 'lucide:clock'" class="size-7" :class="purchase.identityVerified ? 'text-success' : 'text-info'" />
                {{ purchase.identityVerified ? $t("competitionRegistration.confirmedTitle") : $t("competitionRegistration.pendingTitle") }}
              </h2>
              <p>
                {{ purchase.identityVerified
                  ? $t("competitionRegistration.confirmedBody", { meet: eligibility.meet.meetName })
                  : $t("competitionRegistration.pendingBody", { meet: eligibility.meet.meetName }) }}
              </p>
              <Button v-slot="slotProps" as-child class="justify-self-start">
                <NuxtLinkLocale to="/profile/competition-info" :class="slotProps.class">{{ $t("competitionRegistration.viewInProfile") }}</NuxtLinkLocale>
              </Button>
            </div>
          </PagePanel>
        </div>
      </template>
    </PageSection>
  </div>
</template>

<script setup lang="ts">
import { DIVISION_LABEL_KEY, formatVnd, formatWeightClass } from "~/lib/domain/format"
import { computeVoucherTotals } from "~/lib/domain/vouchers"
import type { ApiResponse } from "~/types/api"
import type { RegistrationEligibility, CompetitionRegistrationCreated, RegistrationIdentityState } from "~/types/competitions"
import type { PurchaseType } from "~/types/union-types"
import type { Voucher } from "~/types/vouchers"

definePageMeta({
  layout: "default",
  middleware: "auth",
})

const route = useRoute()
const slug = route.params.slug as string
const { t, locale } = useI18n()
const apiMessage = useApiMessage()
const toast = useToast()

const { data, pending, refresh } = await useFetch<ApiResponse<RegistrationEligibility>>(`/api/meets/${slug}/registrations/me`)

const eligibility = computed<RegistrationEligibility | null>(() => (data.value?.success ? data.value.data : null))

type Step = "identity" | "capacity" | "details" | "review" | "payment" | "done"
const step = ref<Step>("identity")

// Identity verification must be submitted before registering; admin approval is not
// required (an unapproved athlete lands in "submitted / pending review" after payment).
const identityStatus = ref<RegistrationIdentityState>("not_submitted")

async function onVerificationSubmitted() {
  // Re-read eligibility so the submitted dob drives the age-derived division options.
  await refresh()
}
const isSubmitting = ref(false)
const purchase = ref<CompetitionRegistrationCreated | null>(null)
const photoFile = ref<File | null>(null)

const form = reactive({
  capacity: "member" as "member" | "guest",
  membershipTermsAccepted: false,
  dataConsentAccepted: false,
  sex: "male" as "male" | "female",
  weightClass: null as number | null,
  division: null as string | null,
  squatRackPin: 0,
  benchRackPin: 0,
  benchSafetyPin: 0,
  benchFootBlock: 0,
  mediaPlus: false,
})

// Prefill rack pins from the athlete's saved data once eligibility loads.
watch(
  eligibility,
  (e) => {
    if (!e) return
    identityStatus.value = e.identityStatus
    form.squatRackPin = e.athlete.squatRackPin ?? 0
    form.benchRackPin = e.athlete.benchRackPin ?? 0
    form.benchSafetyPin = e.athlete.benchSafetyPin ?? 0
    form.benchFootBlock = e.athlete.benchFootBlock ?? 0
  },
  { immediate: true },
)

const sexOptions = computed(() => [
  { label: t("general.men"), value: "male" },
  { label: t("general.women"), value: "female" },
])

const capacityOptions = computed(() => [
  { value: "member", label: t("competitionRegistration.member"), hint: t("competitionRegistration.memberHint") },
  ...(eligibility.value?.meet.allowGuestRegistration
    ? [{ value: "guest", label: t("competitionRegistration.guest"), hint: t("competitionRegistration.guestHint") }]
    : []),
])

const rackPins = [
  { key: "squatRackPin", label: "competitionRegistration.squatRackPin" },
  { key: "benchRackPin", label: "competitionRegistration.benchRackPin" },
  { key: "benchSafetyPin", label: "competitionRegistration.benchSafetyPin" },
  { key: "benchFootBlock", label: "competitionRegistration.benchFootBlock" },
] as const

/** Move to a step and put focus on its heading, so keyboard and screen-reader users start there. */
const stepHeading = ref<HTMLElement | null>(null)
async function goTo(next: Step) {
  step.value = next
  await nextTick()
  stepHeading.value?.focus()
}

const weightClassOptions = computed(() => {
  const e = eligibility.value
  if (!e) return []
  return e.options.weightClasses[form.sex].map((wc) => ({ label: formatWeightClass(wc, form.sex), value: wc }))
})

const divisionOptions = computed(() => {
  const e = eligibility.value
  if (!e) return []
  return e.options.divisions.map((d) => ({ label: t(DIVISION_LABEL_KEY[d as keyof typeof DIVISION_LABEL_KEY] ?? d), value: d }))
})

// Reset the weight-class choice when the sporting gender changes (classes differ by sex).
watch(
  () => form.sex,
  () => {
    form.weightClass = null
  },
)

const stepLabels = computed(() => [
  t("competitionRegistration.stepIdentity"),
  t("competitionRegistration.stepCapacity"),
  t("competitionRegistration.stepDetails"),
  t("competitionRegistration.stepReview"),
  t("competitionRegistration.stepPayment"),
  t("competitionRegistration.stepDone"),
])
const stepOrder: Step[] = ["identity", "capacity", "details", "review", "payment", "done"]
const stepIndex = computed(() => stepOrder.indexOf(step.value))

// A rejected or never-submitted athlete must (re)submit the form before continuing.
const canProceedIdentity = computed(
  () => identityStatus.value === "approved" || identityStatus.value === "pending",
)
const canProceedCapacity = computed(
  () => form.dataConsentAccepted && (form.capacity === "guest" || form.membershipTermsAccepted),
)
const canProceedDetails = computed(
  () => form.weightClass != null && (form.capacity === "guest" || form.division != null),
)

const fees = computed(() => {
  const e = eligibility.value
  const entryFee = e?.fees.entryFee ?? 0
  const membershipFee = e && form.capacity === "member" && e.athlete.membershipOwed ? e.fees.membershipFee : 0
  const mediaPlusFee = form.mediaPlus ? (e?.fees.mediaPlusFee ?? 0) : 0
  return { entryFee, membershipFee, mediaPlusFee, total: entryFee + membershipFee + mediaPlusFee }
})

const { vouchers } = useAthleteVouchers({ available: true }, `registration-vouchers-${slug}`)
const { typeLabel } = useVoucherDisplay()
const selectedVoucherCodes = reactive<Partial<Record<PurchaseType, string | null>>>({})

/** Only offer a picker for a fee this registration actually owes. */
const voucherTypes = computed<PurchaseType[]>(() => {
  const types: PurchaseType[] = []
  if (fees.value.entryFee > 0) types.push("competition")
  if (fees.value.membershipFee > 0) types.push("vpf_membership")
  return types
})

// Clear a selection whose fee stopped being owed (e.g. switching to guest capacity),
// so a stale code is never submitted.
watch(voucherTypes, (types) => {
  for (const key of Object.keys(selectedVoucherCodes) as PurchaseType[]) {
    if (!types.includes(key)) selectedVoucherCodes[key] = null
  }
})

const appliedVouchers = computed(() =>
  voucherTypes.value
    .map((vt) => vouchers.value.find((v) => v.code === selectedVoucherCodes[vt]))
    .filter((v): v is Voucher => Boolean(v)),
)

/**
 * The live total, computed with the same function the server uses at creation.
 * The server recomputes authoritatively and its number wins.
 */
const totals = computed(() =>
  computeVoucherTotals(
    { competition: fees.value.entryFee, vpf_membership: fees.value.membershipFee },
    appliedVouchers.value,
    fees.value.mediaPlusFee,
  ),
)

const discountedLines = computed(() => totals.value.lines.filter((line) => line.discount > 0))

const summaryLines = computed(() => [
  { key: "entry", label: t("competitionRegistration.entryFee"), amount: fees.value.entryFee },
  ...(fees.value.membershipFee > 0 ? [{ key: "membership", label: t("competitionRegistration.membershipFee"), amount: fees.value.membershipFee }] : []),
  ...discountedLines.value.map((line) => ({ key: `discount-${line.type}`, label: `${t("competitionRegistration.discount")} · ${typeLabel(line.type)}`, amount: line.discount, discount: true })),
  ...(fees.value.mediaPlusFee > 0 ? [{ key: "media", label: t("competitionRegistration.mediaPlusFee"), amount: fees.value.mediaPlusFee }] : []),
])

const blockMessage = computed(() => {
  const e = eligibility.value
  if (!e?.bans) return ""
  if (e.bans.violationOutcome === "blocked") return t("competitionRegistration.blockedViolation")
  if (e.bans.dopingBanned) return t("competitionRegistration.blockedDoping")
  if (e.bans.competitionBanned) {
    return t("competitionRegistration.blockedCompetitionBan", {
      meet: e.meet.meetName,
      reason: e.bans.competitionBanReason ?? "",
    })
  }
  return ""
})

function onPhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  photoFile.value = input.files?.[0] ?? null
}

async function submit() {
  isSubmitting.value = true
  try {
    const fd = new FormData()
    fd.append("capacity", form.capacity)
    fd.append("membershipTermsAccepted", String(form.membershipTermsAccepted))
    fd.append("dataConsentAccepted", String(form.dataConsentAccepted))
    fd.append("sex", form.sex)
    fd.append("weightClass", String(form.weightClass))
    fd.append("division", form.capacity === "guest" ? "guest" : String(form.division))
    fd.append("squatRackPin", String(form.squatRackPin))
    fd.append("benchRackPin", String(form.benchRackPin))
    fd.append("benchSafetyPin", String(form.benchSafetyPin))
    fd.append("benchFootBlock", String(form.benchFootBlock))
    fd.append("mediaPlus", String(form.mediaPlus))
    // Comma-separated: multipart fields arrive as text.
    fd.append("voucherCodes", appliedVouchers.value.map((v) => v.code).join(","))
    if (photoFile.value) fd.append("competitionPhoto", photoFile.value)

    const res = await $fetch<ApiResponse<CompetitionRegistrationCreated>>(`/api/meets/${slug}/registrations`, {
      method: "POST",
      body: fd,
    })

    if (!res.success || !res.data) {
      toast.add({ severity: "error", summary: t("general.updateError"), detail: apiMessage(res) || t("competitionRegistration.submitError"), life: 5000 })
      return
    }

    purchase.value = res.data
    // A fully-discounted registration arrives already active: skip the QR entirely.
    await goTo(res.data.status === "active" ? "done" : "payment")
  } catch {
    toast.add({ severity: "error", summary: t("general.updateError"), detail: t("competitionRegistration.submitError"), life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}

useHead({ title: () => t("competitionRegistration.title") })
</script>
