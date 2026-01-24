import type { roles, sexes, division } from "~/lib/external/drizzle/migrations/schema"

export type Role = typeof roles.enumValues[number]
export type Sex = typeof sexes.enumValues[number]
export type Division = typeof division.enumValues[number]