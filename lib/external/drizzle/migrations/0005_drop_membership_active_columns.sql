-- Drop membership active columns; active status is derived from *_expires_at columns
ALTER TABLE "users" DROP COLUMN IF EXISTS "vpf_membership_active";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "vip_membership_active";
