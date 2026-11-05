import { and, asc, count, eq, getTableColumns, gte, ilike, inArray, isNull, lt, ne, or, sql } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { foldForSearch } from "~/lib/domain/format"
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
  userId: users.userId,
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
  userId: users.userId,
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

/** Resolve a user id, VPF id or profile slug to the account's primary key, or null when no such athlete exists. */
export async function findUserIdByHandle(
  handle: { userId: string } | { vpfId: string } | { slug: string },
): Promise<string | null> {
  const where = "userId" in handle
    ? eq(users.userId, handle.userId)
    : "vpfId" in handle ? eq(users.vpfId, handle.vpfId) : eq(users.slug, handle.slug)
  const row = await db
    .select({ userId: users.userId })
    .from(users)
    .where(where)
    .limit(1)
    .then((rows) => rows[0])
  return row?.userId ?? null
}

export async function findAthletePrivate(userId: string): Promise<UserPrivate | null> {
  const row = await db
    .select(userPrivateSelect)
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1)
    .then((rows) => rows[0])
  return row ?? null
}

export async function findAthletePublic(userId: string): Promise<UserPublic | null> {
  const row = await db
    .select(userPublicSelect)
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1)
    .then((rows) => rows[0])
  return row ?? null
}

/** The few columns the admin edit path checks before writing. */
export async function findAthleteAdminSummary(userId: string) {
  return db
    .select({
      userId: users.userId,
      vpfId: users.vpfId,
      email: users.email,
      role: users.role,
      drugViolate: users.drugViolate,
      fullName: users.fullName,
    })
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export async function updateAthlete(userId: string, patch: Record<string, unknown>): Promise<void> {
  await db.update(users).set(patch).where(eq(users.userId, userId))
}

export async function isEmailTakenByOther(email: string, exceptUserId: string): Promise<boolean> {
  const row = await db
    .select({ userId: users.userId })
    .from(users)
    .where(and(eq(users.email, email), ne(users.userId, exceptUserId)))
    .limit(1)
    .then((rows) => rows[0])
  return Boolean(row)
}

export async function isSlugTakenByOther(slug: string, exceptUserId: string): Promise<boolean> {
  const row = await db
    .select({ userId: users.userId })
    .from(users)
    .where(and(eq(users.slug, slug), ne(users.userId, exceptUserId)))
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
 * Vietnamese letters with their diacritics stripped, position for position, so
 * `translate()` can fold a name the way `foldForSearch` folds the query: staff
 * typing "nguyen van" find "Nguyễn Văn" without an `unaccent` extension.
 */
const ACCENTED = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ"
const UNACCENTED = "a".repeat(17) + "e".repeat(11) + "i".repeat(5) + "o".repeat(17) + "u".repeat(11) + "y".repeat(5) + "d"
const foldedFullName = sql`translate(lower(normalize(${users.fullName}, NFC)), ${ACCENTED}, ${UNACCENTED})`

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
        sql`${foldedFullName} LIKE ${`%${foldForSearch(search)}%`}`,
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

export async function findVipExpiry(userId: string): Promise<string | null> {
  return db
    .select({ vipMembershipExpiresAt: users.vipMembershipExpiresAt })
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1)
    .then((rows) => rows[0]?.vipMembershipExpiresAt ?? null)
}

export async function findVipBenefits(userId: string): Promise<VipBenefits | null> {
  return db
    .select({ ...getTableColumns(vipBenefits), vpfId: users.vpfId })
    .from(vipBenefits)
    .innerJoin(users, eq(users.userId, vipBenefits.userId))
    .where(eq(vipBenefits.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

/**
 * An athlete may have no `vip_benefits` row until the first time they customise
 * anything, so saving has to cope with both cases.
 */
export async function upsertVipBenefits(
  userId: string,
  patch: Partial<Omit<VipBenefits, "userId" | "vpfId">>,
): Promise<VipBenefits | null> {
  const existing = await findVipBenefits(userId)

  if (existing) {
    await db.update(vipBenefits).set({ ...patch, userId }).where(eq(vipBenefits.userId, userId))
  } else {
    await db.insert(vipBenefits).values({ userId, ...patch })
  }

  return findVipBenefits(userId)
}

/**
 * Resolve a voucher batch's recipients: either every athlete with a live
 * membership, or an explicit list. Returns only the ids that exist, so the
 * caller can report the ones that did not.
 */
export async function findVoucherRecipients(
  audience: "active_members" | undefined,
  userIds: string[],
): Promise<string[]> {
  if (audience !== "active_members" && userIds.length === 0) return []
  const rows = await db
    .select({ userId: users.userId })
    .from(users)
    .where(audience === "active_members" ? membershipActive : inArray(users.userId, userIds))
  return rows.map((row) => row.userId)
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
      vpfId: users.vpfId,
      decorator1: vipBenefits.decorator1,
      decorator2: vipBenefits.decorator2,
    })
    .from(vipBenefits)
    .innerJoin(users, eq(vipBenefits.userId, users.userId))
    .where(gte(users.vipMembershipExpiresAt, sql`CURRENT_DATE`))
}
