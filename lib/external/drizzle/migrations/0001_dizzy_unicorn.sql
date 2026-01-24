ALTER TABLE "meets" ALTER COLUMN "meet_slug" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ALTER COLUMN "body_weight" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ALTER COLUMN "best_squat" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ALTER COLUMN "best_bench" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ALTER COLUMN "best_deadlift" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "meet_results" ALTER COLUMN "body_weight" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "meet_results" ALTER COLUMN "squat1" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "meet_results" ALTER COLUMN "squat2" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "meet_results" ALTER COLUMN "squat3" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "meet_results" ALTER COLUMN "bench1" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "meet_results" ALTER COLUMN "bench2" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "meet_results" ALTER COLUMN "bench3" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "meet_results" ALTER COLUMN "deadlift1" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "meet_results" ALTER COLUMN "deadlift2" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "meet_results" ALTER COLUMN "deadlift3" DROP DEFAULT;