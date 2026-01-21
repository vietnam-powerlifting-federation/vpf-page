-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."division" AS ENUM('subjr', 'jr', 'open', 'mas1', 'mas2', 'mas3', 'mas4', 'guest');--> statement-breakpoint
CREATE TYPE "public"."meet_type" AS ENUM('national', 'amateur', 'professional', 'national_qualifier', 'other');--> statement-breakpoint
CREATE TYPE "public"."sexes" AS ENUM('female', 'male');--> statement-breakpoint
CREATE SEQUENCE "public"."vpf_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 889 CACHE 1;--> statement-breakpoint
CREATE TABLE "teams" (
	"team_id" serial PRIMARY KEY NOT NULL,
	"team_name" text NOT NULL,
	CONSTRAINT "teams_name_key" UNIQUE("team_name")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"vpf_id" text PRIMARY KEY DEFAULT ('VPF'::text || lpad((nextval('vpf_seq'::regclass))::text, 6, '0'::text)) NOT NULL,
	"full_name" text NOT NULL,
	"nationality" text,
	"dob" smallint,
	"national_id" text,
	"address" text,
	"phone_number" text,
	"squat_rack_pin" smallint DEFAULT 0,
	"bench_rack_pin" smallint DEFAULT 0,
	"bench_safety_pin" smallint DEFAULT 0,
	"bench_foot_block" smallint DEFAULT 0,
	"email" text,
	"active" boolean DEFAULT true,
	"drug_violate" boolean DEFAULT false,
	"notes" text,
	"is_guest" boolean DEFAULT false,
	"password" text,
	"national_id_image_url" text,
	"instagram_username" text,
	"slug" text,
	"decorator_1" text,
	"decorator_2" text,
	CONSTRAINT "members_social_id_image_url_key" UNIQUE("national_id_image_url"),
	CONSTRAINT "members_slug_key" UNIQUE("slug"),
	CONSTRAINT "members_dob_check" CHECK ((dob >= 1900) AND ((dob)::numeric <= EXTRACT(year FROM CURRENT_DATE)))
);
--> statement-breakpoint
CREATE TABLE "meet_info" (
	"meet_id" serial PRIMARY KEY NOT NULL,
	"meet_name" text NOT NULL,
	"city" text,
	"start_registration" date,
	"close_registration" date,
	"host_date" date,
	"type" "meet_type",
	"media_link" text,
	"meet_slug" text DEFAULT '',
	"system_year" smallint,
	"hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy_meet_result" (
	"meet_id" integer NOT NULL,
	"vpf_id" text NOT NULL,
	"sex" "sexes",
	"weight_class" integer,
	"division" "division",
	"body_weight" numeric(5, 2) DEFAULT '0.0',
	"best_squat" numeric(5, 2) DEFAULT '0.0',
	"best_bench" numeric(5, 2) DEFAULT '0.0',
	"best_dead" numeric(5, 2) DEFAULT '0.0',
	"platform" text,
	"session" text,
	"flight" text,
	"team_id" integer,
	"team_score" numeric,
	"placement" integer,
	"lot" smallint,
	CONSTRAINT "legacy_meet_result_pkey" PRIMARY KEY("meet_id","vpf_id"),
	CONSTRAINT "chk_weight_class_sex" CHECK (((sex = 'male'::sexes) AND (weight_class = ANY (ARRAY[53, 59, 66, 74, 83, 93, 105, 120, 999]))) OR ((sex = 'female'::sexes) AND (weight_class = ANY (ARRAY[43, 47, 52, 57, 63, 69, 76, 84, 999]))) OR (sex IS NULL))
);
--> statement-breakpoint
CREATE TABLE "meet_result" (
	"meet_id" integer NOT NULL,
	"vpf_id" text NOT NULL,
	"sex" "sexes",
	"weight_class" integer,
	"division" "division",
	"body_weight" numeric(5, 2) DEFAULT '0.0',
	"squat1" numeric(5, 2) DEFAULT '0.0',
	"squat2" numeric(5, 2) DEFAULT '0.0',
	"squat3" numeric(5, 2) DEFAULT '0.0',
	"bench1" numeric(5, 2) DEFAULT '0.0',
	"bench2" numeric(5, 2) DEFAULT '0.0',
	"bench3" numeric(5, 2) DEFAULT '0.0',
	"dead1" numeric(5, 2) DEFAULT '0.0',
	"dead2" numeric(5, 2) DEFAULT '0.0',
	"dead3" numeric(5, 2) DEFAULT '0.0',
	"platform" text,
	"session" text,
	"flight" text,
	"team_id" integer,
	"team_score" numeric,
	"placement" integer,
	"lot" smallint,
	CONSTRAINT "meet_result_pkey" PRIMARY KEY("meet_id","vpf_id"),
	CONSTRAINT "chk_weight_class_sex" CHECK (((sex = 'male'::sexes) AND (weight_class = ANY (ARRAY[53, 59, 66, 74, 83, 93, 105, 120, 999]))) OR ((sex = 'female'::sexes) AND (weight_class = ANY (ARRAY[43, 47, 52, 57, 63, 69, 76, 84, 999]))) OR (sex IS NULL))
);
--> statement-breakpoint
ALTER TABLE "legacy_meet_result" ADD CONSTRAINT "legacy_meet_result_meet_id_fkey" FOREIGN KEY ("meet_id") REFERENCES "public"."meet_info"("meet_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "legacy_meet_result" ADD CONSTRAINT "legacy_meet_result_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("team_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "legacy_meet_result" ADD CONSTRAINT "legacy_meet_result_vpf_id_fkey" FOREIGN KEY ("vpf_id") REFERENCES "public"."members"("vpf_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meet_result" ADD CONSTRAINT "meet_result_meet_id_fkey" FOREIGN KEY ("meet_id") REFERENCES "public"."meet_info"("meet_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meet_result" ADD CONSTRAINT "meet_result_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("team_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meet_result" ADD CONSTRAINT "meet_result_vpf_id_fkey" FOREIGN KEY ("vpf_id") REFERENCES "public"."members"("vpf_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."meet_result_detailed" AS (SELECT mr.meet_id, mr.vpf_id, mr.sex, mr.weight_class, mr.division, mr.body_weight, mr.squat1, mr.squat2, mr.squat3, GREATEST(mr.squat1, mr.squat2, mr.squat3, 0::numeric) AS best_squat, mr.bench1, mr.bench2, mr.bench3, GREATEST(mr.bench1, mr.bench2, mr.bench3, 0::numeric) AS best_bench, mr.dead1, mr.dead2, mr.dead3, GREATEST(mr.dead1, mr.dead2, mr.dead3, 0::numeric) AS best_dead, mr.platform, mr.session, mr.flight, mr.team_id, mr.team_score, m.full_name, mi.meet_name, mi.type, GREATEST(mr.squat1, mr.squat2, mr.squat3, 0::numeric) + GREATEST(mr.bench1, mr.bench2, mr.bench3, 0::numeric) + GREATEST(mr.dead1, mr.dead2, mr.dead3, 0::numeric) AS total, calculate_dots(GREATEST(mr.squat1, mr.squat2, mr.squat3, 0::numeric) + GREATEST(mr.bench1, mr.bench2, mr.bench3, 0::numeric) + GREATEST(mr.dead1, mr.dead2, mr.dead3, 0::numeric), mr.body_weight, mr.sex) AS dots, calculate_ipf(GREATEST(mr.squat1, mr.squat2, mr.squat3, 0::numeric) + GREATEST(mr.bench1, mr.bench2, mr.bench3, 0::numeric) + GREATEST(mr.dead1, mr.dead2, mr.dead3, 0::numeric), mr.body_weight, mr.sex) AS ipf, calculate_gl(GREATEST(mr.squat1, mr.squat2, mr.squat3, 0::numeric) + GREATEST(mr.bench1, mr.bench2, mr.bench3, 0::numeric) + GREATEST(mr.dead1, mr.dead2, mr.dead3, 0::numeric), mr.body_weight, mr.sex) AS gl, mr.placement, mi.meet_slug, m.instagram_username, m.dob, mi.host_date, m.slug, mr.lot, mi.system_year, mi.hidden, m.decorator_1, m.decorator_2 FROM meet_result mr JOIN members m ON mr.vpf_id = m.vpf_id JOIN meet_info mi ON mi.meet_id = mr.meet_id UNION ALL SELECT lmr.meet_id, lmr.vpf_id, lmr.sex, lmr.weight_class, lmr.division, lmr.body_weight, NULL::numeric AS squat1, NULL::numeric AS squat2, NULL::numeric AS squat3, lmr.best_squat, NULL::numeric AS bench1, NULL::numeric AS bench2, NULL::numeric AS bench3, lmr.best_bench, NULL::numeric AS dead1, NULL::numeric AS dead2, NULL::numeric AS dead3, lmr.best_dead, lmr.platform, lmr.session, lmr.flight, lmr.team_id, lmr.team_score, m.full_name, mi.meet_name, mi.type, COALESCE(lmr.best_squat, 0::numeric) + COALESCE(lmr.best_bench, 0::numeric) + COALESCE(lmr.best_dead, 0::numeric) AS total, calculate_dots(COALESCE(lmr.best_squat, 0::numeric) + COALESCE(lmr.best_bench, 0::numeric) + COALESCE(lmr.best_dead, 0::numeric), lmr.body_weight, lmr.sex) AS dots, calculate_ipf(COALESCE(lmr.best_squat, 0::numeric) + COALESCE(lmr.best_bench, 0::numeric) + COALESCE(lmr.best_dead, 0::numeric), lmr.body_weight, lmr.sex) AS ipf, calculate_gl(COALESCE(lmr.best_squat, 0::numeric) + COALESCE(lmr.best_bench, 0::numeric) + COALESCE(lmr.best_dead, 0::numeric), lmr.body_weight, lmr.sex) AS gl, lmr.placement, mi.meet_slug, m.instagram_username, m.dob, mi.host_date, m.slug, lmr.lot, mi.system_year, mi.hidden, m.decorator_1, m.decorator_2 FROM legacy_meet_result lmr JOIN members m ON lmr.vpf_id = m.vpf_id JOIN meet_info mi ON mi.meet_id = lmr.meet_id);
*/