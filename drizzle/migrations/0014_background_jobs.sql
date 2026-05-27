CREATE TABLE IF NOT EXISTS "background_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"queue_name" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 5 NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_log" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "background_jobs_tenant_idx" ON "background_jobs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "background_jobs_status_run_at_idx" ON "background_jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "background_jobs_queue_idx" ON "background_jobs" USING btree ("queue_name");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
