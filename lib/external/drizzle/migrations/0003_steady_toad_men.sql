ALTER TABLE "meets" ALTER COLUMN "system_year" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ADD COLUMN "showOnProfile" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "meet_results" ADD COLUMN "showOnProfile" boolean DEFAULT true;