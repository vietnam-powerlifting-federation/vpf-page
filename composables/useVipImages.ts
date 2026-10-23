import { VIP_BANNER_KEYS, vipCropSettings } from "~/lib/domain/vip"
import type { VipSettingsFormState } from "~/types/vip"

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

// The object url is created once, at crop time, rather than per render: the live
// preview re-renders on every keystroke and would otherwise churn blob urls forever.
type PendingImage = { file: File; url: string }

/**
 * The avatar and banner pictures being edited: files waiting to be uploaded, their previews,
 * and the crop step. A picture only reaches the server when the form is saved.
 */
export function useVipImages(form: Ref<VipSettingsFormState>) {
  const { t } = useI18n()
  const notify = useNotify()

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

  /** Drops every pending file, e.g. after they were saved. */
  function revokeAllPending() {
    if (avatarPending.value) URL.revokeObjectURL(avatarPending.value.url)
    for (const pending of Object.values(bannerPending.value)) URL.revokeObjectURL(pending.url)
    avatarPending.value = null
    bannerPending.value = {}
  }

  // uploadVipImage overwrites the same R2 key, so a re-upload keeps its url and the
  // browser serves the stale image. Display only: never written back into the form.
  const savedAt = ref(0)
  const markSaved = () => { savedAt.value = Date.now() }
  function withBust(url: string | null): string | null {
    if (!url || !savedAt.value) return url
    return `${url}${url.includes("?") ? "&" : "?"}t=${savedAt.value}`
  }

  const avatarPreview = computed(() => avatarPending.value?.url ?? withBust(form.value.avatarImageUrl ?? null))

  const bannerSlots = computed<(string | null)[]>(() =>
    VIP_BANNER_KEYS.map((key, i) => bannerPending.value[i + 1]?.url ?? withBust(form.value[key] ?? null)),
  )
  const bannerPreviews = computed(() => bannerSlots.value.filter((url): url is string => !!url))

  const nextBannerSlot = computed(() => {
    for (let i = 1; i <= 5; i++) {
      if (!bannerSlots.value[i - 1]) return i
    }
    return null
  })

  function clearBanner(slot: number) {
    clearBannerPending(slot)
    form.value = { ...form.value, [VIP_BANNER_KEYS[slot - 1]]: null }
  }

  const hasPendingFiles = computed(() => !!avatarPending.value || Object.keys(bannerPending.value).length > 0)

  /** Form fields whose url a pending file replaces, so they are not sent as text. */
  const supersededKeys = computed(() => {
    const keys = new Set<string>()
    if (avatarPending.value) keys.add("avatarImageUrl")
    for (let i = 1; i <= 5; i++) {
      if (bannerPending.value[i]) keys.add(VIP_BANNER_KEYS[i - 1])
    }
    return keys
  })

  /** The pending files as multipart fields, in the names the API expects. */
  function appendFiles(fd: FormData) {
    if (avatarPending.value) fd.append("avatar", avatarPending.value.file)
    for (let i = 1; i <= 5; i++) {
      const pending = bannerPending.value[i]
      if (pending) fd.append(`banner${i}`, pending.file)
    }
  }

  /* ---------- Cropping ---------- */
  const cropVisible = ref(false)
  const cropSrc = ref<string | null>(null)
  const cropTarget = ref<"avatar" | number | null>(null)
  const cropSettings = computed(() => vipCropSettings(cropTarget.value))

  /** The chosen file, or null when there is none or it is too large (then the athlete is told). */
  function acceptFile(input: HTMLInputElement): File | null {
    const file = input.files?.[0] ?? null
    input.value = ""
    if (!file) return null
    if (file.size > MAX_UPLOAD_BYTES) {
      notify.error(t("profile.vipBenefits.imageTooLarge"), t("general.updateError"))
      return null
    }
    return file
  }

  function openCropper(file: File, target: "avatar" | number) {
    cropTarget.value = target
    cropSrc.value = URL.createObjectURL(file)
    cropVisible.value = true
  }

  function chooseAvatar(input: HTMLInputElement) {
    const file = acceptFile(input)
    if (!file) return
    // Cropping rasterises to a single frame, which would kill an animated GIF.
    if (file.type === "image/gif") {
      setAvatarPending(file)
      return
    }
    openCropper(file, "avatar")
  }

  function chooseBanner(input: HTMLInputElement) {
    const file = acceptFile(input)
    if (!file) return
    const slot = nextBannerSlot.value
    if (slot === null) return
    if (file.type === "image/gif") {
      setBannerPending(slot, file)
      return
    }
    openCropper(file, slot)
  }

  function applyCrop(file: File) {
    if (cropTarget.value === "avatar") setAvatarPending(file)
    else if (typeof cropTarget.value === "number") setBannerPending(cropTarget.value, file)
  }

  function cropFailed() {
    notify.error(t("profile.vipBenefits.cropFailed"), t("general.updateError"))
  }

  function setCropVisible(visible: boolean) {
    cropVisible.value = visible
    if (visible) return
    if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
    cropSrc.value = null
    cropTarget.value = null
  }

  onBeforeUnmount(() => {
    revokeAllPending()
    if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
  })

  return reactive({
    avatarPreview, bannerSlots, bannerPreviews, nextBannerSlot, clearBanner,
    hasPendingFiles, supersededKeys, appendFiles, revokeAllPending, markSaved,
    cropVisible, cropSrc, cropSettings,
    chooseAvatar, chooseBanner, applyCrop, cropFailed, setCropVisible,
  })
}
