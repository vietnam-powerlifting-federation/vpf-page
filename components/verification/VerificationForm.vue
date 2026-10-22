<template>
  <div>
    <LoadingState v-if="pending" />

    <template v-else>
      <Message v-if="status" :severity="statusSeverity" :closable="false" class="mb-6">
        <p class="font-semibold">{{ statusLabel }}</p>
        <p v-if="status === 'rejected' && reviewNote" class="mt-1">{{ $t("verification.reason") }}: {{ reviewNote }}</p>
      </Message>

      <form ref="formEl" class="grid gap-5" novalidate @submit.prevent="handleSubmit">
        <AppField v-slot="f" :label="$t('verification.fullName')" :error="errors.fullName" required>
          <InputText :id="f.id" v-model="form.fullName" autocomplete="name" :disabled="isLocked" :invalid="f.invalid" :aria-describedby="f.describedBy" class="w-full" />
        </AppField>

        <div class="grid gap-5 sm:grid-cols-2">
          <AppField v-slot="f" :label="$t('verification.nationality')" :error="errors.nationality" required>
            <InputText :id="f.id" v-model="form.nationality" autocomplete="country-name" :disabled="isLocked" :invalid="f.invalid" :aria-describedby="f.describedBy" class="w-full" />
          </AppField>
          <AppField v-slot="f" :label="$t('verification.dob')" :error="errors.dob" required>
            <InputNumber
              v-model="form.dob"
              :input-id="f.id"
              :use-grouping="false"
              :min="1900"
              :max="currentYear"
              :disabled="isLocked"
              :invalid="f.invalid"
              :aria-describedby="f.describedBy"
              autocomplete="bday-year"
              class="w-full"
              input-class="w-full"
            />
          </AppField>
        </div>

        <AppField v-slot="f" :label="$t('verification.nationalId')" :error="errors.nationalId" required>
          <InputText :id="f.id" v-model="form.nationalId" inputmode="numeric" autocomplete="off" :disabled="isLocked" :invalid="f.invalid" :aria-describedby="f.describedBy" class="w-full" />
        </AppField>

        <AppField v-slot="f" :label="$t('verification.phoneNumber')" :error="errors.phoneNumber" required>
          <InputText :id="f.id" v-model="form.phoneNumber" type="tel" autocomplete="tel" :disabled="isLocked" :invalid="f.invalid" :aria-describedby="f.describedBy" class="w-full" />
        </AppField>

        <AppField v-slot="f" :label="$t('verification.address')" :error="errors.address" required>
          <Textarea :id="f.id" v-model="form.address" rows="2" autocomplete="street-address" :disabled="isLocked" :invalid="f.invalid" :aria-describedby="f.describedBy" class="w-full" />
        </AppField>

        <AppField v-slot="f" :label="$t('verification.idCardFront')" :hint="$t('verification.idCardHint')" :error="errors.idCard" required>
          <img
            v-if="idCardPreview"
            :src="idCardPreview"
            :alt="$t('verification.idCardFront')"
            class="mb-2 max-h-64 w-full rounded-md border border-surface-200 bg-surface-100 object-contain"
          >
          <input
            v-if="!isLocked"
            :id="f.id"
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            :aria-describedby="f.describedBy"
            :aria-invalid="f.invalid || undefined"
            class="block w-full text-sm text-muted-color file:mr-3 file:min-h-11 file:cursor-pointer file:rounded file:border file:border-surface-300 file:bg-surface-0 file:px-4 file:font-semibold file:text-color hover:file:bg-surface-100"
            @change="onFileChange"
          >
        </AppField>

        <Button v-if="!isLocked" type="submit" :label="$t('verification.submitButton')" class="w-full" :loading="isSubmitting" />

        <slot name="actions" />
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ApiResponse } from "~/types/api"
import type { IdentityVerification } from "~/types/verifications"

/**
 * The identity verification form (personal info + front-of-CCCD photo).
 * Self-loading: reads the athlete's current submission from /api/athletes/me/verification
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

const statusSeverity = computed(() => {
  if (status.value === "approved") return "success"
  if (status.value === "rejected") return "error"
  return "warn"
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
  const res = (await $fetch("/api/athletes/me/verification", {
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

const formEl = ref<HTMLFormElement | null>(null)

const handleSubmit = async () => {
  if (!validate()) {
    // Move focus to the first field with an error, so it is read out and in view.
    await nextTick()
    formEl.value?.querySelector<HTMLElement>("[aria-invalid='true'], .p-invalid input, input.p-invalid")?.focus()
    return
  }

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

    const res = (await $fetch("/api/athletes/me/verification", {
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
