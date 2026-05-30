-- Recriação de intersectoral_tasks perdida durante reparo do ledger (TD-001).
-- Schema derivado de lib/db/schema/intersectoral-tasks.ts

DO $$ BEGIN
  CREATE TYPE "public"."task_status" AS ENUM('requested','accepted','in-progress','completed','cancelled','failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."task_intent" AS ENUM('proposal','plan','order','original-order');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."task_priority" AS ENUM('routine','urgent','stat','asap');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "intersectoral_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "public"."tenants"("id") ON DELETE cascade,
  "patient_id" uuid NOT NULL REFERENCES "public"."patients"("id") ON DELETE cascade,
  "status" "task_status" NOT NULL DEFAULT 'requested',
  "intent" "task_intent" NOT NULL DEFAULT 'order',
  "priority" "task_priority" NOT NULL DEFAULT 'routine',
  "description" text NOT NULL,
  "source_unit_id" uuid NOT NULL REFERENCES "public"."service_units"("id") ON DELETE restrict,
  "target_unit_id" uuid NOT NULL REFERENCES "public"."service_units"("id") ON DELETE restrict,
  "requester_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE restrict,
  "owner_id" uuid REFERENCES "public"."profiles"("id") ON DELETE set null,
  "history" jsonb NOT NULL DEFAULT '[]',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint

ALTER TABLE "intersectoral_tasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS "intersectoral_tasks_tenant_select" ON "intersectoral_tasks";
CREATE POLICY "intersectoral_tasks_tenant_select" ON "intersectoral_tasks"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint

DROP POLICY IF EXISTS "intersectoral_tasks_tenant_insert" ON "intersectoral_tasks";
CREATE POLICY "intersectoral_tasks_tenant_insert" ON "intersectoral_tasks"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint

DROP POLICY IF EXISTS "intersectoral_tasks_tenant_update" ON "intersectoral_tasks";
CREATE POLICY "intersectoral_tasks_tenant_update" ON "intersectoral_tasks"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint

DROP POLICY IF EXISTS "intersectoral_tasks_tenant_delete" ON "intersectoral_tasks";
CREATE POLICY "intersectoral_tasks_tenant_delete" ON "intersectoral_tasks"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "intersectoral_tasks_tenant_idx" ON "intersectoral_tasks" ("tenant_id");
CREATE INDEX IF NOT EXISTS "intersectoral_tasks_patient_idx" ON "intersectoral_tasks" ("patient_id");
CREATE INDEX IF NOT EXISTS "intersectoral_tasks_target_unit_status_idx" ON "intersectoral_tasks" ("target_unit_id","status");
CREATE INDEX IF NOT EXISTS "intersectoral_tasks_status_idx" ON "intersectoral_tasks" ("status");
