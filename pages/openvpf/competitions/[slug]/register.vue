<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <div v-if="pending" class="flex justify-center py-16">
      <ProgressSpinner />
    </div>

    <div v-else-if="!eligibility" class="py-8">
      <Message severity="error" :closable="false">{{ $t("competitionRegistration.loadError") }}</Message>
    </div>

    <template v-else>
      <h1 class="text-2xl font-bold text-surface-0 mb-1">{{ $t("competitionRegistration.title") }}</h1>
      <p class="text-surface-400 mb-6">{{ $t("competitionRegistration.subtitle", { meet: eligibility.meet.meetName }) }}</p>

      <!-- Hard gates -->
      <Message v-if="!eligibility.registrationOpen" severity="warn" :closable="false">
        {{ $t("competitionRegistration.notOpen") }}
      </Message>

      <Message v-else-if="eligibility.alreadyRegistered" severity="info" :closable="false">
        {{ $t("competitionRegistration.alreadyRegistered") }}
        <NuxtLinkLocale to="/openvpf/profile/payment-history" class="underline ml-1">
          {{ $t("competitionRegistration.viewInProfile") }}
        </NuxtLinkLocale>
      </Message>

      <Message v-else-if="!eligibility.emailVerified" severity="warn" :closable="false">
        {{ $t("competitionRegistration.emailNotVerified") }}
        <NuxtLinkLocale to="/verify-email" class="underline ml-1">
          {{ $t("competitionRegistration.verifyEmail") }}
        </NuxtLinkLocale>
      </Message>

      <div v-else-if="eligibility.bans?.blocked" class="space-y-3">
        <Message severity="error" :closable="false">
          <div class="font-semibold mb-1">{{ $t("competitionRegistration.blockedTitle") }}</div>
          <div>{{ blockMessage }}</div>
        </Message>
      </div>

      <!-- Wizard -->
      <template v-else>
        <ol class="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-6">
          <li v-for="(s, i) in stepLabels" :key="s" :class="i === stepIndex ? 'text-primary font-semibold' : 'text-surface-500'">
            {{ i + 1 }}. {{ s }}
          </li>
        </ol>

        <Message v-if="eligibility.bans?.violationOutcome === 'pledge'" severity="warn" :closable="false" class="mb-4">
          {{ $t("competitionRegistration.pledgeNotice") }}
        </Message>

        <!-- Step 1: identity verification (mandatory before registering) -->
        <section v-if="step === 'identity'" class="space-y-5">
          <h2 class="text-lg font-semibold text-surface-0">{{ $t("competitionRegistration.stepIdentity") }}</h2>

          <Message v-if="identityStatus === 'approved'" severity="success" :closable="false">
            {{ $t("competitionRegistration.identityApprovedNotice") }}
          </Message>
          <Message v-else-if="identityStatus === 'pending'" severity="info" :closable="false">
            {{ $t("competitionRegistration.identityPendingNotice") }}
          </Message>
          <Message v-else severity="warn" :closable="false">
            {{ $t("competitionRegistration.identityRequired") }}
          </Message>

          <VerificationForm
            @update:status="(s) => (identityStatus = s ?? 'not_submitted')"
            @submitted="onVerificationSubmitted"
          />

          <div class="flex justify-end">
            <Button
              :label="$t('competitionRegistration.next')"
              :disabled="!canProceedIdentity"
              @click="step = 'capacity'"
            />
          </div>
        </section>

        <!-- Step 2: capacity -->
        <section v-else-if="step === 'capacity'" class="space-y-5">
          <h2 class="text-lg font-semibold text-surface-0">{{ $t("competitionRegistration.capacityLegend") }}</h2>

          <div class="space-y-3">
            <label class="flex items-start gap-3 p-3 rounded-lg border border-surface-700 cursor-pointer">
              <RadioButton v-model="form.capacity" input-id="cap-member" value="member" />
              <span>
                <span class="block text-surface-0 font-medium">{{ $t("competitionRegistration.member") }}</span>
                <span class="block text-surface-400 text-sm">{{ $t("competitionRegistration.memberHint") }}</span>
              </span>
            </label>
            <label
              v-if="eligibility.meet.allowGuestRegistration"
              class="flex items-start gap-3 p-3 rounded-lg border border-surface-700 cursor-pointer"
            >
              <RadioButton v-model="form.capacity" input-id="cap-guest" value="guest" />
              <span>
                <span class="block text-surface-0 font-medium">{{ $t("competitionRegistration.guest") }}</span>
                <span class="block text-surface-400 text-sm">{{ $t("competitionRegistration.guestHint") }}</span>
              </span>
            </label>
          </div>

          <div class="space-y-3 pt-2">
            <label v-if="form.capacity === 'member'" class="flex items-center gap-3">
              <Checkbox v-model="form.membershipTermsAccepted" binary input-id="terms" />
              <span class="text-surface-200 text-sm">{{ $t("competitionRegistration.membershipTerms") }}</span>
            </label>
            <label class="flex items-center gap-3">
              <Checkbox v-model="form.dataConsentAccepted" binary input-id="consent" />
              <span class="text-surface-200 text-sm">{{ $t("competitionRegistration.dataConsent") }}</span>
            </label>
          </div>

          <div class="flex justify-between">
            <Button :label="$t('competitionRegistration.back')" text @click="step = 'identity'" />
            <Button :label="$t('competitionRegistration.next')" :disabled="!canProceedCapacity" @click="step = 'details'" />
          </div>
        </section>

        <!-- Step 3: details -->
        <section v-else-if="step === 'details'" class="space-y-5">
          <h2 class="text-lg font-semibold text-surface-0">{{ $t("competitionRegistration.detailsLegend") }}</h2>

          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-surface-300 text-sm mb-1">{{ $t("competitionRegistration.sportGender") }}</label>
              <Select v-model="form.sex" :options="sexOptions" option-label="label" option-value="value" class="w-full" />
            </div>
            <div>
              <label class="block text-surface-300 text-sm mb-1">{{ $t("competitionRegistration.weightClass") }}</label>
              <Select v-model="form.weightClass" :options="weightClassOptions" option-label="label" option-value="value" class="w-full" />
            </div>
            <div>
              <label class="block text-surface-300 text-sm mb-1">{{ $t("competitionRegistration.division") }}</label>
              <div v-if="form.capacity === 'guest'" class="text-surface-400 text-sm py-2">
                {{ $t("competitionRegistration.guestDivisionNote") }}
              </div>
              <Select
                v-else-if="divisionOptions.length"
                v-model="form.division"
                :options="divisionOptions"
                option-label="label"
                option-value="value"
                class="w-full"
              />
              <Message v-else severity="warn" :closable="false" class="text-sm">
                {{ $t("competitionRegistration.noDivisions") }}
              </Message>
            </div>
          </div>

          <div>
            <h3 class="text-surface-300 text-sm font-medium mb-2">{{ $t("competitionRegistration.rackPins") }}</h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label class="block text-surface-400 text-xs mb-1">{{ $t("competitionRegistration.squatRackPin") }}</label>
                <InputNumber v-model="form.squatRackPin" :min="0" :max="30" show-buttons class="w-full" />
              </div>
              <div>
                <label class="block text-surface-400 text-xs mb-1">{{ $t("competitionRegistration.benchRackPin") }}</label>
                <InputNumber v-model="form.benchRackPin" :min="0" :max="30" show-buttons class="w-full" />
              </div>
              <div>
                <label class="block text-surface-400 text-xs mb-1">{{ $t("competitionRegistration.benchSafetyPin") }}</label>
                <InputNumber v-model="form.benchSafetyPin" :min="0" :max="30" show-buttons class="w-full" />
              </div>
              <div>
                <label class="block text-surface-400 text-xs mb-1">{{ $t("competitionRegistration.benchFootBlock") }}</label>
                <InputNumber v-model="form.benchFootBlock" :min="0" :max="30" show-buttons class="w-full" />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-surface-300 text-sm mb-1">{{ $t("competitionRegistration.photo") }}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="block w-full text-sm text-surface-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-contrast file:cursor-pointer"
              @change="onPhotoChange"
            >
            <p class="text-surface-500 text-xs mt-1">
              {{ eligibility.athlete.competitionPhotoUrl ? $t("competitionRegistration.photoCurrent") : $t("competitionRegistration.photoHint") }}
            </p>
          </div>

          <label class="flex items-center gap-3">
            <Checkbox v-model="form.mediaPlus" binary input-id="mediaplus" />
            <span class="text-surface-200 text-sm">
              {{ $t("competitionRegistration.mediaPlus") }}
              <span class="text-surface-500">— {{ formatAmount(eligibility.fees.mediaPlusFee) }} VND</span>
            </span>
          </label>

          <div class="flex justify-between">
            <Button :label="$t('competitionRegistration.back')" text @click="step = 'capacity'" />
            <Button :label="$t('competitionRegistration.next')" :disabled="!canProceedDetails" @click="step = 'review'" />
          </div>
        </section>

        <!-- Step 4: review -->
        <section v-else-if="step === 'review'" class="space-y-5">
          <h2 class="text-lg font-semibold text-surface-0">{{ $t("competitionRegistration.reviewLegend") }}</h2>

          <!-- A voucher picker per owed type; Media Plus has no type and is never discounted. -->
          <div v-if="voucherTypes.length" class="bg-surface-800 rounded-lg p-4 space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-surface-200">{{ $t("competitionRegistration.voucherLegend") }}</h3>
              <p class="text-xs text-surface-500 mt-1">{{ $t("competitionRegistration.voucherHint") }}</p>
            </div>
            <CheckoutVoucherPicker
              v-for="vt in voucherTypes"
              :key="vt"
              :model-value="selectedVoucherCodes[vt] ?? null"
              :type="vt"
              :vouchers="vouchers"
              @update:model-value="selectedVoucherCodes[vt] = $event"
            />
          </div>

          <div class="bg-surface-800 rounded-lg p-4 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-surface-400">{{ $t("competitionRegistration.entryFee") }}</span>
              <span class="text-surface-0">{{ formatAmount(fees.entryFee) }} VND</span>
            </div>
            <div v-if="fees.membershipFee > 0" class="flex justify-between">
              <span class="text-surface-400">{{ $t("competitionRegistration.membershipFee") }}</span>
              <span class="text-surface-0">{{ formatAmount(fees.membershipFee) }} VND</span>
            </div>
            <div v-for="line in discountedLines" :key="line.type" class="flex justify-between text-primary">
              <span>{{ $t("competitionRegistration.discount") }} · {{ typeLabel(line.type) }}</span>
              <span>-{{ formatAmount(line.discount) }} VND</span>
            </div>
            <div v-if="fees.mediaPlusFee > 0" class="flex justify-between">
              <span class="text-surface-400">{{ $t("competitionRegistration.mediaPlusFee") }}</span>
              <span class="text-surface-0">{{ formatAmount(fees.mediaPlusFee) }} VND</span>
            </div>
            <div class="flex justify-between border-t border-surface-700 pt-2 font-semibold">
              <span class="text-surface-200">{{ $t("competitionRegistration.total") }}</span>
              <span class="text-primary">{{ formatAmount(totals.payable) }} VND</span>
            </div>
          </div>

          <div class="flex justify-between">
            <Button :label="$t('competitionRegistration.back')" text @click="step = 'details'" />
            <Button :label="$t('competitionRegistration.confirm')" :loading="isSubmitting" @click="submit" />
          </div>
        </section>

        <!-- Step 5: payment -->
        <section v-else-if="step === 'payment' && purchase?.qrUrl">
          <CheckoutQrPayment
            :ref-code="purchase.refCode"
            :amount="purchase.amount"
            :qr-url="purchase.qrUrl"
            @paid="step = 'done'"
            @cancelled="step = 'review'"
          />
        </section>

        <!-- Step 6: done -->
        <section v-else-if="step === 'done' && purchase" class="space-y-3">
          <Message :severity="purchase.identityVerified ? 'success' : 'info'" :closable="false">
            <div class="font-semibold mb-1">
              {{ purchase.identityVerified ? $t("competitionRegistration.confirmedTitle") : $t("competitionRegistration.pendingTitle") }}
            </div>
            <div>
              {{ purchase.identityVerified
                ? $t("competitionRegistration.confirmedBody", { meet: eligibility.meet.meetName })
                : $t("competitionRegistration.pendingBody", { meet: eligibility.meet.meetName }) }}
            </div>
          </Message>
          <NuxtLinkLocale to="/openvpf/profile/competition-info">
            <Button :label="$t('competitionRegistration.viewInProfile')" text />
          </NuxtLinkLocale>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue"
import { formatWeightClass } from "~/lib/utils/client"
import { computeVoucherTotals } from "~/lib/utils/vouchers"
import type { ApiResponse } from "~/types/api"
import type { RegistrationEligibility, CompetitionRegistrationCreated, RegistrationIdentityState } from "~/types/competitions"
import type { PurchaseType } from "~/types/union-types"
import type { Voucher } from "~/types/vouchers"

definePageMeta({
  layout: "openvpf",
  middleware: "auth",
})

const route = useRoute()
const slug = route.params.slug as string
const { t } = useI18n()
const apiMessage = useApiMessage()
const toast = useToast()

const { data, pending, refresh } = await useFetch<ApiResponse<RegistrationEligibility>>(`/api/meets/${slug}/registration`)

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

const DIVISION_LABEL_KEY: Record<string, string> = {
  open: "general.divisionOpen",
  jr: "general.divisionJunior",
  subjr: "general.divisionSubJunior",
  mas1: "general.divisionMaster1",
  mas2: "general.divisionMaster2",
  mas3: "general.divisionMaster3",
  mas4: "general.divisionMaster4",
  guest: "general.divisionGuest",
}

const sexOptions = computed(() => [
  { label: t("general.male"), value: "male" },
  { label: t("general.female"), value: "female" },
])

const weightClassOptions = computed(() => {
  const e = eligibility.value
  if (!e) return []
  return e.options.weightClasses[form.sex].map((wc) => ({ label: formatWeightClass(wc, form.sex), value: wc }))
})

const divisionOptions = computed(() => {
  const e = eligibility.value
  if (!e) return []
  return e.options.divisions.map((d) => ({ label: t(DIVISION_LABEL_KEY[d] ?? d), value: d }))
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

function formatAmount(value: number) {
  return value.toLocaleString("vi-VN")
}

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

    const res = await $fetch<ApiResponse<CompetitionRegistrationCreated>>(`/api/meets/${slug}/register`, {
      method: "POST",
      body: fd,
    })

    if (!res.success || !res.data) {
      toast.add({ severity: "error", summary: t("general.updateError"), detail: apiMessage(res) || t("competitionRegistration.submitError"), life: 5000 })
      return
    }

    purchase.value = res.data
    // A fully-discounted registration arrives already active: skip the QR entirely.
    step.value = res.data.status === "active" ? "done" : "payment"
  } catch {
    toast.add({ severity: "error", summary: t("general.updateError"), detail: t("competitionRegistration.submitError"), life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}

useHead({ title: () => t("competitionRegistration.title") })
</script>
