<template>
  <div class="min-h-full">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-surface-0">{{ $t("profile.tabs.vipBenefits") }}</h1>
      <div v-if="isAdmin" class="flex items-center gap-2">
        <span class="text-sm text-surface-400">
          {{ vipActive ? $t("profile.vipBenefits.previewNonVip") : $t("profile.vipBenefits.previewActive") }}
        </span>
        <ToggleSwitch v-model="adminForceActive" />
      </div>
    </div>

    <div v-if="pending" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <template v-else>
      <div v-if="!showActive">
        <!-- Preview card -->
        <div class="border border-surface-600 rounded-lg p-6 mb-2 bg-surface-800 flex flex-col gap-4">
          <p class="text-surface-300">{{ $t("profile.vipBenefits.description") }}</p>
          <p class="text-surface-400 text-sm">{{ $t("profile.vipBenefits.features") }}</p>
          <img :src="vipPreview" alt="" class="w-full object-cover rounded-lg">
          <div>
            <Button :label="$t('profile.vipBenefits.registerNow')" class="bg-primary" @click="goToCheckout" />
          </div>
        </div>

        <!-- Disabled settings card -->
          <ProfileVipSettingsForm
            disabled
            :form="form"
            :avatar-preview="null"
            :banner-preview="() => null"
            :next-banner-slot="null"
            :is-submitting="false"
            :has-changes="false"
          />
      </div>

      <ProfileVipSettingsForm
        v-else
        :disabled="false"
        :form="form"
        :avatar-preview="avatarPreview"
        :banner-preview="bannerPreview"
        :next-banner-slot="nextBannerSlot"
        :is-submitting="isSubmitting"
        :has-changes="hasChanges"
        @update-field="handleFieldUpdate"
        @avatar-click="avatarInputRef?.click()"
        @trigger-banner-input="triggerBannerInput"
        @clear-banner="clearBanner"
        @submit="handleSubmit"
      />

      <input
        ref="avatarInputRef"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        class="hidden"
        @change="onAvatarChange"
      >
      <input
        ref="bannerInputRef"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        class="hidden"
        @change="onBannerChange"
      >
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue"
import { useToast } from "primevue/usetoast"
import Button from "primevue/button"
import ToggleSwitch from "primevue/toggleswitch"
import ProgressSpinner from "primevue/progressspinner"
import { buildPatchPayload } from "~/lib/utils/client"
import { isVipActive } from "~/lib/utils/vip"
import vipPreview from "~/assets/img/vip-preview.png"
import type { ApiResponse } from "~/types/api"
import type { VipBenefits } from "~/types/vip"
import { CHECKOUT_STORAGE_KEY } from "~/types/checkout"
import type { CheckoutItem } from "~/types/checkout"

definePageMeta({
  layout: "openvpf-profile",
  middleware: "auth",
})

const { t, locale } = useI18n()
const toast = useToast()

const { data: profileResponse, pending } = useProfileAthlete()

const userData = computed(() => profileResponse.value?.athlete ?? null)
const vipSettings = computed(() => profileResponse.value?.vipSettings ?? null)

const vipActive = computed(() => isVipActive(userData.value?.vipMembershipExpiresAt ?? null))
const isAdmin = computed(() => userData.value?.role === "admin")

const adminForceActive = ref(false)
const showActive = computed(() => adminForceActive.value ? !vipActive.value : vipActive.value)

function goToCheckout() {
  const item: CheckoutItem = {
    id: "vip-1year",
    name: { en: "1 Year VIP Membership", vi: "Gói VIP 1 năm" },
    amount: 300_000,
    type: "vip",
    plan: "1year",
  }
  localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify([item]))
  navigateTo("/openvpf/checkout")
}

type FormState = Partial<
  Omit<VipBenefits, "vpfId"> & {
    avatarImageUrl: string | null
    bannerImageUrl1: string | null
    bannerImageUrl2: string | null
    bannerImageUrl3: string | null
    bannerImageUrl4: string | null
    bannerImageUrl5: string | null
  }
>

const defaultForm = (): FormState => ({
  avatarImageUrl: null,
  bannerImageUrl1: null,
  bannerImageUrl2: null,
  bannerImageUrl3: null,
  bannerImageUrl4: null,
  bannerImageUrl5: null,
  profileDescription: null,
  displayProfileDescription: false,
  alias: null,
  displayAlias: false,
  facebook: null,
  displayFacebook: false,
  instagram: null,
  displayInstagram: false,
  tiktok: null,
  displayTiktok: false,
  youtube: null,
  displayYoutube: false,
  vipPhoneNumber: null,
  displayMobilePhone: false,
})

const form = ref<FormState>(defaultForm())
const initialForm = ref<FormState>(defaultForm())

watch(
  vipSettings,
  (val) => {
    if (val) {
      const next: FormState = {
        avatarImageUrl: val.avatarImageUrl ?? null,
        bannerImageUrl1: val.bannerImageUrl1 ?? null,
        bannerImageUrl2: val.bannerImageUrl2 ?? null,
        bannerImageUrl3: val.bannerImageUrl3 ?? null,
        bannerImageUrl4: val.bannerImageUrl4 ?? null,
        bannerImageUrl5: val.bannerImageUrl5 ?? null,
        profileDescription: val.profileDescription ?? null,
        displayProfileDescription: val.displayProfileDescription ?? false,
        alias: val.alias ?? null,
        displayAlias: val.displayAlias ?? false,
        facebook: val.facebook ?? null,
        displayFacebook: val.displayFacebook ?? false,
        instagram: val.instagram ?? null,
        displayInstagram: val.displayInstagram ?? false,
        tiktok: val.tiktok ?? null,
        displayTiktok: val.displayTiktok ?? false,
        youtube: val.youtube ?? null,
        displayYoutube: val.displayYoutube ?? false,
        vipPhoneNumber: val.vipPhoneNumber ?? null,
        displayMobilePhone: val.displayMobilePhone ?? false,
      }
      form.value = next
      initialForm.value = { ...next }
    } else if (vipActive.value) {
      form.value = defaultForm()
      initialForm.value = defaultForm()
    }
  },
  { immediate: true }
)

const avatarInputRef = ref<HTMLInputElement | null>(null)
const bannerInputRef = ref<HTMLInputElement | null>(null)
const avatarFile = ref<File | null>(null)
const bannerFiles = ref<Record<number, File>>({})

const avatarPreview = computed(() => {
  if (avatarFile.value) return URL.createObjectURL(avatarFile.value)
  return form.value.avatarImageUrl ?? null
})

function bannerPreview(idx: number) {
  const key = `bannerImageUrl${idx}` as keyof FormState
  const url = form.value[key]
  if (typeof url === "string" && url) return url
  const file = bannerFiles.value[idx]
  if (file) return URL.createObjectURL(file)
  return null
}

const BANNER_KEYS = ["bannerImageUrl1", "bannerImageUrl2", "bannerImageUrl3", "bannerImageUrl4", "bannerImageUrl5"] as const

const nextBannerSlot = computed(() => {
  for (let i = 1; i <= 5; i++) {
    const key = BANNER_KEYS[i - 1]
    const url = form.value[key]
    const file = bannerFiles.value[i]
    if (!url && !file) return i
  }
  return null
})

function handleFieldUpdate(key: string, value: string | boolean | null) {
  form.value = { ...form.value, [key]: value }
}

function onAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  avatarFile.value = file ?? null
  input.value = ""
}

function triggerBannerInput() {
  bannerInputRef.value?.click()
}

function onBannerChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || nextBannerSlot.value === null) return
  bannerFiles.value = { ...bannerFiles.value, [nextBannerSlot.value]: file }
  input.value = ""
}

function clearBanner(idx: number) {
  const key = BANNER_KEYS[idx - 1]
  form.value = { ...form.value, [key]: null }
  const { [idx]: _, ...rest } = bannerFiles.value
  bannerFiles.value = rest
}

function buildPatch(): Partial<Record<keyof VipBenefits, string | number | boolean | null>> {
  const payload = buildPatchPayload(form.value, initialForm.value) as Partial<Record<keyof VipBenefits, string | number | boolean | null>>
  if (avatarFile.value) {
    payload.avatarImageUrl = undefined
  }
  for (let i = 1; i <= 5; i++) {
    if (bannerFiles.value[i]) (payload as Record<string, unknown>)[`bannerImageUrl${i}`] = undefined
  }
  return payload
}

const hasChanges = computed(() => {
  const patch = buildPatch()
  if (Object.keys(patch).length > 0) return true
  if (avatarFile.value) return true
  if (Object.keys(bannerFiles.value).length > 0) return true
  return false
})

const isSubmitting = ref(false)

async function handleSubmit() {
  const patch = buildPatch()
  const hasFiles = !!avatarFile.value || Object.keys(bannerFiles.value).length > 0

  if (!hasFiles && Object.keys(patch).length === 0) return

  isSubmitting.value = true
  try {
    if (hasFiles) {
      const fd = new FormData()
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue
        fd.append(k, v === null ? "" : String(v))
      }
      if (avatarFile.value) fd.append("avatar", avatarFile.value)
      for (let i = 1; i <= 5; i++) {
        const file = bannerFiles.value[i]
        if (file) fd.append(`banner${i}`, file)
      }
      const res = (await $fetch("/api/athletes/self/vip-settings", {
        method: "PATCH",
        body: fd,
      })) as ApiResponse<VipBenefits>
      handleResponse(res)
      if (res.success && res.data) {
        avatarFile.value = null
        bannerFiles.value = {}
        const updated = res.data
        form.value = {
          ...form.value,
          avatarImageUrl: updated.avatarImageUrl ?? null,
          bannerImageUrl1: updated.bannerImageUrl1 ?? null,
          bannerImageUrl2: updated.bannerImageUrl2 ?? null,
          bannerImageUrl3: updated.bannerImageUrl3 ?? null,
          bannerImageUrl4: updated.bannerImageUrl4 ?? null,
          bannerImageUrl5: updated.bannerImageUrl5 ?? null,
        }
        initialForm.value = { ...form.value }
      }
    } else {
      const res = (await $fetch("/api/athletes/self/vip-settings", {
        method: "PATCH",
        body: patch,
      })) as ApiResponse<VipBenefits>
      handleResponse(res)
      if (res.success && res.data) {
        const updated = res.data
        form.value = {
          avatarImageUrl: updated.avatarImageUrl ?? null,
          bannerImageUrl1: updated.bannerImageUrl1 ?? null,
          bannerImageUrl2: updated.bannerImageUrl2 ?? null,
          bannerImageUrl3: updated.bannerImageUrl3 ?? null,
          bannerImageUrl4: updated.bannerImageUrl4 ?? null,
          bannerImageUrl5: updated.bannerImageUrl5 ?? null,
          profileDescription: updated.profileDescription ?? null,
          displayProfileDescription: updated.displayProfileDescription ?? false,
          alias: updated.alias ?? null,
          displayAlias: updated.displayAlias ?? false,
          facebook: updated.facebook ?? null,
          displayFacebook: updated.displayFacebook ?? false,
          instagram: updated.instagram ?? null,
          displayInstagram: updated.displayInstagram ?? false,
          tiktok: updated.tiktok ?? null,
          displayTiktok: updated.displayTiktok ?? false,
          youtube: updated.youtube ?? null,
          displayYoutube: updated.displayYoutube ?? false,
          vipPhoneNumber: updated.vipPhoneNumber ?? null,
          displayMobilePhone: updated.displayMobilePhone ?? false,
        }
        initialForm.value = { ...form.value }
      }
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

function handleResponse(response: ApiResponse<VipBenefits>) {
  const msg = response.message[locale.value as "en" | "vi"] ?? response.message.en
  if (response.success) {
    toast.add({ severity: "success", summary: t("general.success"), detail: msg, life: 3000 })
  } else {
    toast.add({ severity: "error", summary: t("general.updateError"), detail: msg, life: 5000 })
  }
}

useHead({
  title: () => t("profile.tabs.vipBenefits"),
})
</script>
