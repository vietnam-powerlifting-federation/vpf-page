CREATE TYPE "public"."purchase_status" AS ENUM('pending', 'active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."purchase_type" AS ENUM('vip', 'vpf_membership', 'competition');--> statement-breakpoint
CREATE TABLE "competition_purchase_metadata" (
	"purchase_id" integer PRIMARY KEY NOT NULL,
	"meet_id" integer NOT NULL,
	"sex" "sexes" NOT NULL,
	"weight_class" integer NOT NULL,
	"division" "division" NOT NULL,
	CONSTRAINT "chk_competition_weight_class_sex" CHECK (((sex = 'male'::sexes) AND (weight_class = ANY (ARRAY[53, 59, 66, 74, 83, 93, 105, 120, 999]))) OR ((sex = 'female'::sexes) AND (weight_class = ANY (ARRAY[43, 47, 52, 57, 63, 69, 76, 84, 999]))))
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"purchase_id" serial PRIMARY KEY NOT NULL,
	"vpf_id" text NOT NULL,
	"type" "purchase_type" NOT NULL,
	"ref_code" text NOT NULL,
	"amount" integer NOT NULL,
	"status" "purchase_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"approved_by" text,
	CONSTRAINT "purchases_ref_code_key" UNIQUE("ref_code")
);
--> statement-breakpoint
CREATE TABLE "vip_purchase_metadata" (
	"purchase_id" integer PRIMARY KEY NOT NULL,
	"duration_months" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vpf_membership_purchase_metadata" (
	"purchase_id" integer PRIMARY KEY NOT NULL,
	"membership_year" smallint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competition_purchase_metadata" ADD CONSTRAINT "competition_purchase_metadata_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("purchase_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "competition_purchase_metadata" ADD CONSTRAINT "competition_purchase_metadata_meet_id_fkey" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("meet_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_vpf_id_fkey" FOREIGN KEY ("vpf_id") REFERENCES "public"."users"("vpf_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("vpf_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "vip_purchase_metadata" ADD CONSTRAINT "vip_purchase_metadata_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("purchase_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "vpf_membership_purchase_metadata" ADD CONSTRAINT "vpf_membership_purchase_metadata_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("purchase_id") ON DELETE cascade ON UPDATE cascade;