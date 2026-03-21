ALTER TABLE "legacy_meet_results" DROP CONSTRAINT "legacy_meet_result_pkey";--> statement-breakpoint
ALTER TABLE "meet_results" DROP CONSTRAINT "meet_result_pkey";--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ADD PRIMARY KEY ("legacy_result_id");--> statement-breakpoint
ALTER TABLE "meet_results" ADD PRIMARY KEY ("result_id");--> statement-breakpoint
ALTER TABLE "legacy_meet_results" ADD CONSTRAINT "legacy_meet_result_meet_vpf_key" UNIQUE("meet_id","vpf_id");--> statement-breakpoint
ALTER TABLE "meet_results" ADD CONSTRAINT "meet_result_meet_vpf_key" UNIQUE("meet_id","vpf_id");