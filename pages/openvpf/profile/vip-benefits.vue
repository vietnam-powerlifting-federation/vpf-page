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

    <div v-else class="space-y-6">
      <!-- Membership status and renewal -->
      <ProfileVipMembershipCard
        v-if="showActive || vipExpiresAt"
        :expires-at="vipExpiresAt"
        :active="showActive"
        @renew="goToCheckout"
      />

      <!-- Upsell for athletes without an active membership -->
      <div v-if="!showActive" class="border border-surface-600 rounded-lg p-6 bg-surface-800 space-y-3">
        <div class="flex items-center gap-2">
          <i class="pi pi-star-fill text-primary text-xl" />
          <h2 class="text-lg font-semibold text-surface-0">{{ $t("profile.vipBenefits.upsellTitle") }}</h2>
        </div>
        <p class="text-surface-300">{{ $t("profile.vipBenefits.description") }}</p>
        <ul class="text-sm text-surface-300 space-y-1">
          <li v-for="feature in upsellFeatures" :key="feature" class="flex items-start gap-2">
            <i class="pi pi-check text-primary text-xs mt-1 shrink-0" />
            <span>{{ $t(feature) }}</span>
          </li>
        </ul>
        <p class="text-sm text-surface-400">{{ $t("profile.vipBenefits.upsellTryIt") }}</p>
        <Button
          :label="`${$t('profile.vipBenefits.registerNow')} — ${formattedPrice}`"
          icon="pi pi-star"
          class="bg-primary"
          @click="goToCheckout"
        />
      </div>

      <!-- Live preview -->
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.livePreview") }}</span>
          <Button
            :label="$t('profile.vipBenefits.fullPreview')"
            icon="pi pi-window-maximize"
            severity="secondary"
            text
            size="small"
            @click="fullPreviewVisible = true"
          />
        </div>
        <ProfileVipProfilePreview
          :full-name="athleteName"
          :form="form"
          :avatar-preview="avatarPreview"
          :banner-previews="bannerPreviews"
          scale="compact"
        />
      </div>

      <ProfileVipSettingsForm
        :form="form"
        :athlete-name="athleteName"
        :avatar-preview="avatarPreview"
        :banner-slots="bannerSlots"
        :next-banner-slot="nextBannerSlot"
        :is-submitting="isSubmitting"
        :has-changes="hasChanges"
        :locked="!showActive"
        :public-profile-url="publicProfileUrl"
        @update-field="handleFieldUpdate"
        @update-decorators="handleDecoratorUpdate"
        @avatar-click="avatarInputRef?.click()"
        @trigger-banner-input="bannerInputRef?.click()"
        @clear-banner="clearBanner"
        @submit="handleSubmit"
        @register="goToCheckout"
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
    </div>

    <!-- Full-scale preview -->
    <Dialog
      v-model:visible="fullPreviewVisible"
      modal
      dismissable-mask
      :header="$t('profile.vipBenefits.fullPreview')"
      :style="{ width: 'min(1100px, 95vw)' }"
    >
      <ProfileVipProfilePreview
        :full-name="athleteName"
        :form="form"
        :avatar-preview="avatarPreview"
        :banner-previews="bannerPreviews"
        scale="full"
      />
    </Dialog>

    <!-- Crop before upload -->
    <ProfileImageCropperDialog
      v-model:visible="cropVisible"
      :src="cropSrc"
      :aspect-ratio="cropSettings.aspectRatio"
      :output-width="cropSettings.width"
      :output-height="cropSettings.height"
      :output-type="cropSettings.type"
      :file-name="cropSettings.fileName"
      @apply="onCropApply"
      @error="onCropError"
      @update:visible="onCropVisibilityChange"
    />

    <!-- Unsaved changes -->
    <Dialog
      v-model:visible="promptVisible"
      modal
      :closable="false"
      :header="$t('profile.vipBenefits.unsavedTitle')"
      :style="{ width: 'min(460px, 95vw)' }"
    >
      <p class="text-surface-300">{{ $t("profile.vipBenefits.unsavedMessage") }}</p>
      <template #footer>
        <Button :label="$t('profile.vipBenefits.unsavedKeepEditing')" severity="secondary" text @click="keepEditing" />
        <Button :label="$t('profile.vipBenefits.unsavedDiscard')" severity="danger" text @click="discardChanges" />
        <Button
          :label="$t('profile.vipBenefits.unsavedSaveAndLeave')"
          class="bg-primary text-primary-contrast"
          :loading="isSubmitting"
          @click="saveAndLeave(handleSubmit)"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from "vue"
import { buildPatchPayload } from "~/lib/utils/client"
import { isVipActive } from "~/lib/utils/vip"
import type { ApiResponse } from "~/types/api"
import type { VipBenefits, VipSettingsFormState } from "~/types/vip"
import { CHECKOUT_STORAGE_KEY } from "~/types/checkout"
import type { CheckoutItem } from "~/types/checkout"

definePageMeta({
  layout: "openvpf-profile",
  middleware: "auth",
})

const { t } = useI18n()
const apiMessage = useApiMessage()
const toast = useToast()

const { data: profileResponse, pending } = useProfileAthlete()

const userData = computed(() => profileResponse.value?.athlete ?? null)
const vipSettings = computed(() => profileResponse.value?.vipSettings ?? null)

const vipExpiresAt = computed(() => userData.value?.vipMembershipExpiresAt ?? null)
const vipActive = computed(() => isVipActive(vipExpiresAt.value))
const isAdmin = computed(() => userData.value?.role === "admin")
const athleteName = computed(() => userData.value?.fullName ?? "")

const adminForceActive = ref(false)
const showActive = computed(() => (adminForceActive.value ? !vipActive.value : vipActive.value))

const publicProfileUrl = computed(() => {
  const athlete = userData.value
  if (!athlete || !showActive.value) return null
  return `/openvpf/athletes/${athlete.slug || athlete.vpfId}`
})

const VIP_PRICE = 300_000
const formattedPrice = computed(() => `${VIP_PRICE.toLocaleString("vi-VN")} VND`)

const upsellFeatures = [
  "profile.vipBenefits.featureBanners",
  "profile.vipBenefits.featureNameColor",
  "profile.vipBenefits.featureSocials",
  "profile.vipBenefits.featureBio",
]

function goToCheckout() {
  const item: CheckoutItem = {
    id: "vip-1year",
    name: { en: "1 Year VIP Membership", vi: "Gói VIP 1 năm" },
    amount: VIP_PRICE,
    type: "vip",
    plan: "1year",
  }
  localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify([item]))
  navigateTo("/openvpf/checkout")
}

const defaultForm = (): VipSettingsFormState => ({
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
  decorator1: null,
  decorator2: null,
})

function toFormState(val: VipBenefits): VipSettingsFormState {
  const base = defaultForm()
  for (const key of Object.keys(base) as (keyof VipSettingsFormState)[]) {
    const incoming = val[key as keyof VipBenefits]
    // Booleans default to false, everything else to null.
    base[key] = (incoming ?? (typeof base[key] === "boolean" ? false : null)) as never
  }
  return base
}

const form = ref<VipSettingsFormState>(defaultForm())
const initialForm = ref<VipSettingsFormState>(defaultForm())

watch(
  vipSettings,
  (val) => {
    const next = val ? toFormState(val) : defaultForm()
    form.value = next
    initialForm.value = { ...next }
  },
  { immediate: true }
)

/* ---------- Pending images ---------- */
// The object url is created once, at crop time, rather than per render: the live
// preview re-renders on every keystroke and would otherwise churn blob urls forever.
type PendingImage = { file: File; url: string }

const avatarInputRef = ref<HTMLInputElement | null>(null)
const bannerInputRef = ref<HTMLInputElement | null>(null)
const avatarPending = ref<PendingImage | null>(null)
const bannerPending = ref<Record<number, PendingImage>>({})

function setAvatarPending(file: File) {
  if (avatarPending.value) URL.revokeObjectURL(avatarPending.value.url)
  avatarPending.value = { file, url: URL.createObjectURL(file) }
}

function setBannerPending(slot: number, file: File) {
  const existing = bannerPending.value[slot]
  if (existing) URL.revokeObjectURL(existing.url)
  bannerPending.value = { ...bannerPending.value, [slot]: { file, url: URL.createObjectURL(file) } }
}

function clearBannerPending(slot: number) {
  const existing = bannerPending.value[slot]
  if (!existing) return
  URL.revokeObjectURL(existing.url)
  const { [slot]: _removed, ...rest } = bannerPending.value
  bannerPending.value = rest
}

function revokeAllPending() {
  if (avatarPending.value) URL.revokeObjectURL(avatarPending.value.url)
  for (const pending of Object.values(bannerPending.value)) URL.revokeObjectURL(pending.url)
  avatarPending.value = null
  bannerPending.value = {}
}

onBeforeUnmount(() => {
  revokeAllPending()
  if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
})

// uploadVipImage overwrites the same R2 key, so a re-upload keeps its url and the
// browser serves the stale image. Display only — never written back into the form.
const savedAt = ref(0)
function withBust(url: string | null): string | null {
  if (!url || !savedAt.value) return url
  return `${url}${url.includes("?") ? "&" : "?"}t=${savedAt.value}`
}

const BANNER_KEYS = ["bannerImageUrl1", "bannerImageUrl2", "bannerImageUrl3", "bannerImageUrl4", "bannerImageUrl5"] as const

const avatarPreview = computed(() => avatarPending.value?.url ?? withBust(form.value.avatarImageUrl ?? null))

const bannerSlots = computed<(string | null)[]>(() =>
  BANNER_KEYS.map((key, i) => bannerPending.value[i + 1]?.url ?? withBust(form.value[key] ?? null))
)
const bannerPreviews = computed(() => bannerSlots.value.filter((url): url is string => !!url))

const nextBannerSlot = computed(() => {
  for (let i = 1; i <= 5; i++) {
    if (!bannerSlots.value[i - 1]) return i
  }
  return null
})

function handleFieldUpdate(key: string, value: string | boolean | null) {
  form.value = { ...form.value, [key]: value }
}

function handleDecoratorUpdate(decorator1: string | null, decorator2: string | null) {
  form.value = { ...form.value, decorator1, decorator2 }
}

function clearBanner(idx: number) {
  clearBannerPending(idx)
  form.value = { ...form.value, [BANNER_KEYS[idx - 1]]: null }
}

/* ---------- Cropping ---------- */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const cropVisible = ref(false)
const cropSrc = ref<string | null>(null)
const cropTarget = ref<"avatar" | number | null>(null)
const fullPreviewVisible = ref(false)

const cropSettings = computed(() =>
  cropTarget.value === "avatar"
    // Avatars sit in a circular mask over a dark surface, so alpha has to survive.
    ? { aspectRatio: 1, width: 512, height: 512, type: "image/png", fileName: "avatar.png" }
    // 24:9 matches BannerSlideshow's slide geometry exactly.
    : { aspectRatio: 24 / 9, width: 1600, height: 600, type: "image/jpeg", fileName: "banner.jpg" }
)

function pickFile(e: Event): File | null {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ""
  if (!file) return null
  if (file.size > MAX_UPLOAD_BYTES) {
    toast.add({
      severity: "error",
      summary: t("general.updateError"),
      detail: t("profile.vipBenefits.imageTooLarge"),
      life: 5000,
    })
    return null
  }
  return file
}

function openCropper(file: File, target: "avatar" | number) {
  cropTarget.value = target
  cropSrc.value = URL.createObjectURL(file)
  cropVisible.value = true
}

function onAvatarChange(e: Event) {
  const file = pickFile(e)
  if (!file) return
  // Cropping rasterises to a single frame, which would kill an animated GIF.
  if (file.type === "image/gif") {
    setAvatarPending(file)
    return
  }
  openCropper(file, "avatar")
}

function onBannerChange(e: Event) {
  const file = pickFile(e)
  if (!file) return
  const slot = nextBannerSlot.value
  if (slot === null) return
  if (file.type === "image/gif") {
    setBannerPending(slot, file)
    return
  }
  openCropper(file, slot)
}

function onCropApply(file: File) {
  if (cropTarget.value === "avatar") setAvatarPending(file)
  else if (typeof cropTarget.value === "number") setBannerPending(cropTarget.value, file)
}

function onCropError() {
  toast.add({
    severity: "error",
    summary: t("general.updateError"),
    detail: t("profile.vipBenefits.cropFailed"),
    life: 5000,
  })
}

function onCropVisibilityChange(visible: boolean) {
  cropVisible.value = visible
  if (visible) return
  if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
  cropSrc.value = null
  cropTarget.value = null
}

/* ---------- Saving ---------- */
function buildPatch(): Partial<Record<keyof VipBenefits, string | number | boolean | null>> {
  // includeNulls so clearing a cover photo or a text field actually reaches the API.
  const payload = buildPatchPayload(form.value, initialForm.value, { includeNulls: true })

  // A pending file supersedes whatever url the form still holds for that slot.
  const superseded = new Set<string>()
  if (avatarPending.value) superseded.add("avatarImageUrl")
  for (let i = 1; i <= 5; i++) {
    if (bannerPending.value[i]) superseded.add(BANNER_KEYS[i - 1])
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !superseded.has(key))
  ) as Partial<Record<keyof VipBenefits, string | number | boolean | null>>
}

const hasChanges = computed(() => {
  if (Object.keys(buildPatch()).length > 0) return true
  if (avatarPending.value) return true
  return Object.keys(bannerPending.value).length > 0
})

const isSubmitting = ref(false)

async function handleSubmit(): Promise<boolean> {
  const patch = buildPatch()
  const hasFiles = !!avatarPending.value || Object.keys(bannerPending.value).length > 0
  if (!hasFiles && Object.keys(patch).length === 0) return true

  isSubmitting.value = true
  try {
    let body: FormData | typeof patch = patch
    if (hasFiles) {
      const fd = new FormData()
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue
        fd.append(key, value === null ? "" : String(value))
      }
      if (avatarPending.value) fd.append("avatar", avatarPending.value.file)
      for (let i = 1; i <= 5; i++) {
        const pending = bannerPending.value[i]
        if (pending) fd.append(`banner${i}`, pending.file)
      }
      body = fd
    }

    const res = (await $fetch("/api/athletes/self/vip-settings", {
      method: "PATCH",
      body,
    })) as ApiResponse<VipBenefits>

    handleResponse(res)
    if (!res.success || !res.data) return false

    revokeAllPending()
    savedAt.value = Date.now()
    const next = toFormState(res.data)
    form.value = next
    initialForm.value = { ...next }
    return true
  } catch {
    toast.add({
      severity: "error",
      summary: t("general.updateError"),
      detail: t("general.validationError"),
      life: 5000,
    })
    return false
  } finally {
    isSubmitting.value = false
  }
}

function handleResponse(response: ApiResponse<VipBenefits>) {
  const msg = apiMessage(response)
  if (response.success) {
    toast.add({ severity: "success", summary: t("general.success"), detail: msg, life: 3000 })
  } else {
    toast.add({ severity: "error", summary: t("general.updateError"), detail: msg, life: 5000 })
  }
}

// Non-VIP athletes can edit freely to try the feature, but nothing is saved, so
// there is nothing to warn them about on the way out.
const guardActive = computed(() => showActive.value && hasChanges.value)
const { promptVisible, discard: discardChanges, keepEditing, saveAndLeave } = useUnsavedChanges(guardActive)

useHead({
  title: () => t("profile.tabs.vipBenefits"),
})
</script>
