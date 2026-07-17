import { formatDiscount } from "~/lib/utils/vouchers"
import type { ApiResponse } from "~/types/api"
import type { PurchaseType } from "~/types/union-types"
import type { Voucher, VoucherStatus } from "~/types/vouchers"

export const PROFILE_VOUCHERS_KEY = "openvpf-profile-vouchers"

type VoucherQuery = {
  /** Only vouchers for this purchase type. */
  type?: PurchaseType
  /** Only vouchers that can still be spent — unredeemed and unexpired. */
  available?: boolean
}

/** The signed-in athlete's own vouchers. The server never returns anyone else's. */
export function useAthleteVouchers(query: VoucherQuery = {}, key = PROFILE_VOUCHERS_KEY) {
  const { data, pending, error, refresh } = useFetch<ApiResponse<Voucher[]>>("/api/vouchers", {
    key,
    query,
    credentials: "include",
    ignoreResponseError: true,
  })

  return {
    vouchers: computed(() => (data.value?.success ? data.value.data : [])),
    pending,
    error,
    refresh,
  }
}

/** Bilingual labels for voucher types and discounts, shared by every voucher surface. */
export function useVoucherDisplay() {
  const { t } = useI18n()

  const TYPE_LABEL_KEY: Record<PurchaseType, string> = {
    competition: "voucher.typeCompetition",
    vpf_membership: "voucher.typeVpfMembership",
    vip: "voucher.typeVip",
  }

  const STATUS_LABEL_KEY: Record<VoucherStatus, string> = {
    active: "profile.voucherTable.active",
    expired: "profile.voucherTable.expired",
    used: "profile.voucherTable.used",
  }

  return {
    typeLabel: (type: PurchaseType) => t(TYPE_LABEL_KEY[type]),
    statusLabel: (status: VoucherStatus) => t(STATUS_LABEL_KEY[status]),
    statusSeverity: (status: VoucherStatus) =>
      status === "active" ? "success" : status === "used" ? "info" : "secondary",
    /** e.g. "-20% · Competition registration" */
    describe: (voucher: Pick<Voucher, "type" | "discountKind" | "discountValue">) =>
      `${formatDiscount(voucher)} · ${t(TYPE_LABEL_KEY[voucher.type])}`,
    formatDiscount,
  }
}
