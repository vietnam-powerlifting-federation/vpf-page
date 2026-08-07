CREATE TABLE "meet_entries" (
	"entry_id" serial PRIMARY KEY NOT NULL,
	"meet_id" integer NOT NULL,
	"vpf_id" text NOT NULL,
	"purchase_id" integer,
	"team_id" integer,
	"sex" "sexes" NOT NULL,
	"weight_class" integer NOT NULL,
	"division" "division" NOT NULL,
	"platform" text,
	"session" text,
	"flight" text,
	"lot" smallint,
	"raw_or_equipped" text DEFAULT 'Raw' NOT NULL,
	"was_drug_tested" boolean DEFAULT false NOT NULL,
	"squat_opener" numeric(5, 2),
	"bench_opener" numeric(5, 2),
	"deadlift_opener" numeric(5, 2),
	"additional_items" text,
	"withdrawn" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meet_entries_meet_vpf_key" UNIQUE("meet_id","vpf_id"),
	CONSTRAINT "chk_entry_weight_class_sex" CHECK (((sex = 'male'::sexes) AND (weight_class = ANY (ARRAY[53, 59, 66, 74, 83, 93, 105, 120, 999]))) OR ((sex = 'female'::sexes) AND (weight_class = ANY (ARRAY[43, 47, 52, 57, 63, 69, 76, 84, 999]))))
);
--> statement-breakpoint
ALTER TABLE "meet_entries" ADD CONSTRAINT "meet_entries_meet_id_fkey" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("meet_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meet_entries" ADD CONSTRAINT "meet_entries_vpf_id_fkey" FOREIGN KEY ("vpf_id") REFERENCES "public"."users"("vpf_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meet_entries" ADD CONSTRAINT "meet_entries_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("purchase_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meet_entries" ADD CONSTRAINT "meet_entries_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("team_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meets" ADD CONSTRAINT "meets_slug_key" UNIQUE("meet_slug");