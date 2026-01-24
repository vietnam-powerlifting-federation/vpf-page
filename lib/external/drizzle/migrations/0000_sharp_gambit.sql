-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."division" AS ENUM('subjr', 'jr', 'open', 'mas1', 'mas2', 'mas3', 'mas4', 'guest');--> statement-breakpoint
CREATE TYPE "public"."meet_type" AS ENUM('national', 'amateur', 'professional', 'national_qualifier', 'other');--> statement-breakpoint
CREATE TYPE "public"."sexes" AS ENUM('female', 'male');--> statement-breakpoint
CREATE SEQUENCE "public"."vpf_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 889 CACHE 1;--> statement-breakpoint
CREATE TABLE "users" (
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
	"legacy_email" text,
	"active" boolean DEFAULT true,
	"drug_violate" boolean DEFAULT false,
	"notes" text,
	"password" text,
	"instagram_username" text,
	"slug" text,
	"decorator1" text,
	"decorator2" text,
	"ban_level" smallint DEFAULT '0' NOT NULL,
	CONSTRAINT "members_slug_key" UNIQUE("slug"),
	CONSTRAINT "members_dob_check" CHECK ((dob >= 1900) AND ((dob)::numeric <= EXTRACT(year FROM CURRENT_DATE)))
);
--> statement-breakpoint
CREATE TABLE "meets" (
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
	"hidden" boolean DEFAULT false NOT NULL,
	"allow_spotter_registration" boolean DEFAULT true,
	"allow_guest_registration" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"team_id" serial PRIMARY KEY NOT NULL,
	"team_name" text NOT NULL,
	CONSTRAINT "teams_name_key" UNIQUE("team_name")
);
--> statement-breakpoint
CREATE TABLE "user_violations" (
	"vpf_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"system_year" smallint
);
--> statement-breakpoint
CREATE TABLE "legacy_meet_results" (
	"meet_id" integer NOT NULL,
	"vpf_id" text NOT NULL,
	"sex" "sexes" NOT NULL,
	"weight_class" integer NOT NULL,
	"division" "division" NOT NULL,
	"body_weight" numeric(5, 2) DEFAULT 'NULL',
	"best_squat" numeric(5, 2) DEFAULT 'NULL',
	"best_bench" numeric(5, 2) DEFAULT 'NULL',
	"best_deadlift" numeric(5, 2) DEFAULT 'NULL',
	"platform" text,
	"session" text,
	"flight" text,
	"team_id" integer,
	"lot" smallint,
	"ranked" boolean DEFAULT true,
	CONSTRAINT "legacy_meet_result_pkey" PRIMARY KEY("meet_id","vpf_id"),
	CONSTRAINT "chk_weight_class_sex" CHECK (((sex = 'male'::sexes) AND (weight_class = ANY (ARRAY[53, 59, 66, 74, 83, 93, 105, 120, 999]))) OR ((sex = 'female'::sexes) AND (weight_class = ANY (ARRAY[43, 47, 52, 57, 63, 69, 76, 84, 999]))) OR (sex IS NULL))
);
--> statement-breakpoint
CREATE TABLE "meet_results" (
	"meet_id" integer NOT NULL,
	"vpf_id" text NOT NULL,
	"sex" "sexes" NOT NULL,
	"weight_class" integer NOT NULL,
	"division" "division" NOT NULL,
	"body_weight" numeric(5, 2) DEFAULT '0.0',
	"squat1" numeric(5, 2) DEFAULT 'NULL',
	"squat2" numeric(5, 2) DEFAULT 'NULL',
	"squat3" numeric(5, 2) DEFAULT 'NULL',
	"bench1" numeric(5, 2) DEFAULT 'NULL',
	"bench2" numeric(5, 2) DEFAULT 'NULL',
	"bench3" numeric(5, 2) DEFAULT 'NULL',
	"deadlift1" numeric(5, 2) DEFAULT 'NULL',
	"deadlift2" numeric(5, 2) DEFAULT 'NULL',
	"deadlift3" numeric(5, 2) DEFAULT 'NULL',
	"platform" text,
	"session" text,
	"flight" text,
	"team_id" integer,
	"lot" smallint,
	"ranked" boolean DEFAULT true,
	CONSTRAINT "meet_result_pkey" PRIMARY KEY("meet_id","vpf_id"),
	CONSTRAINT "chk_weight_class_sex" CHECK (((sex = 'male'::sexes) AND (weight_class = ANY (ARRAY[53, 59, 66, 74, 83, 93, 105, 120, 999]))) OR ((sex = 'female'::sexes) AND (weight_class = ANY (ARRAY[43, 47, 52, 57, 63, 69, 76, 84, 999]))) OR (sex IS NULL))
);
--> statement-breakpoint
ALTER TABLE "user_violations" ADD CONSTRAINT "user_violations_vpf_id_fkey" FOREIGN KEY ("vpf_id") REFERENCES "public"."users"("vpf_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ADD CONSTRAINT "legacy_meet_result_meet_id_fkey" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("meet_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ADD CONSTRAINT "legacy_meet_result_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("team_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ADD CONSTRAINT "legacy_meet_result_vpf_id_fkey" FOREIGN KEY ("vpf_id") REFERENCES "public"."users"("vpf_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meet_results" ADD CONSTRAINT "meet_result_meet_id_fkey" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("meet_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meet_results" ADD CONSTRAINT "meet_result_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("team_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meet_results" ADD CONSTRAINT "meet_result_vpf_id_fkey" FOREIGN KEY ("vpf_id") REFERENCES "public"."users"("vpf_id") ON DELETE cascade ON UPDATE cascade;
*/