import { pgTable, serial, text, date, smallint, boolean, unique, check, foreignKey, timestamp, integer, numeric, pgSequence, pgEnum, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const division = pgEnum("division", ["subjr", "jr", "open", "mas1", "mas2", "mas3", "mas4", "guest"])
export const meetType = pgEnum("meet_type", ["national", "amateur", "professional", "national_qualifier", "other"])
export const roles = pgEnum("roles", ["user", "admin"])
export const sexes = pgEnum("sexes", ["female", "male"])
export const purchaseType = pgEnum("purchase_type", ["vip", "vpf_membership", "competition"])
export const purchaseStatus = pgEnum("purchase_status", ["pending", "active", "expired", "cancelled"])

export const vpfSeq = pgSequence("vpf_seq", { startWith: "889", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })

export const meets = pgTable("meets", {
  meetId: serial("meet_id").primaryKey().notNull(),
  meetName: text("meet_name").notNull(),
  city: text(),
  startRegistration: date("start_registration"),
  closeRegistration: date("close_registration"),
  hostDate: date("host_date"),
  type: meetType(),
  mediaLink: text("media_link"),
  meetSlug: text("meet_slug").notNull(),
  systemYear: smallint("system_year").notNull(),
  hidden: boolean().default(false).notNull(),
  allowSpotterRegistration: boolean("allow_spotter_registration").default(true),
  allowGuestRegistration: boolean("allow_guest_registration").default(true),
  legacy: boolean("legacy").default(false),
})

export const teams = pgTable("teams", {
  teamId: serial("team_id").primaryKey().notNull(),
  teamName: text("team_name").notNull(),
}, (table) => [
  unique("teams_name_key").on(table.teamName),
])

export const users = pgTable("users", {
  vpfId: text("vpf_id").default(sql`(\'VPF\'::text || lpad((nextval(\'vpf_seq\'::regclass))::text, 6, \'0\'::text))`).primaryKey().notNull(),
  fullName: text("full_name").notNull(),
  nationality: text(),
  dob: smallint(),
  nationalId: text("national_id"),
  address: text(),
  phoneNumber: text("phone_number"),
  squatRackPin: smallint("squat_rack_pin").default(0),
  benchRackPin: smallint("bench_rack_pin").default(0),
  benchSafetyPin: smallint("bench_safety_pin").default(0),
  benchFootBlock: smallint("bench_foot_block").default(0),
  legacyEmail: text("legacy_email"),
  vpfMembershipExpiresAt: date("vpf_membership_expires_at"),
  vipMembershipExpiresAt: date("vip_membership_expires_at"),
  drugViolate: boolean("drug_violate").default(false),
  notes: text(),
  password: text(),
  slug: text(),
  email: text(),
  role: roles().default("user").notNull(),

}, (table) => [
  unique("members_slug_key").on(table.slug),
  unique("users_email_key").on(table.email),
  check("members_dob_check", sql`(dob >= 1900) AND ((dob)::numeric <= EXTRACT(year FROM CURRENT_DATE))`),
])

export const vipBenefits = pgTable("vip_benefits", {
  vpfId: text("vpf_id").primaryKey().notNull(),
  avatarImageUrl: text("avatar_image_url"),
  bannerImageUrl1: text("banner_image_url_1"),
  bannerImageUrl2: text("banner_image_url_2"),
  bannerImageUrl3: text("banner_image_url_3"),
  bannerImageUrl4: text("banner_image_url_4"),
  bannerImageUrl5: text("banner_image_url_5"),
  profileDescription: text("profile_description"),
  displayProfileDescription: boolean("display_profile_description").default(false),
  alias: text("alias"),
  displayAlias: boolean("display_alias").default(false),
  facebook: text("facebook"),
  displayFacebook: boolean("display_facebook").default(false),
  instagram: text("instagram"),
  displayInstagram: boolean("display_instagram").default(false),
  tiktok: text("tiktok"),
  displayTiktok: boolean("display_tiktok").default(false),
  youtube: text("youtube"),
  displayYoutube: boolean("display_youtube").default(false),
  vipPhoneNumber: text("vip_phone_number"),
  displayMobilePhone: boolean("display_mobile_phone").default(false),
  decorator1: text("decorator1"),
  decorator2: text("decorator2"),
}, (table) => [
  foreignKey({
    columns: [table.vpfId],
    foreignColumns: [users.vpfId],
    name: "vip_benefits_vpf_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
])

export const userViolations = pgTable("user_violations", {
  vpfId: text("vpf_id").primaryKey().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  note: text(),
  systemYear: smallint("system_year"),
}, (table) => [
  foreignKey({
    columns: [table.vpfId],
    foreignColumns: [users.vpfId],
    name: "user_violations_vpf_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
])

export const legacyMeetResults = pgTable("legacy_meet_results", {
  legacyResultId: uuid("legacy_result_id").defaultRandom().primaryKey().notNull(),
  meetId: integer("meet_id").notNull(),
  vpfId: text("vpf_id").notNull(),
  sex: sexes().notNull(),
  weightClass: integer("weight_class").notNull(),
  division: division().notNull(),
  bodyWeight: numeric("body_weight", { precision: 5, scale:  2, mode: "number" }),
  bestSquat: numeric("best_squat", { precision: 5, scale:  2, mode: "number" }),
  bestBench: numeric("best_bench", { precision: 5, scale:  2, mode: "number" }),
  bestDeadlift: numeric("best_deadlift", { precision: 5, scale:  2, mode: "number" }),
  platform: text(),
  session: text(),
  flight: text(),
  teamId: integer("team_id"),
  lot: smallint(),
  ranked: boolean().default(true),
  showOnProfile: boolean("show_on_profile").default(true)
}, (table) => [
  foreignKey({
    columns: [table.meetId],
    foreignColumns: [meets.meetId],
    name: "legacy_meet_result_meet_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.teamId],
    name: "legacy_meet_result_team_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.vpfId],
    foreignColumns: [users.vpfId],
    name: "legacy_meet_result_vpf_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  unique("legacy_meet_result_meet_vpf_key").on(table.meetId, table.vpfId),
  check("chk_weight_class_sex", sql`((sex = 'male'::sexes) AND (weight_class = ANY (ARRAY[53, 59, 66, 74, 83, 93, 105, 120, 999]))) OR ((sex = 'female'::sexes) AND (weight_class = ANY (ARRAY[43, 47, 52, 57, 63, 69, 76, 84, 999]))) OR (sex IS NULL)`),
])

export const meetResults = pgTable("meet_results", {
  resultId: uuid("result_id").defaultRandom().primaryKey().notNull(),
  meetId: integer("meet_id").notNull(),
  vpfId: text("vpf_id").notNull(),
  sex: sexes().notNull(),
  weightClass: integer("weight_class").notNull(),
  division: division().notNull(),
  bodyWeight: numeric("body_weight", { precision: 5, scale:  2, mode: "number" }),
  squat1: numeric({ precision: 5, scale:  2, mode: "number" }),
  squat2: numeric({ precision: 5, scale:  2, mode: "number" }),
  squat3: numeric({ precision: 5, scale:  2, mode: "number" }),
  bench1: numeric({ precision: 5, scale:  2, mode: "number" }),
  bench2: numeric({ precision: 5, scale:  2, mode: "number" }),
  bench3: numeric({ precision: 5, scale:  2, mode: "number" }),
  deadlift1: numeric({ precision: 5, scale:  2, mode: "number" }),
  deadlift2: numeric({ precision: 5, scale:  2, mode: "number" }),
  deadlift3: numeric({ precision: 5, scale:  2, mode: "number" }),
  platform: text(),
  session: text(),
  flight: text(),
  teamId: integer("team_id"),
  lot: smallint(),
  ranked: boolean().default(true),
  showOnProfile: boolean("show_on_profile").default(true)
}, (table) => [
  foreignKey({
    columns: [table.meetId],
    foreignColumns: [meets.meetId],
    name: "meet_result_meet_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.teamId],
    name: "meet_result_team_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.vpfId],
    foreignColumns: [users.vpfId],
    name: "meet_result_vpf_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  unique("meet_result_meet_vpf_key").on(table.meetId, table.vpfId),
  check("chk_weight_class_sex", sql`((sex = 'male'::sexes) AND (weight_class = ANY (ARRAY[53, 59, 66, 74, 83, 93, 105, 120, 999]))) OR ((sex = 'female'::sexes) AND (weight_class = ANY (ARRAY[43, 47, 52, 57, 63, 69, 76, 84, 999]))) OR (sex IS NULL)`),
])

export const purchases = pgTable("purchases", {
  purchaseId: serial("purchase_id").primaryKey().notNull(),
  vpfId: text("vpf_id").notNull(),
  type: purchaseType().notNull(),
  refCode: text("ref_code").notNull(),
  amount: integer("amount").notNull(),
  status: purchaseStatus().default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "string" }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "string" }),
  approvedBy: text("approved_by"),
}, (table) => [
  unique("purchases_ref_code_key").on(table.refCode),
  foreignKey({
    columns: [table.vpfId],
    foreignColumns: [users.vpfId],
    name: "purchases_vpf_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.approvedBy],
    foreignColumns: [users.vpfId],
    name: "purchases_approved_by_fkey"
  }).onUpdate("cascade").onDelete("cascade")
])

export const vipPurchaseMetadata = pgTable("vip_purchase_metadata", {
  purchaseId: integer("purchase_id").primaryKey().notNull(),
  durationMonths: smallint("duration_months").notNull(),
}, (table) => [
  foreignKey({
    columns: [table.purchaseId],
    foreignColumns: [purchases.purchaseId],
    name: "vip_purchase_metadata_purchase_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
])

export const vpfMembershipPurchaseMetadata = pgTable("vpf_membership_purchase_metadata", {
  purchaseId: integer("purchase_id").primaryKey().notNull(),
  membershipYear: smallint("membership_year").notNull(),
}, (table) => [
  foreignKey({
    columns: [table.purchaseId],
    foreignColumns: [purchases.purchaseId],
    name: "vpf_membership_purchase_metadata_purchase_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
])

export const competitionPurchaseMetadata = pgTable("competition_purchase_metadata", {
  purchaseId: integer("purchase_id").primaryKey().notNull(),
  meetId: integer("meet_id").notNull(),
  sex: sexes().notNull(),
  weightClass: integer("weight_class").notNull(),
  division: division().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.purchaseId],
    foreignColumns: [purchases.purchaseId],
    name: "competition_purchase_metadata_purchase_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.meetId],
    foreignColumns: [meets.meetId],
    name: "competition_purchase_metadata_meet_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  check("chk_competition_weight_class_sex", sql`((sex = 'male'::sexes) AND (weight_class = ANY (ARRAY[53, 59, 66, 74, 83, 93, 105, 120, 999]))) OR ((sex = 'female'::sexes) AND (weight_class = ANY (ARRAY[43, 47, 52, 57, 63, 69, 76, 84, 999])))`),
])
