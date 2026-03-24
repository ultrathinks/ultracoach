ALTER TABLE "sessions" ADD COLUMN "company_name" varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "job_research_json" jsonb;