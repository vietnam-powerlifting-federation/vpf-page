ALTER TABLE "legacy_meet_results" ADD COLUMN "legacy_result_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "meet_results" ADD COLUMN "result_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "instagram_username";