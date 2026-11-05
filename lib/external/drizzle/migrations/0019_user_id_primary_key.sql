-- users: a uuid `user_id` becomes the primary key; `vpf_id` stays as a unique public number.
--
-- The SQL drizzle-kit generated for this change could not run against real data:
-- it adds NOT NULL columns to populated tables, drops every `vpf_id` reference
-- without carrying it over, and leaves the primary-key drop commented out. The
-- snapshot it wrote (0019_snapshot.json) is correct; this file reaches the same
-- schema while backfilling every reference from `vpf_id` to `user_id`.

ALTER TABLE "users" ADD COLUMN "user_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint

-- 1. New uuid columns, backfilled through the old vpf_id link.
ALTER TABLE "competition_ban_list" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "meet_entries" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "meet_results" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "user_violations" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "vip_benefits" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD COLUMN "reviewed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "approved_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint

UPDATE "competition_ban_list" t SET "user_id" = u."user_id" FROM "users" u WHERE u."vpf_id" = t."vpf_id";--> statement-breakpoint
UPDATE "identity_verifications" t SET "user_id" = u."user_id" FROM "users" u WHERE u."vpf_id" = t."vpf_id";--> statement-breakpoint
UPDATE "legacy_meet_results" t SET "user_id" = u."user_id" FROM "users" u WHERE u."vpf_id" = t."vpf_id";--> statement-breakpoint
UPDATE "meet_entries" t SET "user_id" = u."user_id" FROM "users" u WHERE u."vpf_id" = t."vpf_id";--> statement-breakpoint
UPDATE "meet_results" t SET "user_id" = u."user_id" FROM "users" u WHERE u."vpf_id" = t."vpf_id";--> statement-breakpoint
UPDATE "purchases" t SET "user_id" = u."user_id" FROM "users" u WHERE u."vpf_id" = t."vpf_id";--> statement-breakpoint
UPDATE "user_violations" t SET "user_id" = u."user_id" FROM "users" u WHERE u."vpf_id" = t."vpf_id";--> statement-breakpoint
UPDATE "vip_benefits" t SET "user_id" = u."user_id" FROM "users" u WHERE u."vpf_id" = t."vpf_id";--> statement-breakpoint
UPDATE "vouchers" t SET "user_id" = u."user_id" FROM "users" u WHERE u."vpf_id" = t."vpf_id";--> statement-breakpoint
UPDATE "identity_verifications" t SET "reviewed_by_user_id" = u."user_id" FROM "users" u WHERE u."vpf_id" = t."reviewed_by";--> statement-breakpoint
UPDATE "purchases" t SET "approved_by_user_id" = u."user_id" FROM "users" u WHERE u."vpf_id" = t."approved_by";--> statement-breakpoint
UPDATE "vouchers" t SET "created_by_user_id" = u."user_id" FROM "users" u WHERE u."vpf_id" = t."created_by";--> statement-breakpoint

-- 2. Drop everything that hangs off users.vpf_id: every foreign key into users
-- (whatever it is called in this database), then the old primary key itself.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'f' AND confrelid = 'public.users'::regclass
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;

  FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'p' AND conrelid IN ('public.users'::regclass, 'public.vip_benefits'::regclass)
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;--> statement-breakpoint

ALTER TABLE "competition_ban_list" DROP CONSTRAINT "competition_ban_list_meet_vpf_key";--> statement-breakpoint
ALTER TABLE "identity_verifications" DROP CONSTRAINT "identity_verifications_vpf_id_key";--> statement-breakpoint
ALTER TABLE "legacy_meet_results" DROP CONSTRAINT "legacy_meet_result_meet_vpf_key";--> statement-breakpoint
ALTER TABLE "meet_entries" DROP CONSTRAINT "meet_entries_meet_vpf_key";--> statement-breakpoint
ALTER TABLE "meet_results" DROP CONSTRAINT "meet_result_meet_vpf_key";--> statement-breakpoint
DROP INDEX "vouchers_vpf_id_idx";--> statement-breakpoint

-- 3. Swap the columns.
ALTER TABLE "competition_ban_list" DROP COLUMN "vpf_id";--> statement-breakpoint
ALTER TABLE "identity_verifications" DROP COLUMN "vpf_id";--> statement-breakpoint
ALTER TABLE "legacy_meet_results" DROP COLUMN "vpf_id";--> statement-breakpoint
ALTER TABLE "meet_entries" DROP COLUMN "vpf_id";--> statement-breakpoint
ALTER TABLE "meet_results" DROP COLUMN "vpf_id";--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN "vpf_id";--> statement-breakpoint
ALTER TABLE "user_violations" DROP COLUMN "vpf_id";--> statement-breakpoint
ALTER TABLE "vip_benefits" DROP COLUMN "vpf_id";--> statement-breakpoint
ALTER TABLE "vouchers" DROP COLUMN "vpf_id";--> statement-breakpoint
ALTER TABLE "identity_verifications" DROP COLUMN "reviewed_by";--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN "approved_by";--> statement-breakpoint
ALTER TABLE "vouchers" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "identity_verifications" RENAME COLUMN "reviewed_by_user_id" TO "reviewed_by";--> statement-breakpoint
ALTER TABLE "purchases" RENAME COLUMN "approved_by_user_id" TO "approved_by";--> statement-breakpoint
ALTER TABLE "vouchers" RENAME COLUMN "created_by_user_id" TO "created_by";--> statement-breakpoint

-- Fails loudly if any row pointed at a vpf_id with no matching athlete.
ALTER TABLE "competition_ban_list" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "identity_verifications" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "meet_entries" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "meet_results" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_violations" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vip_benefits" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint

-- 4. New keys and constraints.
ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_vpf_id_key" UNIQUE("vpf_id");--> statement-breakpoint
ALTER TABLE "vip_benefits" ADD CONSTRAINT "vip_benefits_pkey" PRIMARY KEY ("user_id");--> statement-breakpoint

ALTER TABLE "competition_ban_list" ADD CONSTRAINT "competition_ban_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ADD CONSTRAINT "legacy_meet_result_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meet_entries" ADD CONSTRAINT "meet_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "meet_results" ADD CONSTRAINT "meet_result_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_violations" ADD CONSTRAINT "user_violations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "vip_benefits" ADD CONSTRAINT "vip_benefits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint

ALTER TABLE "competition_ban_list" ADD CONSTRAINT "competition_ban_list_meet_user_key" UNIQUE("meet_id","user_id");--> statement-breakpoint
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_user_id_key" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ADD CONSTRAINT "legacy_meet_result_meet_user_key" UNIQUE("meet_id","user_id");--> statement-breakpoint
ALTER TABLE "meet_entries" ADD CONSTRAINT "meet_entries_meet_user_key" UNIQUE("meet_id","user_id");--> statement-breakpoint
ALTER TABLE "meet_results" ADD CONSTRAINT "meet_result_meet_user_key" UNIQUE("meet_id","user_id");--> statement-breakpoint
CREATE INDEX "vouchers_user_id_idx" ON "vouchers" USING btree ("user_id");
