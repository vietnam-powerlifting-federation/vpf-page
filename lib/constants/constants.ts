export const DISQUALIFIED = 99

export const WEIGHT_CLASS_MALE = [53, 59, 66, 74, 83, 93, 105, 120, 999]
export const WEIGHT_CLASS_FEMALE = [43, 47, 52, 57, 63, 69, 76, 84, 999]

export const DIVISION = ["subjr", "jr", "open", "mas1", "mas2", "mas3", "mas4", "guest"]

export const RANKED_DIVISION = ["subjr", "jr", "open", "mas1", "mas2", "mas3", "mas4"]

export const SEX = ["male", "female"]

export const RECORD_CAT_NAME = ["squat", "bench", "deadlift", "total"]

export const RECORD_DIVISION_OVERRIDE = {
  open: ["open"],
  jr: ["jr", "open"],
  subjr: ["subjr", "jr", "open"],

  mas1: ["mas1", "open"],
  mas2: ["mas2", "mas1", "open"],
  mas3: ["mas3", "mas2", "mas1", "open"],
  mas4: ["mas4", "mas3", "mas2", "mas1", "open"],
}

export const RECORD_START_YEAR = 2022

export const VIP_MEMBERSHIP_PLANS = {
  "6months": {
    durationMonths: 6,
    amount: 300_000,
  },
  "1year": {
    durationMonths: 12,
    amount: 300_000,
  },
} as const

export type VipMembershipPlan = keyof typeof VIP_MEMBERSHIP_PLANS

// Yearly VPF membership fee (VND) owed by a member who has not paid for the competition's year.
export const VPF_MEMBERSHIP_FEE = 200_000

// Media Plus add-on fee (VND). TODO(vpf): confirm the real price with the federation.
export const MEDIA_PLUS_FEE = 100_000

// Minimum age (IPF) at which an athlete may enter a competition.
export const MIN_COMPETITION_AGE = 14
