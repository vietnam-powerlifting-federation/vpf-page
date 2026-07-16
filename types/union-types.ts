import type { roles, sexes, division, meetType, purchaseType, purchaseStatus } from "~/lib/external/drizzle/migrations/schema"

export type Role = typeof roles.enumValues[number]
export type Sex = typeof sexes.enumValues[number]
export type Division = typeof division.enumValues[number]
export type RankedDivision = Exclude<Division, "guest">
export type MeetType = typeof meetType.enumValues[number]
export type PurchaseType = typeof purchaseType.enumValues[number]
export type PurchaseStatusValue = typeof purchaseStatus.enumValues[number]