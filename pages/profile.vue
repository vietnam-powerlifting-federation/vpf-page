<template>
  <div class="min-h-screen">
    <section class="py-12 md:py-16">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl md:text-4xl font-bold mb-8 text-center text-primary">{{ $t("profile.title") }}</h1>

        <!-- Loading State -->
        <div v-if="pending" class="max-w-4xl mx-auto text-center py-12">
          <ProgressSpinner />
          <p class="mt-4 text-gray-600 dark:text-gray-400">{{ $t("profile.loading") }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="max-w-4xl mx-auto text-center py-12">
          <p class="text-red-600 dark:text-red-400">{{ $t("profile.error") }}</p>
        </div>

        <!-- Profile Form -->
        <div v-else-if="userData" class="max-w-4xl mx-auto">
          <TestButton/>
          <Card>
            <template #content>
              <form class="space-y-6" @submit.prevent="handleSubmit">
                <Tabs v-model="activeTab" value="general">
                  <TabList>
                    <Tab value="general">
                      {{ $t("profile.tabs.generalInfo") }}
                    </Tab>
                    <Tab value="competition">
                      {{ $t("profile.tabs.competitionSettings") }}
                    </Tab>
                  </TabList>

                  <TabPanels>
                    <!-- General Info Tab -->
                    <TabPanel value="general">
                      <div class="space-y-6 pt-4">
                        <!-- Email -->
                        <div>
                          <label for="email" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ $t("profile.email") }}
                            <span class="text-red-500 ml-1">*</span>
                          </label>
                          <InputText
                            id="email"
                            v-model="formData.email"
                            type="email"
                            :placeholder="$t('profile.enterEmail')"
                            class="w-full"
                            :disabled="false"
                          />
                        </div>

                        <!-- Nationality -->
                        <div>
                          <label for="nationality" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ $t("profile.nationality") }}
                            <span class="text-red-500 ml-1">*</span>
                          </label>
                          <InputText
                            id="nationality"
                            v-model="formData.nationality"
                            :placeholder="$t('profile.enterNationality')"
                            class="w-full"
                            :disabled="false"
                          />
                        </div>

                        <!-- Date of Birth (Year) -->
                        <div>
                          <label for="dob" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ $t("profile.dob") }}
                            <span class="text-red-500 ml-1">*</span>
                          </label>
                          <InputNumber
                            id="dob"
                            v-model="formData.dob"
                            :placeholder="$t('profile.enterDob')"
                            class="w-full"
                            :min="1900"
                            :max="new Date().getFullYear()"
                            :disabled="false"
                          />
                        </div>

                        <!-- Address -->
                        <div>
                          <label for="address" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ $t("profile.address") }}
                            <span class="text-red-500 ml-1">*</span>
                          </label>
                          <Textarea
                            id="address"
                            v-model="formData.address"
                            :placeholder="$t('profile.enterAddress')"
                            class="w-full"
                            rows="3"
                            :disabled="false"
                          />
                        </div>

                        <!-- Phone Number -->
                        <div>
                          <label for="phoneNumber" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ $t("profile.phoneNumber") }}
                            <span class="text-red-500 ml-1">*</span>
                          </label>
                          <InputText
                            id="phoneNumber"
                            v-model="formData.phoneNumber"
                            :placeholder="$t('profile.enterPhoneNumber')"
                            class="w-full"
                            :disabled="false"
                          />
                        </div>

                        <!-- Instagram Username -->
                        <div>
                          <label for="instagramUsername" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ $t("profile.instagramUsername") }}
                          </label>
                          <InputText
                            id="instagramUsername"
                            v-model="formData.instagramUsername"
                            :placeholder="$t('profile.enterInstagramUsername')"
                            class="w-full"
                            :disabled="false"
                          />
                        </div>
                      </div>
                    </TabPanel>

                    <!-- Competition Settings Tab -->
                    <TabPanel value="competition">
                      <div class="space-y-6 pt-4">
                        <!-- Squat Rack Pin -->
                        <div>
                          <label for="squatRackPin" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ $t("profile.squatRackPin") }}
                          </label>
                          <InputNumber
                            id="squatRackPin"
                            v-model="formData.squatRackPin"
                            :placeholder="$t('profile.enterSquatRackPin')"
                            class="w-full"
                            :min="0"
                            :disabled="false"
                          />
                        </div>

                        <!-- Bench Rack Pin -->
                        <div>
                          <label for="benchRackPin" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ $t("profile.benchRackPin") }}
                          </label>
                          <InputNumber
                            id="benchRackPin"
                            v-model="formData.benchRackPin"
                            :placeholder="$t('profile.enterBenchRackPin')"
                            class="w-full"
                            :min="0"
                            :disabled="false"
                          />
                        </div>

                        <!-- Bench Safety Pin -->
                        <div>
                          <label for="benchSafetyPin" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ $t("profile.benchSafetyPin") }}
                          </label>
                          <InputNumber
                            id="benchSafetyPin"
                            v-model="formData.benchSafetyPin"
                            :placeholder="$t('profile.enterBenchSafetyPin')"
                            class="w-full"
                            :min="0"
                            :disabled="false"
                          />
                        </div>

                        <!-- Bench Foot Block -->
                        <div>
                          <label for="benchFootBlock" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ $t("profile.benchFootBlock") }}
                          </label>
                          <InputNumber
                            id="benchFootBlock"
                            v-model="formData.benchFootBlock"
                            :placeholder="$t('profile.enterBenchFootBlock')"
                            class="w-full"
                            :min="0"
                            :disabled="false"
                          />
                        </div>
                      </div>
                    </TabPanel>
                  </TabPanels>
                </Tabs>

                <!-- Form Actions -->
                <div class="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <SecondaryButton
                    type="button"
                    :label="$t('profile.cancel')"
                    :disabled="isSubmitting"
                    @click="resetForm"
                  />
                  <Button
                    type="submit"
                    :label="$t('profile.save')"
                    :loading="isSubmitting"
                    :disabled="isSubmitting"
                  />
                </div>
              </form>
            </template>
          </Card>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useToast } from "primevue/usetoast"
import Card from "@/components/volt/Card.vue"
import Tabs from "@/components/volt/Tabs.vue"
import TabList from "@/components/volt/TabList.vue"
import Tab from "@/components/volt/Tab.vue"
import TabPanels from "@/components/volt/TabPanels.vue"
import TabPanel from "@/components/volt/TabPanel.vue"
import InputText from "@/components/volt/InputText.vue"
import InputNumber from "@/components/volt/InputNumber.vue"
import Textarea from "@/components/volt/Textarea.vue"
import Button from "@/components/volt/Button.vue"
import SecondaryButton from "@/components/volt/SecondaryButton.vue"
import ProgressSpinner from "@/components/volt/ProgressSpinner.vue"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate } from "~/types/users"

const toast = useToast()
const { t, locale } = useI18n()
const activeTab = ref("general")
const isSubmitting = ref(false)

// Fetch user profile data
const { data, pending, error, refresh } = await useFetch<ApiResponse<UserPrivate>>("/api/users/self", {
  immediate: true,
})

// User data
const userData = computed(() => data.value?.data)

// Form data - initialize with user data
const formData = ref<{
  email: string | null
  nationality: string | null
  dob: number | null
  address: string | null
  phoneNumber: string | null
  squatRackPin: number | null
  benchRackPin: number | null
  benchSafetyPin: number | null
  benchFootBlock: number | null
  instagramUsername: string | null
}>({
  email: null,
  nationality: null,
  dob: null,
  address: null,
  phoneNumber: null,
  squatRackPin: null,
  benchRackPin: null,
  benchSafetyPin: null,
  benchFootBlock: null,
  instagramUsername: null,
})

// Initialize form data when user data is loaded
watch(
  userData,
  (newUserData) => {
    if (newUserData) {
      formData.value = {
        email: newUserData.email ?? null,
        nationality: newUserData.nationality ?? null,
        dob: newUserData.dob ?? null,
        address: newUserData.address ?? null,
        phoneNumber: newUserData.phoneNumber ?? null,
        squatRackPin: newUserData.squatRackPin ?? null,
        benchRackPin: newUserData.benchRackPin ?? null,
        benchSafetyPin: newUserData.benchSafetyPin ?? null,
        benchFootBlock: newUserData.benchFootBlock ?? null,
        instagramUsername: newUserData.instagramUsername ?? null,
      }
    }
  },
  { immediate: true }
)

// Reset form to original user data
const resetForm = () => {
  if (userData.value) {
    formData.value = {
      email: userData.value.email ?? null,
      nationality: userData.value.nationality ?? null,
      dob: userData.value.dob ?? null,
      address: userData.value.address ?? null,
      phoneNumber: userData.value.phoneNumber ?? null,
      squatRackPin: userData.value.squatRackPin ?? null,
      benchRackPin: userData.value.benchRackPin ?? null,
      benchSafetyPin: userData.value.benchSafetyPin ?? null,
      benchFootBlock: userData.value.benchFootBlock ?? null,
      instagramUsername: userData.value.instagramUsername ?? null,
    }
  }
}

// Handle form submission
const handleSubmit = async () => {
  isSubmitting.value = true

  try {
    // Prepare payload - only include fields that are editable
    const payload: Partial<{
      email: string | null
      nationality: string | null
      dob: number | null
      address: string | null
      phoneNumber: string | null
      squatRackPin: number | null
      benchRackPin: number | null
      benchSafetyPin: number | null
      benchFootBlock: number | null
      instagramUsername: string | null
    }> = {}

    // Only include fields that have changed or are not null
    if (formData.value.email !== null) payload.email = formData.value.email
    if (formData.value.nationality !== null) payload.nationality = formData.value.nationality
    if (formData.value.dob !== null) payload.dob = formData.value.dob
    if (formData.value.address !== null) payload.address = formData.value.address
    if (formData.value.phoneNumber !== null) payload.phoneNumber = formData.value.phoneNumber
    if (formData.value.squatRackPin !== null) payload.squatRackPin = formData.value.squatRackPin
    if (formData.value.benchRackPin !== null) payload.benchRackPin = formData.value.benchRackPin
    if (formData.value.benchSafetyPin !== null) payload.benchSafetyPin = formData.value.benchSafetyPin
    if (formData.value.benchFootBlock !== null) payload.benchFootBlock = formData.value.benchFootBlock
    if (formData.value.instagramUsername !== null) payload.instagramUsername = formData.value.instagramUsername

    const response = await $fetch<ApiResponse<UserPrivate>>("/api/users/self", {
      method: "PATCH",
      body: payload,
      ignoreResponseError: true,
    })

    if (response.success) {
      // Refresh user data
      await refresh()

      toast.add({
        severity: "success",
        summary: t("profile.success"),
        detail: response.message[locale.value as "en" | "vi"] || response.message.en,
        life: 3000,
      })
    } else {
      toast.add({
        severity: "error",
        summary: t("profile.updateError"),
        detail: response.message[locale.value as "en" | "vi"] || response.message.en || t("profile.validationError"),
        life: 5000,
      })
    }
  } catch (err) {
    toast.add({
      severity: "error",
      summary: t("profile.updateError"),
      detail: err instanceof Error ? err.message : t("profile.validationError"),
      life: 5000,
    })
  } finally {
    isSubmitting.value = false
  }
}

// Set page meta
useHead({
  title: t("profile.title"),
})

definePageMeta({
  layout: "with-footer",
  pageTransition: {
    name: "page",
    mode: "out-in",
  },
})
</script>
