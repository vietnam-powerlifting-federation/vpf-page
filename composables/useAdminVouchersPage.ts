import { toIsoDate } from "~/lib/domain/date"
import type { ApiResponse } from "~/types/api"
import type { PurchaseType, VoucherDiscountKind } from "~/types/union-types"
import type { Voucher, VoucherRevoked, VoucherWithUser } from "~/types/vouchers"

export type AdminVouchers = ReturnType<typeof createAdminVouchers>["vouchers"]

const ADMIN_VOUCHERS_KEY: InjectionKey<AdminVouchers> = Symbol("admin-vouchers")

type VoucherStats = { issued: number; redeemed: number; expired: number; available: number; totalDiscount: number }

function createAdminVouchers() {
  const { t } = useI18n()
  const notify = useNotify()
  const toast = useToast()
  const apiMessage = useApiMessage()
  const { typeLabel } = useVoucherDisplay()

  // --- The list and its filters -------------------------------------------------
  const statusFilter = ref<"all" | "available" | "used">("all")
  const statusOptions = computed(() => [
    { label: t("adminVouchers.filterAll"), value: "all" },
    { label: t("adminVouchers.filterAvailable"), value: "available" },
    { label: t("adminVouchers.filterUsed"), value: "used" },
  ])
  const vpfIdFilter = ref("")

  const query = computed(() => ({
    ...(statusFilter.value === "all" ? {} : { redeemed: statusFilter.value === "used" }),
    ...(vpfIdFilter.value.trim() ? { vpfId: vpfIdFilter.value.trim() } : {}),
  }))

  // Not awaited here (the screen awaits `ready`), so the state can be provided to its parts right away.
  const list = useFetch<ApiResponse<VoucherWithUser[]>>("/api/vouchers", { query, credentials: "include", ignoreResponseError: true })
  const rows = computed(() => (list.data.value?.success ? list.data.value.data : []))

  const statsFetch = useFetch<ApiResponse<VoucherStats>>("/api/vouchers/stats", { credentials: "include", ignoreResponseError: true })
  const stats = computed(() => (statsFetch.data.value?.success ? statsFetch.data.value.data : null))

  // Issued vs redeemed vs expired, and what it cost (§8).
  const statTiles = computed(() => [
    { label: "adminVouchers.statIssued", value: stats.value?.issued ?? 0 },
    { label: "adminVouchers.statRedeemed", value: stats.value?.redeemed ?? 0 },
    { label: "adminVouchers.statAvailable", value: stats.value?.available ?? 0 },
    { label: "adminVouchers.statExpired", value: stats.value?.expired ?? 0 },
    { label: "adminVouchers.statDiscount", value: `${new Intl.NumberFormat("vi-VN").format(stats.value?.totalDiscount ?? 0)} ₫` },
  ])

  const refreshAll = () => Promise.all([list.refresh(), statsFetch.refresh()])

  // --- Issuing -------------------------------------------------------------------
  const today = new Date()

  const form = reactive({
    vpfId: "",
    type: "competition" as PurchaseType,
    discountKind: "percent" as VoucherDiscountKind,
    discountValue: 20 as number | null,
    expiresAt: null as Date | null,
    note: "",
  })

  const typeOptions = computed<{ label: string; value: PurchaseType }[]>(() =>
    (["competition", "vpf_membership", "vip"] as const).map((value) => ({ label: typeLabel(value), value })),
  )

  const discountKindOptions = computed<{ label: string; value: VoucherDiscountKind }[]>(() => [
    { label: t("adminVouchers.percent"), value: "percent" },
    { label: t("adminVouchers.fixed"), value: "fixed" },
  ])

  const canIssue = computed(() => Boolean(form.vpfId.trim()) && Boolean(form.expiresAt) && (form.discountValue ?? 0) > 0)

  const isIssuing = ref(false)

  async function issue() {
    if (!canIssue.value || !form.expiresAt) return
    isIssuing.value = true
    try {
      const res = (await $fetch("/api/vouchers", {
        method: "POST",
        credentials: "include",
        ignoreResponseError: true,
        body: {
          vpfId: form.vpfId.trim(),
          type: form.type,
          discountKind: form.discountKind,
          discountValue: form.discountValue,
          expiresAt: toIsoDate(form.expiresAt),
          note: form.note.trim() || undefined,
        },
      })) as ApiResponse<Voucher>

      if (!res.success) {
        notify.apiError(res)
        return
      }

      toast.add({ severity: "success", summary: t("adminVouchers.issued"), detail: `${res.data?.code} · ${apiMessage(res)}`, life: 5000 })
      form.note = ""
      await refreshAll()
    } catch (e) {
      notify.failure(e)
    } finally {
      isIssuing.value = false
    }
  }

  // Bulk issue (§8): a Tết promotion to 200 athletes is otherwise 200 clicks.
  // Every recipient still gets their own code — a voucher is single-use and
  // per-athlete, and a shared code could be neither.
  const bulkMode = ref(false)
  const bulkAudience = ref<"list" | "active_members">("list")
  const bulkIds = ref("")

  const audienceOptions = computed(() => [
    { label: t("adminVouchers.audienceList"), value: "list" },
    { label: t("adminVouchers.audienceActiveMembers"), value: "active_members" },
  ])

  async function issueBulk() {
    if (!form.expiresAt) return
    isIssuing.value = true
    try {
      const vpfIds = bulkIds.value.split(/[\s,;]+/).map((id) => id.trim()).filter(Boolean)

      const res = (await $fetch("/api/vouchers/bulk", {
        method: "POST",
        credentials: "include",
        ignoreResponseError: true,
        body: {
          ...(bulkAudience.value === "active_members" ? { audience: "active_members" } : { vpfIds }),
          type: form.type,
          discountKind: form.discountKind,
          discountValue: form.discountValue,
          expiresAt: toIsoDate(form.expiresAt),
          note: form.note.trim() || undefined,
        },
      })) as ApiResponse<{ issued: number; unknownVpfIds: string[] }>

      toast.add({
        severity: res.success ? "success" : "error",
        summary: t(res.success ? "adminVouchers.issued" : "general.error"),
        detail: apiMessage(res),
        life: 6000,
      })
      if (res.success && res.data.unknownVpfIds.length) {
        toast.add({ severity: "warn", summary: t("adminVouchers.bulkSkipped"), detail: res.data.unknownVpfIds.join(", "), life: 8000 })
      }
      if (res.success) await list.refresh()
    } finally {
      isIssuing.value = false
    }
  }

  // --- Editing and revoking ------------------------------------------------------
  const editOpen = ref(false)
  const editTarget = ref<VoucherWithUser | null>(null)
  const isEditing = ref(false)
  const editForm = reactive({
    discountKind: "percent" as VoucherDiscountKind,
    discountValue: 20 as number | null,
    expiresAt: null as Date | null,
    note: "",
  })

  function openEdit(voucher: VoucherWithUser) {
    editTarget.value = voucher
    editForm.discountKind = voucher.discountKind
    editForm.discountValue = voucher.discountValue
    editForm.expiresAt = new Date(`${voucher.expiresAt}T00:00:00`)
    editForm.note = voucher.note ?? ""
    editOpen.value = true
  }

  async function saveEdit() {
    if (!editTarget.value || !editForm.expiresAt) return
    isEditing.value = true
    try {
      const res = (await $fetch(`/api/vouchers/${editTarget.value.code}`, {
        method: "PATCH",
        credentials: "include",
        ignoreResponseError: true,
        body: {
          discountKind: editForm.discountKind,
          discountValue: editForm.discountValue,
          expiresAt: toIsoDate(editForm.expiresAt),
          note: editForm.note.trim() || null,
        },
      })) as ApiResponse<Voucher>

      notify.result(res, 5000)
      if (res.success) {
        editOpen.value = false
        await list.refresh()
      }
    } finally {
      isEditing.value = false
    }
  }

  const revokeOpen = ref(false)
  const revokeTarget = ref<VoucherWithUser | null>(null)
  const actingCode = ref<string | null>(null)

  function openRevoke(row: VoucherWithUser) {
    revokeTarget.value = row
    revokeOpen.value = true
  }

  async function confirmRevoke() {
    const target = revokeTarget.value
    if (!target) return
    actingCode.value = target.code
    try {
      const res = (await $fetch(`/api/vouchers/${target.code}`, {
        method: "DELETE",
        credentials: "include",
        ignoreResponseError: true,
      })) as ApiResponse<VoucherRevoked>

      if (res.success) {
        toast.add({ severity: "success", summary: t("adminVouchers.revoked"), detail: apiMessage(res), life: 4000 })
        await refreshAll()
      } else {
        notify.apiError(res)
      }
    } catch (e) {
      notify.failure(e)
    } finally {
      actingCode.value = null
      revokeOpen.value = false
    }
  }

  const vouchers = reactive({
    statusFilter, statusOptions, vpfIdFilter, rows, pending: list.pending, refresh: () => list.refresh(),
    statTiles, hasStats: computed(() => stats.value !== null),
    today, form, typeOptions, discountKindOptions, canIssue, isIssuing, issue,
    bulkMode, bulkAudience, bulkIds, audienceOptions, issueBulk,
    editOpen, editTarget, editForm, isEditing, openEdit, saveEdit,
    revokeOpen, revokeTarget, actingCode, openRevoke, confirmRevoke,
  })

  return { vouchers, ready: Promise.all([list, statsFetch]) }
}

/**
 * The admin vouchers screen's state, shared with its parts through provide/inject: the issue
 * form, the table and the dialogs all work on one list and one set of totals. Call once from the
 * screen, then `await ready` so the server render has the data.
 */
export function useAdminVouchersPage() {
  const { vouchers, ready } = createAdminVouchers()
  provide(ADMIN_VOUCHERS_KEY, vouchers)
  return { vouchers, ready }
}

export function useAdminVouchers(): AdminVouchers {
  const vouchers = inject(ADMIN_VOUCHERS_KEY)
  if (!vouchers) throw new Error("useAdminVouchers() needs useAdminVouchersPage() in a parent screen")
  return vouchers
}
