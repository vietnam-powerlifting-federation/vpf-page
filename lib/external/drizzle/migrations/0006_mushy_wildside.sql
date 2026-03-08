CREATE TABLE "vip_benefits" (
	"vpf_id" text PRIMARY KEY NOT NULL,
	"avatar_image_url" text,
	"banner_image_url_1" text,
	"banner_image_url_2" text,
	"banner_image_url_3" text,
	"banner_image_url_4" text,
	"banner_image_url_5" text,
	"profile_description" text,
	"display_profile_description" boolean DEFAULT false,
	"alias" text,
	"display_alias" boolean DEFAULT false,
	"facebook" text,
	"display_facebook" boolean DEFAULT false,
	"instagram" text,
	"display_instagram" boolean DEFAULT false,
	"tiktok" text,
	"display_tiktok" boolean DEFAULT false,
	"youtube" text,
	"display_youtube" boolean DEFAULT false,
	"display_mobile_phone" boolean DEFAULT false,
	"decorator1" text,
	"decorator2" text
);
--> statement-breakpoint
ALTER TABLE "vip_benefits" ADD CONSTRAINT "vip_benefits_vpf_id_fkey" FOREIGN KEY ("vpf_id") REFERENCES "public"."users"("vpf_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "decorator1";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "decorator2";