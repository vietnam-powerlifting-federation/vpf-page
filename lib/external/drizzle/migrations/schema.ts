import { pgTable, serial, text, date, smallint, boolean, unique, check, foreignKey, timestamp, primaryKey, integer, numeric, pgSequence, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const division = pgEnum("division", ["subjr", "jr", "open", "mas1", "mas2", "mas3", "mas4", "guest"])
export const meetType = pgEnum("meet_type", ["national", "amateur", "professional", "national_qualifier", "other"])
export const sexes = pgEnum("sexes", ["female", "male"])

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
  systemYear: smallint("system_year"),
  hidden: boolean().default(false).notNull(),
  allowSpotterRegistration: boolean("allow_spotter_registration").default(true),
  allowGuestRegistration: boolean("allow_guest_registration").default(true),
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
  active: boolean().default(true),
  drugViolate: boolean("drug_violate").default(false),
  notes: text(),
  password: text(),
  instagramUsername: text("instagram_username"),
  slug: text(),
  decorator1: text(),
  decorator2: text(),
  banLevel: smallint("ban_level").default(sql`'0'`).notNull(),
  email: text(),
}, (table) => [
  unique("members_slug_key").on(table.slug),
  unique("users_email_key").on(table.email),
  check("members_dob_check", sql`(dob >= 1900) AND ((dob)::numeric <= EXTRACT(year FROM CURRENT_DATE))`),
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
  meetId: integer("meet_id").notNull(),
  vpfId: text("vpf_id").notNull(),
  sex: sexes().notNull(),
  weightClass: integer("weight_class").notNull(),
  division: division().notNull(),
  bodyWeight: numeric("body_weight", { precision: 5, scale:  2 }).default("NULL"),
  bestSquat: numeric("best_squat", { precision: 5, scale:  2 }).default("NULL"),
  bestBench: numeric("best_bench", { precision: 5, scale:  2 }).default("NULL"),
  bestDeadlift: numeric("best_deadlift", { precision: 5, scale:  2 }).default("NULL"),
  platform: text(),
  session: text(),
  flight: text(),
  teamId: integer("team_id"),
  lot: smallint(),
  ranked: boolean().default(true),
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
  primaryKey({ columns: [table.meetId, table.vpfId], name: "legacy_meet_result_pkey" }),
  check("chk_weight_class_sex", sql`((sex = 'male'::sexes) AND (weight_class = ANY (ARRAY[53, 59, 66, 74, 83, 93, 105, 120, 999]))) OR ((sex = 'female'::sexes) AND (weight_class = ANY (ARRAY[43, 47, 52, 57, 63, 69, 76, 84, 999]))) OR (sex IS NULL)`),
])

export const meetResults = pgTable("meet_results", {
  meetId: integer("meet_id").notNull(),
  vpfId: text("vpf_id").notNull(),
  sex: sexes().notNull(),
  weightClass: integer("weight_class").notNull(),
  division: division().notNull(),
  bodyWeight: numeric("body_weight", { precision: 5, scale:  2 }).default("0.0"),
  squat1: numeric({ precision: 5, scale:  2 }).default("NULL"),
  squat2: numeric({ precision: 5, scale:  2 }).default("NULL"),
  squat3: numeric({ precision: 5, scale:  2 }).default("NULL"),
  bench1: numeric({ precision: 5, scale:  2 }).default("NULL"),
  bench2: numeric({ precision: 5, scale:  2 }).default("NULL"),
  bench3: numeric({ precision: 5, scale:  2 }).default("NULL"),
  deadlift1: numeric({ precision: 5, scale:  2 }).default("NULL"),
  deadlift2: numeric({ precision: 5, scale:  2 }).default("NULL"),
  deadlift3: numeric({ precision: 5, scale:  2 }).default("NULL"),
  platform: text(),
  session: text(),
  flight: text(),
  teamId: integer("team_id"),
  lot: smallint(),
  ranked: boolean().default(true),
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
  primaryKey({ columns: [table.meetId, table.vpfId], name: "meet_result_pkey" }),
  check("chk_weight_class_sex", sql`((sex = 'male'::sexes) AND (weight_class = ANY (ARRAY[53, 59, 66, 74, 83, 93, 105, 120, 999]))) OR ((sex = 'female'::sexes) AND (weight_class = ANY (ARRAY[43, 47, 52, 57, 63, 69, 76, 84, 999]))) OR (sex IS NULL)`),
])
