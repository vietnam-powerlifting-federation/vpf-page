/**
 * The admin dashboard is an **action queue**, not analytics (admin tools spec §1.2):
 * staff open it to find out what is waiting on them, and every row links straight
 * into the tool with the filter pre-applied.
 */
export type DashboardMeetAlert = {
  meetId: number
  meetName: string
  meetSlug: string
  hostDate: string | null
  closeRegistration: string | null
  /** Only set on the "paid registrations but no entries" queue. */
  paidRegistrations?: number
}

export type AdminDashboard = {
  /** Identity verifications waiting for review. */
  pendingVerifications: number
  /**
   * Purchases still pending after 24 hours: someone transferred and was never
   * matched, or never paid at all.
   */
  stalePurchases: number
  stalePurchaseValue: number
  /** Meets whose host date has passed with no `meet_results` rows — results not imported. */
  meetsMissingResults: DashboardMeetAlert[]
  /** Meets closing registration within 7 days. */
  meetsClosingSoon: DashboardMeetAlert[]
  /** Meets with paid registrations and no generated entries. */
  meetsNeedingEntries: DashboardMeetAlert[]
  /** Below the fold: the numbers the federation will ask for anyway. */
  totals: {
    athletes: number
    activeMembers: number
    meets: number
    pendingValue: number
  }
}
