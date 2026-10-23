import { buildPatchPayload } from "~/lib/domain/patch-payload"
import type { UserSelfPatchSchema } from "~/lib/zod/schemas/users.schema"
import type { ApiResponse } from "~/types/api"
import type { UserPrivate } from "~/types/users"
import type { z } from "zod"

export type PersonalInfo = Required<z.infer<typeof UserSelfPatchSchema>>

/** The signed-in athlete's personal details and competition settings: fields, the optional photo, and saving only what changed. */
export function usePersonalInfoForm() {
  const toast = useToast()
  const { t } = useI18n()
  const apiMessage = useApiMessage()
  const { data: profileResponse, pending, error, refresh } = useProfileAthlete()
  const userData = computed(() => profileResponse.value?.athlete ?? null)

  const formData = ref<PersonalInfo>({
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
    { immediate: true },
  )

  const photoFile = ref<File | null>(null)
  const setPhoto = (file: File | null) => { photoFile.value = file }

  const isSubmitting = ref(false)
  async function submit() {
    if (!userData.value) return
    const payload = buildPatchPayload<PersonalInfo>(formData.value, userData.value)
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
        toast.add({ severity: "success", summary: t("general.success"), detail: apiMessage(response), life: 3000 })
      } else {
        toast.add({ severity: "error", summary: t("general.updateError"), detail: apiMessage(response), life: 5000 })
      }
    } catch {
      toast.add({ severity: "error", summary: t("general.updateError"), detail: t("general.validationError"), life: 5000 })
    } finally {
      isSubmitting.value = false
    }
  }

  return reactive({ userData, pending, error, formData, isSubmitting, setPhoto, submit })
}
