import { pgTable, unique, serial, text, check, smallint, boolean, date, foreignKey, primaryKey, integer, numeric, pgMaterializedView, pgSequence, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const division = pgEnum("division", ["subjr", "jr", "open", "mas1", "mas2", "mas3", "mas4", "guest"])
export const meetType = pgEnum("meet_type", ["national", "amateur", "professional", "national_qualifier", "other"])
export const sexes = pgEnum("sexes", ["female", "male"])

export const vpfSeq = pgSequence("vpf_seq", { startWith: "889", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })

export const teams = pgTable("teams", {
  teamId: serial("team_id").primaryKey().notNull(),
  teamName: text("team_name").notNull(),
}, (table) => [
  unique("teams_name_key").on(table.teamName),
])

export const members = pgTable("members", {
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
  email: text(),
  active: boolean().default(true),
  drugViolate: boolean("drug_violate").default(false),
  notes: text(),
  isGuest: boolean("is_guest").default(false),
  password: text(),
  nationalIdImageUrl: text("national_id_image_url"),
  instagramUsername: text("instagram_username"),
  slug: text(),
  decorator1: text("decorator_1"),
  decorator2: text("decorator_2"),
}, (table) => [
  unique("members_social_id_image_url_key").on(table.nationalIdImageUrl),
  unique("members_slug_key").on(table.slug),
  check("members_dob_check", sql`(dob >= 1900) AND ((dob)::numeric <= EXTRACT(year FROM CURRENT_DATE))`),
])

export const meetInfo = pgTable("meet_info", {
  meetId: serial("meet_id").primaryKey().notNull(),
  meetName: text("meet_name").notNull(),
  city: text(),
  startRegistration: date("start_registration"),
  closeRegistration: date("close_registration"),
  hostDate: date("host_date"),
  type: meetType(),
  mediaLink: text("media_link"),
  meetSlug: text("meet_slug"),
  systemYear: smallint("system_year"),
  hidden: boolean().default(false).notNull(),
})

export const legacyMeetResult = pgTable("legacy_meet_result", {
  meetId: integer("meet_id").notNull(),
  vpfId: text("vpf_id").notNull(),
  sex: sexes(),
  weightClass: integer("weight_class"),
  division: division(),
  bodyWeight: numeric("body_weight", { precision: 5, scale:  2 }).default("0.0"),
  bestSquat: numeric("best_squat", { precision: 5, scale:  2 }).default("0.0"),
  bestBench: numeric("best_bench", { precision: 5, scale:  2 }).default("0.0"),
  bestDead: numeric("best_dead", { precision: 5, scale:  2 }).default("0.0"),
  platform: text(),
  session: text(),
  flight: text(),
  teamId: integer("team_id"),
  teamScore: numeric("team_score"),
  placement: integer(),
  lot: smallint(),
}, (table) => [
  foreignKey({
    columns: [table.meetId],
    foreignColumns: [meetInfo.meetId],
    name: "legacy_meet_result_meet_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.teamId],
    name: "legacy_meet_result_team_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.vpfId],
    foreignColumns: [members.vpfId],
    name: "legacy_meet_result_vpf_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  primaryKey({ columns: [table.meetId, table.vpfId], name: "legacy_meet_result_pkey" }),
  check("chk_weight_class_sex", sql`((sex = 'male'::sexes) AND (weight_class = ANY (ARRAY[53, 59, 66, 74, 83, 93, 105, 120, 999]))) OR ((sex = 'female'::sexes) AND (weight_class = ANY (ARRAY[43, 47, 52, 57, 63, 69, 76, 84, 999]))) OR (sex IS NULL)`),
])

export const meetResult = pgTable("meet_result", {
  meetId: integer("meet_id").notNull(),
  vpfId: text("vpf_id").notNull(),
  sex: sexes(),
  weightClass: integer("weight_class"),
  division: division(),
  bodyWeight: numeric("body_weight", { precision: 5, scale:  2 }).default("0.0"),
  squat1: numeric({ precision: 5, scale:  2 }).default("0.0"),
  squat2: numeric({ precision: 5, scale:  2 }).default("0.0"),
  squat3: numeric({ precision: 5, scale:  2 }).default("0.0"),
  bench1: numeric({ precision: 5, scale:  2 }).default("0.0"),
  bench2: numeric({ precision: 5, scale:  2 }).default("0.0"),
  bench3: numeric({ precision: 5, scale:  2 }).default("0.0"),
  dead1: numeric({ precision: 5, scale:  2 }).default("0.0"),
  dead2: numeric({ precision: 5, scale:  2 }).default("0.0"),
  dead3: numeric({ precision: 5, scale:  2 }).default("0.0"),
  platform: text(),
  session: text(),
  flight: text(),
  teamId: integer("team_id"),
  teamScore: numeric("team_score"),
  placement: integer(),
  lot: smallint(),
}, (table) => [
  foreignKey({
    columns: [table.meetId],
    foreignColumns: [meetInfo.meetId],
    name: "meet_result_meet_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.teamId],
    name: "meet_result_team_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.vpfId],
    foreignColumns: [members.vpfId],
    name: "meet_result_vpf_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  primaryKey({ columns: [table.meetId, table.vpfId], name: "meet_result_pkey" }),
  check("chk_weight_class_sex", sql`((sex = 'male'::sexes) AND (weight_class = ANY (ARRAY[53, 59, 66, 74, 83, 93, 105, 120, 999]))) OR ((sex = 'female'::sexes) AND (weight_class = ANY (ARRAY[43, 47, 52, 57, 63, 69, 76, 84, 999]))) OR (sex IS NULL)`),
])
export const meetResultDetailed = pgMaterializedView("meet_result_detailed", {	meetId: integer("meet_id"),
  vpfId: text("vpf_id"),
  sex: sexes(),
  weightClass: integer("weight_class"),
  division: division(),
  bodyWeight: numeric("body_weight", { precision: 5, scale:  2 }),
  squat1: numeric(),
  squat2: numeric(),
  squat3: numeric(),
  bestSquat: numeric("best_squat"),
  bench1: numeric(),
  bench2: numeric(),
  bench3: numeric(),
  bestBench: numeric("best_bench"),
  dead1: numeric(),
  dead2: numeric(),
  dead3: numeric(),
  bestDead: numeric("best_dead"),
  platform: text(),
  session: text(),
  flight: text(),
  teamId: integer("team_id"),
  teamScore: numeric("team_score"),
  fullName: text("full_name"),
  meetName: text("meet_name"),
  type: meetType(),
  total: numeric(),
  dots: numeric(),
  ipf: numeric(),
  gl: numeric(),
  placement: integer(),
  meetSlug: text("meet_slug"),
  instagramUsername: text("instagram_username"),
  dob: smallint(),
  hostDate: date("host_date"),
  slug: text(),
  lot: smallint(),
  systemYear: smallint("system_year"),
  hidden: boolean(),
  decorator1: text("decorator_1"),
  decorator2: text("decorator_2"),
}).as(sql`SELECT mr.meet_id, mr.vpf_id, mr.sex, mr.weight_class, mr.division, mr.body_weight, mr.squat1, mr.squat2, mr.squat3, GREATEST(mr.squat1, mr.squat2, mr.squat3, 0::numeric) AS best_squat, mr.bench1, mr.bench2, mr.bench3, GREATEST(mr.bench1, mr.bench2, mr.bench3, 0::numeric) AS best_bench, mr.dead1, mr.dead2, mr.dead3, GREATEST(mr.dead1, mr.dead2, mr.dead3, 0::numeric) AS best_dead, mr.platform, mr.session, mr.flight, mr.team_id, mr.team_score, m.full_name, mi.meet_name, mi.type, GREATEST(mr.squat1, mr.squat2, mr.squat3, 0::numeric) + GREATEST(mr.bench1, mr.bench2, mr.bench3, 0::numeric) + GREATEST(mr.dead1, mr.dead2, mr.dead3, 0::numeric) AS total, calculate_dots(GREATEST(mr.squat1, mr.squat2, mr.squat3, 0::numeric) + GREATEST(mr.bench1, mr.bench2, mr.bench3, 0::numeric) + GREATEST(mr.dead1, mr.dead2, mr.dead3, 0::numeric), mr.body_weight, mr.sex) AS dots, calculate_ipf(GREATEST(mr.squat1, mr.squat2, mr.squat3, 0::numeric) + GREATEST(mr.bench1, mr.bench2, mr.bench3, 0::numeric) + GREATEST(mr.dead1, mr.dead2, mr.dead3, 0::numeric), mr.body_weight, mr.sex) AS ipf, calculate_gl(GREATEST(mr.squat1, mr.squat2, mr.squat3, 0::numeric) + GREATEST(mr.bench1, mr.bench2, mr.bench3, 0::numeric) + GREATEST(mr.dead1, mr.dead2, mr.dead3, 0::numeric), mr.body_weight, mr.sex) AS gl, mr.placement, mi.meet_slug, m.instagram_username, m.dob, mi.host_date, m.slug, mr.lot, mi.system_year, mi.hidden, m.decorator_1, m.decorator_2 FROM meet_result mr JOIN members m ON mr.vpf_id = m.vpf_id JOIN meet_info mi ON mi.meet_id = mr.meet_id UNION ALL SELECT lmr.meet_id, lmr.vpf_id, lmr.sex, lmr.weight_class, lmr.division, lmr.body_weight, NULL::numeric AS squat1, NULL::numeric AS squat2, NULL::numeric AS squat3, lmr.best_squat, NULL::numeric AS bench1, NULL::numeric AS bench2, NULL::numeric AS bench3, lmr.best_bench, NULL::numeric AS dead1, NULL::numeric AS dead2, NULL::numeric AS dead3, lmr.best_dead, lmr.platform, lmr.session, lmr.flight, lmr.team_id, lmr.team_score, m.full_name, mi.meet_name, mi.type, COALESCE(lmr.best_squat, 0::numeric) + COALESCE(lmr.best_bench, 0::numeric) + COALESCE(lmr.best_dead, 0::numeric) AS total, calculate_dots(COALESCE(lmr.best_squat, 0::numeric) + COALESCE(lmr.best_bench, 0::numeric) + COALESCE(lmr.best_dead, 0::numeric), lmr.body_weight, lmr.sex) AS dots, calculate_ipf(COALESCE(lmr.best_squat, 0::numeric) + COALESCE(lmr.best_bench, 0::numeric) + COALESCE(lmr.best_dead, 0::numeric), lmr.body_weight, lmr.sex) AS ipf, calculate_gl(COALESCE(lmr.best_squat, 0::numeric) + COALESCE(lmr.best_bench, 0::numeric) + COALESCE(lmr.best_dead, 0::numeric), lmr.body_weight, lmr.sex) AS gl, lmr.placement, mi.meet_slug, m.instagram_username, m.dob, mi.host_date, m.slug, lmr.lot, mi.system_year, mi.hidden, m.decorator_1, m.decorator_2 FROM legacy_meet_result lmr JOIN members m ON lmr.vpf_id = m.vpf_id JOIN meet_info mi ON mi.meet_id = lmr.meet_id`)