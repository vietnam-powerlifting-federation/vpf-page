CREATE TABLE "competition_ban_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"meet_id" integer NOT NULL,
	"vpf_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competition_ban_list_meet_vpf_key" UNIQUE("meet_id","vpf_id")
);
--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "type" SET DATA TYPE "public"."purchase_type"[] USING ARRAY["type"]::"public"."purchase_type"[];--> statement-breakpoint
ALTER TABLE "user_violations" DROP CONSTRAINT "user_violations_pkey";--> statement-breakpoint
ALTER TABLE "competition_purchase_metadata" ADD COLUMN "media_plus" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meets" ADD COLUMN "entry_fee" integer;--> statement-breakpoint
ALTER TABLE "user_violations" ADD COLUMN "id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "competition_photo_url" text;--> statement-breakpoint
ALTER TABLE "competition_ban_list" ADD CONSTRAINT "competition_ban_list_meet_id_fkey" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("meet_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "competition_ban_list" ADD CONSTRAINT "competition_ban_list_vpf_id_fkey" FOREIGN KEY ("vpf_id") REFERENCES "public"."users"("vpf_id") ON DELETE cascade ON UPDATE cascade;
