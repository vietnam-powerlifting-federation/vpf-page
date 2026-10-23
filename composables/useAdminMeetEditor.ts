import { fromIsoDate, toIsoDate } from "~/lib/domain/date"
import { slugifyMeetName } from "~/lib/domain/meet-formatters"
import type { ApiResponse } from "~/types/api"
import type { MeetPublic } from "~/types/meets"
import type { MeetType } from "~/types/union-types"

export type AdminMeetEditor = ReturnType<typeof createMeetEditor>["editor"]

const ADMIN_MEET_EDITOR_KEY: InjectionKey<AdminMeetEditor> = Symbol("admin-meet-editor")

function createMeetEditor() {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const localePath = useLocalePath()
  const notify = useNotify()

  const meetId = computed(() => String(route.params.id))
  const isNew = computed(() => meetId.value === "new")

  const form = reactive({
    meetName: "",
    meetSlug: "",
    city: "" as string | null,
    type: null as MeetType | null,
    mediaLink: "" as string | null,
    systemYear: new Date().getFullYear(),
    entryFee: null as number | null,
    allowGuestRegistration: true,
    allowSpotterRegistration: true,
    legacy: false,
  })

  const published = ref(false)
  const hostDate = ref<Date | null>(null)
  const startRegistration = ref<Date | null>(null)
  const closeRegistration = ref<Date | null>(null)
  const legacyLocked = ref(false)

  const typeOptions = computed(() => ([
    { label: t("general.meetTypeNational"), value: "national" },
    { label: t("general.meetTypeNationalQualifier"), value: "national_qualifier" },
    { label: t("general.meetTypeAmateur"), value: "amateur" },
    { label: t("general.meetTypeProfessional"), value: "professional" },
    { label: t("general.meetTypeOther"), value: "other" },
  ]))

  // Not awaited here (the screen awaits `ready`), so the state can be provided to its parts right away.
  const ready = isNew.value
    ? Promise.resolve()
    : $fetch<ApiResponse<{ meet: MeetPublic }>>(`/api/meets/${meetId.value}`, {
      credentials: "include",
      ignoreResponseError: true,
    }).then((res) => {
      if (!res.success) return
      const meet = res.data.meet
      Object.assign(form, {
        meetName: meet.meetName,
        meetSlug: meet.meetSlug,
        city: meet.city,
        type: meet.type,
        mediaLink: meet.mediaLink,
        systemYear: meet.systemYear,
        entryFee: meet.entryFee,
        allowGuestRegistration: meet.allowGuestRegistration ?? true,
        allowSpotterRegistration: meet.allowSpotterRegistration ?? true,
        legacy: meet.legacy ?? false,
      })
      published.value = !meet.hidden
      hostDate.value = fromIsoDate(meet.hostDate)
      startRegistration.value = fromIsoDate(meet.startRegistration)
      closeRegistration.value = fromIsoDate(meet.closeRegistration)
      // `legacy` picks which table backs the meet, so it is immutable once results exist.
      legacyLocked.value = (res.data as { results?: unknown[] }).results?.length ? true : false
    })

  function suggestSlug() {
    if (!form.meetSlug && form.meetName) form.meetSlug = slugifyMeetName(form.meetName)
  }

  /** The system year defaults from the host date but stays editable (§2). */
  function syncSystemYear() {
    if (hostDate.value && isNew.value) form.systemYear = hostDate.value.getFullYear()
  }

  const saving = ref(false)

  async function save() {
    saving.value = true
    try {
      const res = await $fetch<ApiResponse<MeetPublic>>(
        isNew.value ? "/api/meets" : `/api/meets/${meetId.value}`,
        {
          method: isNew.value ? "POST" : "PATCH",
          credentials: "include",
          ignoreResponseError: true,
          body: {
            ...form,
            city: form.city || null,
            mediaLink: form.mediaLink || null,
            meetSlug: form.meetSlug || undefined,
            hidden: !published.value,
            hostDate: toIsoDate(hostDate.value),
            startRegistration: toIsoDate(startRegistration.value),
            closeRegistration: toIsoDate(closeRegistration.value),
          },
        },
      )

      notify.result(res)

      if (res.success && isNew.value) {
        router.replace(localePath(`/admin/meets/${res.data.meetId}`))
      }
    } finally {
      saving.value = false
    }
  }

  const cloneOpen = ref(false)
  const cloning = ref(false)
  const cloneHostDate = ref<Date | null>(null)
  const cloneForm = reactive({ meetName: "", systemYear: new Date().getFullYear() + 1 })

  async function cloneMeet() {
    cloning.value = true
    try {
      const res = await $fetch<ApiResponse<MeetPublic>>(`/api/meets/${meetId.value}/clone`, {
        method: "POST",
        credentials: "include",
        ignoreResponseError: true,
        body: {
          meetName: cloneForm.meetName,
          systemYear: cloneForm.systemYear,
          hostDate: toIsoDate(cloneHostDate.value),
        },
      })
      notify.result(res, 5000)
      if (res.success) {
        cloneOpen.value = false
        router.push(localePath(`/admin/meets/${res.data.meetId}`))
      }
    } finally {
      cloning.value = false
    }
  }

  const deleteOpen = ref(false)
  const deleting = ref(false)
  const deleteForm = reactive({ confirmName: "", reason: "" })

  async function deleteMeet() {
    deleting.value = true
    try {
      const res = await $fetch<ApiResponse<{ meetId: number }>>(`/api/meets/${meetId.value}`, {
        method: "DELETE",
        credentials: "include",
        ignoreResponseError: true,
        body: { ...deleteForm },
      })
      notify.result(res, 5000)
      if (res.success) router.push(localePath("/admin/meets"))
    } finally {
      deleting.value = false
      deleteOpen.value = false
    }
  }

  const bans = useMeetBanList(meetId, isNew, () => form.meetName)

  useHead({ title: () => (isNew.value ? t("admin.meets.create") : form.meetName) })

  const editor = reactive({
    meetId, isNew, form, published, hostDate, startRegistration, closeRegistration, legacyLocked, typeOptions,
    suggestSlug, syncSystemYear, saving, save,
    cloneOpen, cloning, cloneHostDate, cloneForm, cloneMeet,
    deleteOpen, deleting, deleteForm, deleteMeet,
    bans,
  })
  return { editor, ready }
}

/**
 * The meet editor's state, shared with its parts through provide/inject: the form, the clone and
 * delete dialogs and the ban list all work on the same meet. Call once from the screen, then
 * `await ready` so the meet is loaded before the page renders.
 */
export function useAdminMeetEditorPage() {
  const { editor, ready } = createMeetEditor()
  provide(ADMIN_MEET_EDITOR_KEY, editor)
  return { editor, ready }
}

export function useAdminMeetEditor(): AdminMeetEditor {
  const editor = inject(ADMIN_MEET_EDITOR_KEY)
  if (!editor) throw new Error("useAdminMeetEditor() needs useAdminMeetEditorPage() in a parent screen")
  return editor
}
