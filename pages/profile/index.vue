<template>
  <div class="grid gap-6">
    <!-- Identity verification status, with the way to (re)submit it -->
    <PagePanel>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <AppIcon name="lucide:id-card" class="size-6 text-muted-color" />
          <span class="font-semibold">{{ $t("profile.verification.label") }}</span>
          <Tag :value="verifyStatusText" :severity="verifyStatusSeverity" />
        </div>
        <Button v-if="!isVerified" :label="verifyButtonLabel" @click="goVerify" />
      </div>
    </PagePanel>

    <LoadingState v-if="pending" />
    <Message v-else-if="error" severity="error" :closable="false">{{ $t("general.error") }}</Message>

    <form v-else-if="userData" novalidate class="grid gap-6" @submit.prevent="handleSubmit">
      <PagePanel :title="$t('profile.tabs.personalInfo')" ruled>
        <div class="grid gap-5 md:grid-cols-2">
          <AppField v-slot="f" :label="$t('profile.vpfId')">
            <InputText :id="f.id" :model-value="userData.vpfId" disabled class="w-full" />
          </AppField>
          <AppField v-slot="f" :label="$t('profile.email')" required>
            <InputText :id="f.id" v-model="formData.email" type="email" autocomplete="email" class="w-full" />
          </AppField>
          <AppField v-slot="f" :label="$t('profile.phoneNumber')" required>
            <InputText :id="f.id" v-model="formData.phoneNumber" type="tel" autocomplete="tel" class="w-full" />
          </AppField>
          <AppField v-slot="f" :label="$t('profile.nationality')" required>
            <InputText :id="f.id" v-model="formData.nationality" autocomplete="country-name" class="w-full" />
          </AppField>
          <AppField v-slot="f" :label="$t('profile.dob')" required>
            <InputNumber v-model="formData.dob" :input-id="f.id" :use-grouping="false" :min="1900" :max="new Date().getFullYear()" autocomplete="bday-year" class="w-full" input-class="w-full" />
          </AppField>
          <AppField v-slot="f" :label="$t('profile.address')" required class="md:col-span-2">
            <Textarea :id="f.id" v-model="formData.address" rows="3" autocomplete="street-address" class="w-full" />
          </AppField>
        </div>
      </PagePanel>

      <PagePanel :title="$t('profile.tabs.competitionSettings')">
        <div class="grid gap-5">
          <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <AppField v-for="pin in rackPins" :key="pin" v-slot="f" :label="$t(`profile.${pin}`)">
              <InputNumber v-model="formData[pin]" :input-id="f.id" :min="0" class="w-full" input-class="w-full" />
            </AppField>
          </div>
          <AppField
            v-slot="f"
            :label="$t('competitionRegistration.photo')"
            :hint="userData.competitionPhotoUrl ? $t('competitionRegistration.photoCurrent') : $t('competitionRegistration.photoHint')"
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
        </div>
      </PagePanel>

      <div class="flex justify-end">
        <Button type="submit" :label="$t('profile.save')" :loading="isSubmitting" />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { buildPatchPayload } from "~/lib/domain/patch-payload"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate } from "~/types/users"
import type { IdentityVerification } from "~/types/verifications"
import type { UserSelfPatchSchema } from "~/lib/zod/schemas/users.schema"
import type { z } from "zod"

definePageMeta({
  layout: "account",
  middleware: "auth",
})

const toast = useToast()
const { t } = useI18n()
const apiMessage = useApiMessage()
const { data: profileResponse, pending, error, refresh } = useProfileAthlete()
const userData = computed(() => profileResponse.value?.athlete ?? null)

// Identity verification status, surfaced on the profile with a link back to the verification page.
type SelfVerification = { emailVerified: boolean; identityVerified: boolean; verification: IdentityVerification | null }
const { data: verifyResponse } = useFetch<ApiResponse<SelfVerification>>("/api/athletes/me/verification", {
  credentials: "include",
  ignoreResponseError: true,
})
const verifyStatus = computed<IdentityVerification["status"] | null>(() =>
  verifyResponse.value?.success ? verifyResponse.value.data.verification?.status ?? null : null,
)
const isVerified = computed(() => verifyStatus.value === "approved")
const verifyStatusText = computed(() => {
  if (verifyStatus.value === "approved") return t("profile.verification.verified")
  if (verifyStatus.value === "pending") return t("profile.verification.pending")
  if (verifyStatus.value === "rejected") return t("profile.verification.rejected")
  return t("profile.verification.notVerified")
})
const verifyStatusSeverity = computed(() => {
  if (verifyStatus.value === "approved") return "success"
  if (verifyStatus.value === "pending") return "warn"
  if (verifyStatus.value === "rejected") return "danger"
  return "secondary"
})
const verifyButtonLabel = computed(() =>
  verifyStatus.value === "rejected" ? t("profile.verification.reverifyButton") : t("profile.verification.verifyButton"),
)
const goVerify = () => navigateTo("/verification")

type FormData = Required<z.infer<typeof UserSelfPatchSchema>>
const formData = ref<FormData>({
  email: null,
  nationality: null,
  dob: null,
  address: null,
  phoneNumber: null,
  squatRackPin: null,
  benchRackPin: null,
  benchSafetyPin: null,
  benchFootBlock: null,
})

watch(
  userData,
  (val) => {
    if (val) {
      formData.value = {
        email: val.email,
        nationality: val.nationality,
        dob: val.dob,
        address: val.address,
        phoneNumber: val.phoneNumber,
        squatRackPin: val.squatRackPin,
        benchRackPin: val.benchRackPin,
        benchSafetyPin: val.benchSafetyPin,
        benchFootBlock: val.benchFootBlock,
      }
    }
  },
  { immediate: true }
)

const rackPins = ["squatRackPin", "benchRackPin", "benchSafetyPin", "benchFootBlock"] as const

const photoFile = ref<File | null>(null)
function onPhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  photoFile.value = input.files?.[0] ?? null
}

const isSubmitting = ref(false)
async function handleSubmit() {
  if (!userData.value) return
  const payload = buildPatchPayload<FormData>(formData.value, userData.value)
  if (Object.keys(payload).length === 0 && !photoFile.value) return
  isSubmitting.value = true
  try {
    let body: globalThis.FormData | Record<string, unknown> = payload
    if (photoFile.value) {
      const fd = new globalThis.FormData()
      for (const [key, value] of Object.entries(payload)) fd.append(key, String(value))
      fd.append("competitionPhoto", photoFile.value)
      body = fd
    }
    const response = (await $fetch("/api/athletes/me", {
      method: "PATCH",
      body,
    })) as ApiResponse<UserPrivate>
    if (response.success) {
      photoFile.value = null
      await refresh()
      toast.add({
        severity: "success",
        summary: t("general.success"),
        detail: apiMessage(response),
        life: 3000,
      })
    } else {
      toast.add({
        severity: "error",
        summary: t("general.updateError"),
        detail: apiMessage(response),
        life: 5000,
      })
    }
  } catch {
    toast.add({
      severity: "error",
      summary: t("general.updateError"),
      detail: t("general.validationError"),
      life: 5000,
    })
  } finally {
    isSubmitting.value = false
  }
}

useHead({ title: () => t("profile.tabs.personalInfo") })
</script>
