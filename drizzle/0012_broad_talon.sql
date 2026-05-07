CREATE TABLE "partners" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" varchar(100) NOT NULL,
	"label_ko" varchar(200) NOT NULL,
	"label_en" varchar(200) NOT NULL,
	"plan" "user_plan" DEFAULT 'pro' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "partners_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "email_jobs" ADD COLUMN "locale" varchar(2) DEFAULT 'ko' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "granted_plan" "user_plan";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "partner_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locale" varchar(2) DEFAULT 'ko' NOT NULL;--> statement-breakpoint
CREATE INDEX "partners_active_idx" ON "partners" USING btree ("active");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;