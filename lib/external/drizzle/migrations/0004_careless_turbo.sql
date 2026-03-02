ALTER TABLE "legacy_meet_results" RENAME COLUMN "showOnProfile" TO "show_on_profile";--> statement-breakpoint
ALTER TABLE "meet_results" RENAME COLUMN "showOnProfile" TO "show_on_profile";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "active" TO "vpf_membership_active";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "vpf_membership_expires_at" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "vip_membership_active" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "vip_membership_expires_at" date;