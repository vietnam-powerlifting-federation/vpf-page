import { buildPatchPayload } from "~/lib/domain/patch-payload"
import { defaultVipForm, toVipFormState } from "~/lib/domain/vip"
import type { ApiResponse } from "~/types/api"
import type { VipBenefits, VipSettingsFormState } from "~/types/vip"

/**
 * The VIP profile settings: the form, its pictures, saving only what changed, and the warning
 * before leaving with unsaved edits. `editable` is whether saving is allowed (an active membership).
 */
export function useVipSettingsForm(settings: Ref<VipBenefits | null>, editable: Ref<boolean>) {
  const { t } = useI18n()
  const notify = useNotify()
  const apiMessage = useApiMessage()
  const toast = useToast()

  const form = ref<VipSettingsFormState>(defaultVipForm())
  const initialForm = ref<VipSettingsFormState>(defaultVipForm())

  watch(
    settings,
    (val) => {
      const next = val ? toVipFormState(val) : defaultVipForm()
      form.value = next
      initialForm.value = { ...next }
    },
    { immediate: true },
  )

  const images = useVipImages(form)

  function updateField(key: string, value: string | boolean | null) {
    form.value = { ...form.value, [key]: value }
  }

  function updateDecorators(decorator1: string | null, decorator2: string | null) {
    form.value = { ...form.value, decorator1, decorator2 }
  }

  function buildPatch(): Partial<Record<keyof VipBenefits, string | number | boolean | null>> {
    // includeNulls so clearing a cover photo or a text field actually reaches the API.
    const payload = buildPatchPayload(form.value, initialForm.value, { includeNulls: true })
    // A pending file supersedes whatever url the form still holds for that slot.
    return Object.fromEntries(
      Object.entries(payload).filter(([key]) => !images.supersededKeys.has(key)),
    ) as Partial<Record<keyof VipBenefits, string | number | boolean | null>>
  }

  const hasChanges = computed(() => Object.keys(buildPatch()).length > 0 || images.hasPendingFiles)

  const isSubmitting = ref(false)

  /** Saves the changes. Returns whether it worked (or there was nothing to save). */
  async function submit(): Promise<boolean> {
    const patch = buildPatch()
    const hasFiles = images.hasPendingFiles
    if (!hasFiles && Object.keys(patch).length === 0) return true

    isSubmitting.value = true
    try {
      let body: FormData | Record<string, unknown> = patch
      if (hasFiles) {
        const fd = new FormData()
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined) continue
          fd.append(key, value === null ? "" : String(value))
        }
        images.appendFiles(fd)
        body = fd
      }

      // A plain `string` url: a literal makes the compiler resolve the typed API route table and run out of stack.
      const url: string = "/api/athletes/me/vip-settings"
      const res = await $fetch<ApiResponse<VipBenefits>>(url, {
        method: "PATCH",
        body,
      })

      if (res.success) toast.add({ severity: "success", summary: t("general.success"), detail: apiMessage(res), life: 3000 })
      else notify.apiError(res, t("general.updateError"))
      if (!res.success || !res.data) return false

      images.revokeAllPending()
      images.markSaved()
      const next = toVipFormState(res.data)
      form.value = next
      initialForm.value = { ...next }
      return true
    } catch {
      notify.error(t("general.validationError"), t("general.updateError"))
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // Non-VIP athletes can edit freely to try the feature, but nothing is saved, so
  // there is nothing to warn them about on the way out.
  const guardActive = computed(() => editable.value && hasChanges.value)
  const { promptVisible, discard: discardChanges, keepEditing, saveAndLeave } = useUnsavedChanges(guardActive)

  return reactive({
    form, images, hasChanges, isSubmitting, submit, updateField, updateDecorators,
    promptVisible, discardChanges, keepEditing, saveAndLeave: () => saveAndLeave(submit),
  })
}
