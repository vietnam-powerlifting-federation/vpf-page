CREATE TYPE "public"."voucher_discount_kind" AS ENUM('fixed', 'percent');--> statement-breakpoint
CREATE TABLE "vouchers" (
	"voucher_id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"vpf_id" text NOT NULL,
	"type" "purchase_type" NOT NULL,
	"discount_kind" "voucher_discount_kind" NOT NULL,
	"discount_value" integer NOT NULL,
	"expires_at" date NOT NULL,
	"redeemed_purchase_id" integer,
	"redeemed_at" timestamp with time zone,
	"discount_applied" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "vouchers_code_key" UNIQUE("code"),
	CONSTRAINT "vouchers_purchase_type_key" UNIQUE("redeemed_purchase_id","type"),
	CONSTRAINT "chk_voucher_discount_value" CHECK (((discount_kind = 'percent'::voucher_discount_kind) AND (discount_value BETWEEN 1 AND 100)) OR ((discount_kind = 'fixed'::voucher_discount_kind) AND (discount_value > 0))),
	CONSTRAINT "chk_voucher_redeemed_consistent" CHECK ((redeemed_purchase_id IS NULL AND redeemed_at IS NULL AND discount_applied IS NULL) OR (redeemed_purchase_id IS NOT NULL AND redeemed_at IS NOT NULL AND discount_applied IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_vpf_id_fkey" FOREIGN KEY ("vpf_id") REFERENCES "public"."users"("vpf_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_redeemed_purchase_id_fkey" FOREIGN KEY ("redeemed_purchase_id") REFERENCES "public"."purchases"("purchase_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("vpf_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "vouchers_vpf_id_idx" ON "vouchers" USING btree ("vpf_id");