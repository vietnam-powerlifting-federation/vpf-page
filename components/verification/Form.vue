<template>
  <div>
    <div v-if="pending" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <template v-else>
      <!-- Status banner -->
      <div
        v-if="status"
        class="mb-6 p-4 rounded-lg border"
        :class="statusBannerClass"
      >
        <p class="text-sm font-medium">{{ statusLabel }}</p>
        <p v-if="status === 'rejected' && reviewNote" class="text-sm mt-1">
          {{ $t("verification.reason") }}: {{ reviewNote }}
        </p>
      </div>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <div>
          <label for="fullName" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
            {{ $t("verification.fullName") }} <span class="text-primary">*</span>
          </label>
          <InputText id="fullName" v-model="form.fullName" class="w-full" :disabled="isLocked" :class="{ 'p-invalid': errors.fullName }" />
          <small v-if="errors.fullName" class="p-error mt-1 block">{{ errors.fullName }}</small>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label for="nationality" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
              {{ $t("verification.nationality") }} <span class="text-primary">*</span>
            </label>
            <InputText id="nationality" v-model="form.nationality" class="w-full" :disabled="isLocked" :class="{ 'p-invalid': errors.nationality }" />
            <small v-if="errors.nationality" class="p-error mt-1 block">{{ errors.nationality }}</small>
          </div>
          <div>
            <label for="dob" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
              {{ $t("verification.dob") }} <span class="text-primary">*</span>
            </label>
            <InputNumber
              id="dob"
              v-model="form.dob"
              :use-grouping="false"
              :min="1900"
              :max="currentYear"
              class="w-full"
              input-class="w-full"
              :disabled="isLocked"
              :class="{ 'p-invalid': errors.dob }"
            />
            <small v-if="errors.dob" class="p-error mt-1 block">{{ errors.dob }}</small>
          </div>
        </div>

        <div>
          <label for="nationalId" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
            {{ $t("verification.nationalId") }} <span class="text-primary">*</span>
          </label>
          <InputText id="nationalId" v-model="form.nationalId" class="w-full" :disabled="isLocked" :class="{ 'p-invalid': errors.nationalId }" />
          <small v-if="errors.nationalId" class="p-error mt-1 block">{{ errors.nationalId }}</small>
        </div>

        <div>
          <label for="phoneNumber" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
            {{ $t("verification.phoneNumber") }} <span class="text-primary">*</span>
          </label>
          <InputText id="phoneNumber" v-model="form.phoneNumber" class="w-full" :disabled="isLocked" :class="{ 'p-invalid': errors.phoneNumber }" />
          <small v-if="errors.phoneNumber" class="p-error mt-1 block">{{ errors.phoneNumber }}</small>
        </div>

        <div>
          <label for="address" class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
            {{ $t("verification.address") }} <span class="text-primary">*</span>
          </label>
          <Textarea id="address" v-model="form.address" rows="2" class="w-full" :disabled="isLocked" :class="{ 'p-invalid': errors.address }" />
          <small v-if="errors.address" class="p-error mt-1 block">{{ errors.address }}</small>
        </div>

        <!-- National ID card photo (front) -->
        <div>
          <label class="block mb-2 text-sm font-medium text-surface-800 dark:text-surface-200">
            {{ $t("verification.idCardFront") }} <span class="text-primary">*</span>
          </label>
          <div
            v-if="idCardPreview"
            class="mb-3 overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700"
          >
            <img :src="idCardPreview" alt="ID card front" class="w-full max-h-64 object-contain bg-surface-100 dark:bg-surface-900">
          </div>
          <input
            v-if="!isLocked"
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            class="block w-full text-sm text-surface-600 dark:text-surface-300
                   file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2
                   file:text-primary-contrast file:font-semibold hover:file:bg-primary-emphasis"
            @change="onFileChange"
          >
          <small class="mt-1 block text-surface-500">{{ $t("verification.idCardHint") }}</small>
          <small v-if="errors.idCard" class="p-error mt-1 block">{{ errors.idCard }}</small>
        </div>

        <Button
          v-if="!isLocked"
          type="submit"
          :label="$t('verification.submitButton')"
          class="w-full"
          :loading="isSubmitting"
          :disabled="isSubmitting"
        />

        <slot name="actions" />
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue"
import type { ApiResponse } from "~/types/api"
import type { IdentityVerification } from "~/types/verifications"

/**
 * The identity verification form (personal info + front-of-CCCD photo).
 * Self-loading: reads the athlete's current submission from /api/verifications/self
 * and prefills. Once approved the form renders read-only, so the same component
 * doubles as the "review your saved personal info" view.
 * Used by the standalone verification page and by the competition registration wizard.
 */

const emit = defineEmits<{
  submitted: [IdentityVerification]
  "update:status": [IdentityVerification["status"] | null]
}>()

const { t } = useI18n()
const toast = useToast()
const msg = useApiMessage()

const currentYear = new Date().getFullYear()

const pending = ref(true)
const isSubmitting = ref(false)

const status = ref<IdentityVerification["status"] | null>(null)
const reviewNote = ref<string | null>(null)

const form = reactive({
  fullName: "",
  nationality: "",
  dob: null as number | null,
  nationalId: "",
  address: "",
  phoneNumber: "",
})

const errors = reactive({
  fullName: "",
  nationality: "",
  dob: "",
  nationalId: "",
  address: "",
  phoneNumber: "",
  idCard: "",
})

const fileInput = ref<HTMLInputElement | null>(null)
const idCardFile = ref<File | null>(null)
const idCardPreview = ref<string | null>(null)
const existingPhoto = ref(false)

const isLocked = computed(() => status.value === "approved")

const statusLabel = computed(() => {
  if (status.value === "approved") return t("verification.statusApproved")
  if (status.value === "pending") return t("verification.statusPending")
  if (status.value === "rejected") return t("verification.statusRejected")
  return ""
})

const statusBannerClass = computed(() => {
  if (status.value === "approved") return "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300"
  if (status.value === "rejected") return "bg-primary/10 border-primary/20 text-primary-700 dark:text-primary-300"
  return "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
})

type StatusData = { emailVerified: boolean; identityVerified: boolean; verification: IdentityVerification | null }

function applyVerification(v: IdentityVerification) {
  status.value = v.status
  reviewNote.value = v.reviewNote
  form.fullName = v.fullName
  form.nationality = v.nationality
  form.dob = v.dob
  form.nationalId = v.nationalId
  form.address = v.address
  form.phoneNumber = v.phoneNumber
  idCardPreview.value = v.idCardFrontUrl
  // Null once approved: the image is deleted from the bucket after review.
  existingPhoto.value = Boolean(v.idCardFrontUrl)
}

onMounted(async () => {
  // Route middleware guards authentication; a failure here just leaves an empty form.
  const res = (await $fetch("/api/verifications/self", {
    ignoreResponseError: true,
    credentials: "include",
  })) as ApiResponse<StatusData>

  if (res.success && res.data.verification) {
    applyVerification(res.data.verification)
  }
  emit("update:status", status.value)
  pending.value = false
})

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  errors.idCard = ""
  idCardFile.value = file
  idCardPreview.value = URL.createObjectURL(file)
}

const validate = (): boolean => {
  errors.fullName = form.fullName.trim() ? "" : t("verification.required")
  errors.nationality = form.nationality.trim() ? "" : t("verification.required")
  errors.dob = form.dob && form.dob >= 1900 && form.dob <= currentYear ? "" : t("verification.required")
  errors.nationalId = form.nationalId.trim() ? "" : t("verification.required")
  errors.address = form.address.trim() ? "" : t("verification.required")
  errors.phoneNumber = form.phoneNumber.trim() ? "" : t("verification.required")
  errors.idCard = idCardFile.value || existingPhoto.value ? "" : t("verification.idCardRequired")
  return !Object.values(errors).some(Boolean)
}

const handleSubmit = async () => {
  if (!validate()) return

  isSubmitting.value = true
  try {
    const fd = new FormData()
    fd.append("fullName", form.fullName.trim())
    fd.append("nationality", form.nationality.trim())
    fd.append("dob", String(form.dob))
    fd.append("nationalId", form.nationalId.trim())
    fd.append("address", form.address.trim())
    fd.append("phoneNumber", form.phoneNumber.trim())
    if (idCardFile.value) fd.append("idCardFront", idCardFile.value)

    const res = (await $fetch("/api/verifications/self", {
      method: "POST",
      body: fd,
      ignoreResponseError: true,
      credentials: "include",
    })) as ApiResponse<IdentityVerification>

    if (res.success) {
      status.value = res.data.status
      reviewNote.value = res.data.reviewNote
      existingPhoto.value = true
      idCardFile.value = null
      emit("update:status", status.value)
      emit("submitted", res.data)
      toast.add({ severity: "success", summary: t("general.success"), detail: msg(res), life: 4000 })
    } else {
      toast.add({ severity: "error", summary: t("general.error"), detail: msg(res) || t("general.error"), life: 5000 })
    }
  } catch (e) {
    toast.add({ severity: "error", summary: t("general.error"), detail: e instanceof Error ? e.message : t("general.error"), life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>
