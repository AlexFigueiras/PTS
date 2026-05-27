ALTER TABLE "intersectoral_tasks" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "pts_evolutions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "pts_responses" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
