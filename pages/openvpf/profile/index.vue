<template>
  <div class="min-h-full">
    <h1 class="text-2xl font-bold mb-6 text-surface-0 text-center">{{ $t("profile.tabs.personalInfo") }}</h1>

    <div v-if="pending" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <div v-else-if="error" class="text-error">{{ $t("general.error") }}</div>
    <div v-else-if="userData" class="space-y-6">
      <div>
        <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vpfId") }}</label>
        <InputText :model-value="userData.vpfId" class="w-full" disabled />
      </div>
      <div>
        <label for="email" class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.email") }} <span class="text-primary">*</span></label>
        <InputText
          id="email"
          v-model="formData.email"
          type="email"
          :placeholder="$t('profile.enterEmail')"
          class="w-full"
        />
      </div>
      <div>
        <label for="phoneNumber" class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.phoneNumber") }} <span class="text-primary">*</span></label>
        <InputText
          id="phoneNumber"
          v-model="formData.phoneNumber"
          :placeholder="$t('profile.enterPhoneNumber')"
          class="w-full"
        />
      </div>
      <div>
        <label for="nationality" class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.nationality") }} <span class="text-primary">*</span></label>
        <InputText
          id="nationality"
          v-model="formData.nationality"
          :placeholder="$t('profile.enterNationality')"
          class="w-full"
        />
      </div>
      <div>
        <label for="dob" class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.dob") }} <span class="text-primary">*</span></label>
        <InputNumber
          id="dob"
          v-model="formData.dob"
          :placeholder="$t('profile.enterDob')"
          class="w-full"
          :min="1900"
          :max="new Date().getFullYear()"
        />
      </div>
      <div>
        <label for="address" class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.address") }} <span class="text-primary">*</span></label>
        <Textarea
          id="address"
          v-model="formData.address"
          :placeholder="$t('profile.enterAddress')"
          class="w-full"
          rows="3"
        />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label for="squatRackPin" class="block mb-2 text-sm font-medium text-surface-300">
            {{ $t("profile.squatRackPin") }}
          </label>
          <InputNumber id="squatRackPin" v-model="formData.squatRackPin"
            :placeholder="$t('profile.enterSquatRackPin')" class="w-full" :min="0" />
        </div>

        <div>
          <label for="benchRackPin" class="block mb-2 text-sm font-medium text-surface-300">
            {{ $t("profile.benchRackPin") }}
          </label>
          <InputNumber id="benchRackPin" v-model="formData.benchRackPin"
            :placeholder="$t('profile.enterBenchRackPin')" class="w-full" :min="0" />
        </div>

        <div>
          <label for="benchSafetyPin" class="block mb-2 text-sm font-medium text-surface-300">
            {{ $t("profile.benchSafetyPin") }}
          </label>
          <InputNumber id="benchSafetyPin" v-model="formData.benchSafetyPin"
            :placeholder="$t('profile.enterBenchSafetyPin')" class="w-full" :min="0" />
        </div>

        <div>
          <label for="benchFootBlock" class="block mb-2 text-sm font-medium text-surface-300">
            {{ $t("profile.benchFootBlock") }}
          </label>
          <InputNumber id="benchFootBlock" v-model="formData.benchFootBlock"
            :placeholder="$t('profile.enterBenchFootBlock')" class="w-full" :min="0" />
        </div>
      </div>
      <div class="pt-4 flex justify-end">
        <Button :label="$t('profile.save')" :loading="isSubmitting" :disabled="isSubmitting" class="bg-primary text-primary-contrast" @click="handleSubmit" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue"
import { useToast } from "primevue/usetoast"
import InputText from "@/components/volt/InputText.vue"
import InputNumber from "@/components/volt/InputNumber.vue"
import Textarea from "@/components/volt/Textarea.vue"
import Button from "@/components/volt/Button.vue"
import ProgressSpinner from "@/components/volt/ProgressSpinner.vue"
import { useProfileAthlete } from "~/composables/useProfileData"
import { buildPatchPayload } from "~/lib/utils/client"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate } from "~/types/users"
import type { UserSelfPatchSchema } from "~/lib/zod/schemas/users.schema"
import type { z } from "zod"

definePageMeta({
  layout: "openvpf-profile",
  middleware: "auth",
})

const toast = useToast()
const { t, locale } = useI18n()
const { data: profileResponse, pending, error } = useProfileAthlete()
const userData = computed(() => profileResponse.value?.athlete ?? null)

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

const isSubmitting = ref(false)
async function handleSubmit() {
  if (!userData.value) return
  const payload = buildPatchPayload<FormData>(formData.value, userData.value)
  if (Object.keys(payload).length === 0) return
  isSubmitting.value = true
  try {
    const response = (await $fetch("/api/athletes/self", {
      method: "PATCH",
      body: payload,
    })) as ApiResponse<UserPrivate>
    if (response.success) {
      toast.add({
        severity: "success",
        summary: t("general.success"),
        detail: response.message[locale.value as "en" | "vi"] || response.message.en,
        life: 3000,
      })
    } else {
      toast.add({
        severity: "error",
        summary: t("general.updateError"),
        detail: response.message[locale.value as "en" | "vi"] || response.message.en,
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
