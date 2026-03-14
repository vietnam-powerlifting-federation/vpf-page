<template>
  <div class="min-h-full">
    <h1 class="text-2xl font-bold mb-6 text-surface-0">{{ $t("profile.tabs.vipBenefits") }}</h1>

    <div v-if="pending" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <template v-else>
      <p v-if="!vipActive" class="text-surface-300">{{ $t("profile.vipBenefits.description") }}</p>
      <p v-if="!vipActive" class="text-surface-400 text-sm">{{ $t("profile.vipBenefits.features") }}</p>
      <img v-if="!vipActive" :src="vipPreview" alt="" class="h-full w-full object-cover">
      <div v-if="!vipActive" class="pt-4">
        <Button :label="$t('profile.vipBenefits.registerNow')" class="bg-primary" />
        <span class="ml-3 text-sm text-surface-500">({{ $t("profile.demo") }})</span>
      </div>

      <div v-else class="space-y-6">
        <!-- Avatar -->
        <div class="flex flex-wrap items-start gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.avatar") }}</label>
            <div class="w-24 h-24 rounded-lg overflow-hidden bg-surface-700 flex items-center justify-center border border-surface-600">
              <img
                v-if="avatarPreview"
                :src="avatarPreview"
                alt=""
                class="w-full h-full object-cover"
              >
              <i v-else class="pi pi-user text-3xl text-surface-500" />
            </div>
            <p class="text-sm text-surface-400">{{ $t("profile.vipBenefits.changeAvatar") }}</p>
            <input
              ref="avatarInputRef"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="hidden"
              @change="onAvatarChange"
            >
            <Button
              :label="$t('profile.vipBenefits.change')"
              size="small"
              class="bg-primary text-primary-contrast"
              @click="avatarInputRef?.click()"
            />
          </div>
        </div>

        <!-- Cover photos -->
        <div>
          <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.coverPhotos") }}</label>
          <p class="text-sm text-surface-500 mb-2">{{ $t("profile.vipBenefits.maxPhotos") }}</p>
          <div class="flex flex-wrap gap-3">
            <div
              v-for="idx in 5"
              :key="idx"
              class="w-20 h-20 rounded-lg overflow-hidden bg-surface-700 border border-surface-600 flex items-center justify-center relative shrink-0"
            >
              <img
                v-if="bannerPreview(idx)"
                :src="bannerPreview(idx) ?? ''"
                alt=""
                class="w-full h-full object-cover"
              >
              <i v-else class="pi pi-image text-2xl text-surface-500" />
              <button
                v-if="bannerPreview(idx)"
                type="button"
                class="absolute top-0.5 right-0.5 w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
                aria-label="Remove"
                @click="clearBanner(idx)"
              >
                <i class="pi pi-times" />
              </button>
            </div>
            <div
              v-if="nextBannerSlot !== null"
              class="w-20 h-20 rounded-lg border-2 border-dashed border-surface-600 flex items-center justify-center shrink-0 cursor-pointer hover:border-primary hover:bg-surface-800"
              @click="triggerBannerInput"
            >
              <i class="pi pi-plus text-surface-500" />
            </div>
          </div>
          <input
            ref="bannerInputRef"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            class="hidden"
            @change="onBannerChange"
          >
        </div>

        <!-- About me -->
        <div class="flex flex-wrap items-start gap-4 gap-y-2">
          <div class="flex-1 min-w-[200px]">
            <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.aboutMe") }}</label>
            <Textarea
              v-model="form.profileDescription"
              :placeholder="$t('profile.vipBenefits.aboutMePlaceholder')"
              class="w-full"
              rows="4"
            />
          </div>
          <div class="flex items-center gap-2 pt-8">
            <ToggleSwitch
              :model-value="!!form.displayProfileDescription"
              :aria-label="$t('profile.vipBenefits.displayOnProfile')"
              @update:model-value="(v: boolean) => (form.displayProfileDescription = v)"
            />
            <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
          </div>
        </div>

        <!-- Nickname -->
        <div class="flex flex-wrap items-center gap-4 gap-y-2">
          <div class="flex-1 min-w-[200px]">
            <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.nickname") }}</label>
            <InputText
              v-model="form.alias"
              :placeholder="$t('profile.vipBenefits.nicknamePlaceholder')"
              class="w-full"
            />
          </div>
          <div class="flex items-center gap-2 pt-8">
            <ToggleSwitch
              :model-value="!!form.displayAlias"
              :aria-label="$t('profile.vipBenefits.displayOnProfile')"
              @update:model-value="(v: boolean) => (form.displayAlias = v)"
            />
            <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
          </div>
        </div>

        <!-- Facebook -->
        <div class="flex flex-wrap items-center gap-4 gap-y-2">
          <div class="flex-1 min-w-[200px]">
            <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.facebook") }}</label>
            <InputText
              v-model="form.facebook"
              :placeholder="$t('profile.vipBenefits.facebookPlaceholder')"
              class="w-full"
            />
          </div>
          <div class="flex items-center gap-2 pt-8">
            <ToggleSwitch
              :model-value="!!form.displayFacebook"
              :aria-label="$t('profile.vipBenefits.displayOnProfile')"
              @update:model-value="(v: boolean) => (form.displayFacebook = v)"
            />
            <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
          </div>
        </div>

        <!-- Instagram -->
        <div class="flex flex-wrap items-center gap-4 gap-y-2">
          <div class="flex-1 min-w-[200px]">
            <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.instagram") }}</label>
            <InputText
              v-model="form.instagram"
              :placeholder="$t('profile.vipBenefits.instagramPlaceholder')"
              class="w-full"
            />
          </div>
          <div class="flex items-center gap-2 pt-8">
            <ToggleSwitch
              :model-value="!!form.displayInstagram"
              :aria-label="$t('profile.vipBenefits.displayOnProfile')"
              @update:model-value="(v: boolean) => (form.displayInstagram = v)"
            />
            <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
          </div>
        </div>

        <!-- TikTok -->
        <div class="flex flex-wrap items-center gap-4 gap-y-2">
          <div class="flex-1 min-w-[200px]">
            <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.tiktok") }}</label>
            <InputText
              v-model="form.tiktok"
              :placeholder="$t('profile.vipBenefits.tiktokPlaceholder')"
              class="w-full"
            />
          </div>
          <div class="flex items-center gap-2 pt-8">
            <ToggleSwitch
              :model-value="!!form.displayTiktok"
              :aria-label="$t('profile.vipBenefits.displayOnProfile')"
              @update:model-value="(v: boolean) => (form.displayTiktok = v)"
            />
            <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
          </div>
        </div>

        <!-- YouTube -->
        <div class="flex flex-wrap items-center gap-4 gap-y-2">
          <div class="flex-1 min-w-[200px]">
            <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.youtube") }}</label>
            <InputText
              v-model="form.youtube"
              :placeholder="$t('profile.vipBenefits.youtubePlaceholder')"
              class="w-full"
            />
          </div>
          <div class="flex items-center gap-2 pt-8">
            <ToggleSwitch
              :model-value="!!form.displayYoutube"
              :aria-label="$t('profile.vipBenefits.displayOnProfile')"
              @update:model-value="(v: boolean) => (form.displayYoutube = v)"
            />
            <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
          </div>
        </div>

        <!-- Phone -->
        <div class="flex flex-wrap items-center gap-4 gap-y-2">
          <div class="flex-1 min-w-[200px]">
            <label class="block mb-2 text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.phoneNumber") }}</label>
            <InputText
              v-model="form.vipPhoneNumber"
              :placeholder="$t('profile.vipBenefits.phoneNumberPlaceholder')"
              class="w-full"
            />
          </div>
          <div class="flex items-center gap-2 pt-8">
            <ToggleSwitch
              :model-value="!!form.displayMobilePhone"
              :aria-label="$t('profile.vipBenefits.displayOnProfile')"
              @update:model-value="(v: boolean) => (form.displayMobilePhone = v)"
            />
            <span class="text-sm text-surface-400">{{ $t("profile.vipBenefits.displayOnProfile") }}</span>
          </div>
        </div>

        <div class="pt-4 flex justify-center">
          <Button
            :label="$t('profile.vipBenefits.saveChanges')"
            class="bg-primary text-primary-contrast"
            :loading="isSubmitting"
            :disabled="isSubmitting || !hasChanges"
            @click="handleSubmit"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue"
import { useToast } from "primevue/usetoast"
import Button from "@/components/volt/Button.vue"
import InputText from "@/components/volt/InputText.vue"
import Textarea from "@/components/volt/Textarea.vue"
import ToggleSwitch from "@/components/volt/ToggleSwitch.vue"
import ProgressSpinner from "@/components/volt/ProgressSpinner.vue"
import { buildPatchPayload } from "~/lib/utils/client"
import { isVipActive } from "~/lib/utils/vip"
import vipPreview from "~/assets/img/vip-preview.png"
import type { ApiResponse } from "~/types/api"
import type { VipBenefits } from "~/types/vip"

definePageMeta({
  layout: "openvpf-profile",
  middleware: "auth",
})

const { t, locale } = useI18n()
const toast = useToast()

type AthleteDetailsResponse = {
  athlete: { vipMembershipExpiresAt?: string | null }
  vipSettings?: VipBenefits
}

const { data: profileResponse, pending } = useFetch<ApiResponse<AthleteDetailsResponse>>("/api/athletes/self", {
  query: { includeVipSettings: true },
  key: "openvpf-profile-vip",
})

const userData = computed(() => profileResponse.value?.data?.athlete ?? null)
const vipSettings = computed(() => profileResponse.value?.data?.vipSettings ?? null)

const vipActive = computed(() => isVipActive(userData.value?.vipMembershipExpiresAt ?? null))

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
  // Only submit changed fields (patch) and new image files
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
