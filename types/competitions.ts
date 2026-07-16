import type { RankedDivision, PurchaseType } from "~/types/union-types"

/** 4-state identity status derived from the identity_verifications row (or its absence). */
export type RegistrationIdentityState = "not_submitted" | "pending" | "approved" | "rejected"

export type ViolationOutcome = "ok" | "pledge" | "blocked"

export type BanGate = {
  violationLevel: number
  violationOutcome: ViolationOutcome
  dopingBanned: boolean
  competitionBanned: boolean
  competitionBanReason: string | null
  blocked: boolean
}

/** Everything the registration wizard needs to render its gates and entry form. */
export type RegistrationEligibility = {
  meet: {
    meetId: number
    meetName: string
    meetSlug: string
    systemYear: number
    hostDate: string | null
    entryFee: number | null
    allowGuestRegistration: boolean
  }
  registrationOpen: boolean
  emailVerified: boolean
  identityVerified: boolean
  identityStatus: RegistrationIdentityState
  alreadyRegistered: boolean
  /** Ban-gate results — only evaluated (non-null) for identity-verified athletes. */
  bans: BanGate | null
  athlete: {
    dob: number | null
    age: number | null
    squatRackPin: number | null
    benchRackPin: number | null
    benchSafetyPin: number | null
    benchFootBlock: number | null
    competitionPhotoUrl: string | null
    membershipOwed: boolean
  }
  options: {
    weightClasses: { male: number[]; female: number[] }
    divisions: RankedDivision[]
  }
  fees: {
    entryFee: number
    membershipFee: number
    mediaPlusFee: number
  }
}

export type CompetitionRegistrationCreated = {
  purchaseId: number
  refCode: string
  type: PurchaseType[]
  amount: number
  status: "pending"
  qrUrl: string
  /** Drives the post-payment message: confirmed vs submitted/pending review. */
  identityVerified: boolean
  breakdown: {
    entryFee: number
    membershipFee: number
    mediaPlusFee: number
  }
}
