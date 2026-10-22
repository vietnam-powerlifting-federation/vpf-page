import { and, asc, count, eq, gte, ilike, inArray, isNull, lt, ne, or, sql } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { users, vipBenefits } from "~/lib/external/drizzle/migrations/schema"
import type { UserPrivate, UserPublic } from "~/types/users"
import type { VipBenefits } from "~/types/vip"

/**
 * Every read and write of the `users` table lives here.
 *
 * The two column maps below are the reason this module exists: which columns an
 * athlete may see is a single decision, and it is enforced by picking a select
 * map rather than by remembering to omit fields at each call site. `satisfies`
 * ties each map to its type, so adding a column to `UserPrivate` without adding
 * it here is a compile error rather than a silently missing field.
 */

export const userPrivateSelect = {
  vpfId: users.vpfId,
  fullName: users.fullName,
  nationality: users.nationality,
  dob: users.dob,
  nationalId: users.nationalId,
  address: users.address,
  phoneNumber: users.phoneNumber,
  squatRackPin: users.squatRackPin,
  benchRackPin: users.benchRackPin,
  benchSafetyPin: users.benchSafetyPin,
  benchFootBlock: users.benchFootBlock,
  competitionPhotoUrl: users.competitionPhotoUrl,
  legacyEmail: users.legacyEmail,
  vpfMembershipExpiresAt: users.vpfMembershipExpiresAt,
  vipMembershipExpiresAt: users.vipMembershipExpiresAt,
  drugViolate: users.drugViolate,
  notes: users.notes,
  slug: users.slug,
  email: users.email,
  role: users.role,
} satisfies Record<keyof UserPrivate, unknown>

export const userPublicSelect = {
  vpfId: users.vpfId,
  fullName: users.fullName,
  nationality: users.nationality,
  dob: users.dob,
  slug: users.slug,
} satisfies Record<keyof UserPublic, unknown>

/** A membership with no expiry never lapses; otherwise it must not be in the past. */
const membershipActive = or(
  isNull(users.vpfMembershipExpiresAt),
  gte(users.vpfMembershipExpiresAt, sql`CURRENT_DATE`),
)

const membershipExpired = and(
  sql`${users.vpfMembershipExpiresAt} IS NOT NULL`,
  lt(users.vpfMembershipExpiresAt, sql`CURRENT_DATE`),
)

export async function findVpfIdBySlug(slug: string): Promise<string | null> {
  const row = await db
    .select({ vpfId: users.vpfId })
    .from(users)
    .where(eq(users.slug, slug))
    .limit(1)
    .then((rows) => rows[0])
  return row?.vpfId ?? null
}

export async function findAthletePrivate(vpfId: string): Promise<UserPrivate | null> {
  const row = await db
    .select(userPrivateSelect)
    .from(users)
    .where(eq(users.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0])
  return row ?? null
}

export async function findAthletePublic(vpfId: string): Promise<UserPublic | null> {
  const row = await db
    .select(userPublicSelect)
    .from(users)
    .where(eq(users.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0])
  return row ?? null
}

/** The few columns the admin edit path checks before writing. */
export async function findAthleteAdminSummary(vpfId: string) {
  return db
    .select({
      vpfId: users.vpfId,
      email: users.email,
      role: users.role,
      drugViolate: users.drugViolate,
      fullName: users.fullName,
    })
    .from(users)
    .where(eq(users.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export async function updateAthlete(vpfId: string, patch: Record<string, unknown>): Promise<void> {
  await db.update(users).set(patch).where(eq(users.vpfId, vpfId))
}

export async function isEmailTakenByOther(email: string, exceptVpfId: string): Promise<boolean> {
  const row = await db
    .select({ vpfId: users.vpfId })
    .from(users)
    .where(and(eq(users.email, email), ne(users.vpfId, exceptVpfId)))
    .limit(1)
    .then((rows) => rows[0])
  return Boolean(row)
}

export async function isSlugTakenByOther(slug: string, exceptVpfId: string): Promise<boolean> {
  const row = await db
    .select({ vpfId: users.vpfId })
    .from(users)
    .where(and(eq(users.slug, slug), ne(users.vpfId, exceptVpfId)))
    .limit(1)
    .then((rows) => rows[0])
  return Boolean(row)
}

export type AthleteListFilters = {
  /** Admin-only. Without it the list is active members only, as the public list has always been. */
  includeInactive?: boolean
  search?: string
  membership?: "active" | "expired"
  identityVerified?: boolean
  emailVerified?: boolean
  drugViolate?: boolean
  role?: "user" | "admin"
}

/**
 * Filters arrive as plain values, not drizzle expressions, so the handler above
 * decides *what* to ask for and this module decides how to ask it.
 */
function buildAthleteWhere(filters: AthleteListFilters, isAdmin: boolean) {
  if (!isAdmin) return membershipActive

  const { search } = filters
  return and(
    filters.includeInactive ? undefined : membershipActive,
    filters.membership === "active" ? membershipActive : undefined,
    filters.membership === "expired" ? membershipExpired : undefined,
    search
      ? or(
        ilike(users.vpfId, `%${search}%`),
        ilike(users.fullName, `%${search}%`),
        ilike(users.email, `%${search}%`),
        ilike(users.nationalId, `%${search}%`),
      )
      : undefined,
    filters.identityVerified === undefined ? undefined : eq(users.identityVerified, filters.identityVerified),
    filters.emailVerified === undefined ? undefined : eq(users.emailVerified, filters.emailVerified),
    filters.drugViolate === undefined ? undefined : eq(users.drugViolate, filters.drugViolate),
    filters.role ? eq(users.role, filters.role) : undefined,
  )
}

export async function countAthletes(filters: AthleteListFilters, isAdmin: boolean): Promise<number> {
  return db
    .select({ value: count() })
    .from(users)
    .where(buildAthleteWhere(filters, isAdmin))
    .then((rows) => rows[0]?.value ?? 0)
}

export async function listAthletes(
  filters: AthleteListFilters,
  isAdmin: boolean,
  page: { limit: number; offset: number },
): Promise<(UserPrivate | UserPublic)[]> {
  return db
    .select(isAdmin ? userPrivateSelect : userPublicSelect)
    .from(users)
    .where(buildAthleteWhere(filters, isAdmin))
    .orderBy(asc(users.fullName), asc(users.vpfId))
    .limit(page.limit)
    .offset(page.offset)
}

export async function findVipExpiry(vpfId: string): Promise<string | null> {
  return db
    .select({ vipMembershipExpiresAt: users.vipMembershipExpiresAt })
    .from(users)
    .where(eq(users.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0]?.vipMembershipExpiresAt ?? null)
}

export async function findVipBenefits(vpfId: string): Promise<VipBenefits | null> {
  return db
    .select()
    .from(vipBenefits)
    .where(eq(vipBenefits.vpfId, vpfId))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

/**
 * An athlete may have no `vip_benefits` row until the first time they customise
 * anything, so saving has to cope with both cases.
 */
export async function upsertVipBenefits(
  vpfId: string,
  patch: Partial<Omit<VipBenefits, "vpfId">>,
): Promise<VipBenefits | null> {
  const existing = await findVipBenefits(vpfId)

  if (existing) {
    await db.update(vipBenefits).set({ ...patch, vpfId }).where(eq(vipBenefits.vpfId, vpfId))
  } else {
    await db.insert(vipBenefits).values({ vpfId, ...patch })
  }

  return findVipBenefits(vpfId)
}

/**
 * Resolve a voucher batch's recipients: either every athlete with a live
 * membership, or an explicit list. Returns only the ids that exist, so the
 * caller can report the ones that did not.
 */
export async function findVoucherRecipients(
  audience: "active_members" | undefined,
  vpfIds: string[],
): Promise<string[]> {
  const rows = await db
    .select({ vpfId: users.vpfId })
    .from(users)
    .where(audience === "active_members" ? membershipActive : inArray(users.vpfId, vpfIds))
  return rows.map((row) => row.vpfId)
}

/**
 * Name decorators for every athlete with a live VIP membership; the public pages
 * render these site-wide.
 *
 * The expiry rule here is deliberately the opposite of `membershipActive` above,
 * and the two must not be merged. A null `vpfMembershipExpiresAt` means a VPF
 * membership that never lapses; a null `vipMembershipExpiresAt` means VIP was
 * never purchased at all, so those athletes get no decorator. Mirrors
 * `isVipActive` in lib/domain/vip.
 */
export async function listActiveVipDecorators() {
  return db
    .select({
      vpfId: vipBenefits.vpfId,
      decorator1: vipBenefits.decorator1,
      decorator2: vipBenefits.decorator2,
    })
    .from(vipBenefits)
    .innerJoin(users, eq(vipBenefits.vpfId, users.vpfId))
    .where(gte(users.vipMembershipExpiresAt, sql`CURRENT_DATE`))
}
