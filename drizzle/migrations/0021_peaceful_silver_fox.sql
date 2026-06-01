DO $$ BEGIN CREATE TYPE "public"."case_status" AS ENUM('radar', 'observacao', 'acompanhamento', 'pts_ativo', 'pia_ativo', 'alta', 'evasao', 'transferencia', 'obito', 'recusa'); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pts_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"status" "case_status" DEFAULT 'radar' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pts_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pts_cases" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_cases_tenant_select" ON "pts_cases";
CREATE POLICY "pts_cases_tenant_select" ON "pts_cases"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_cases_tenant_insert" ON "pts_cases";
CREATE POLICY "pts_cases_tenant_insert" ON "pts_cases"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_cases_tenant_update" ON "pts_cases";
CREATE POLICY "pts_cases_tenant_update" ON "pts_cases"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_cases_tenant_delete" ON "pts_cases";
CREATE POLICY "pts_cases_tenant_delete" ON "pts_cases"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pts_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"type" text NOT NULL,
	"owner_id" uuid,
	"legal_measure" text,
	"mandatory_review_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pts_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pts_plans" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_plans_tenant_select" ON "pts_plans";
CREATE POLICY "pts_plans_tenant_select" ON "pts_plans"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_plans_tenant_insert" ON "pts_plans";
CREATE POLICY "pts_plans_tenant_insert" ON "pts_plans"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_plans_tenant_update" ON "pts_plans";
CREATE POLICY "pts_plans_tenant_update" ON "pts_plans"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_plans_tenant_delete" ON "pts_plans";
CREATE POLICY "pts_plans_tenant_delete" ON "pts_plans"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pts_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"responsible_unit_id" uuid NOT NULL,
	"assigned_professional_id" uuid,
	"deadline" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"description" text NOT NULL,
	"evolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pts_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pts_actions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_actions_tenant_select" ON "pts_actions";
CREATE POLICY "pts_actions_tenant_select" ON "pts_actions"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_actions_tenant_insert" ON "pts_actions";
CREATE POLICY "pts_actions_tenant_insert" ON "pts_actions"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_actions_tenant_update" ON "pts_actions";
CREATE POLICY "pts_actions_tenant_update" ON "pts_actions"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_actions_tenant_delete" ON "pts_actions";
CREATE POLICY "pts_actions_tenant_delete" ON "pts_actions"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pts_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"source_record_id" uuid,
	"destination_component" text NOT NULL,
	"destination_unit_id" uuid,
	"priority" text NOT NULL,
	"status" text NOT NULL,
	"abstract_reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pts_signals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pts_signals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_signals_tenant_select" ON "pts_signals";
CREATE POLICY "pts_signals_tenant_select" ON "pts_signals"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_signals_tenant_insert" ON "pts_signals";
CREATE POLICY "pts_signals_tenant_insert" ON "pts_signals"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_signals_tenant_update" ON "pts_signals";
CREATE POLICY "pts_signals_tenant_update" ON "pts_signals"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint
DROP POLICY IF EXISTS "pts_signals_tenant_delete" ON "pts_signals";
CREATE POLICY "pts_signals_tenant_delete" ON "pts_signals"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pts_actions" ADD CONSTRAINT "pts_actions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pts_actions" ADD CONSTRAINT "pts_actions_plan_id_pts_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."pts_plans"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pts_actions" ADD CONSTRAINT "pts_actions_responsible_unit_id_service_units_id_fk" FOREIGN KEY ("responsible_unit_id") REFERENCES "public"."service_units"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pts_actions" ADD CONSTRAINT "pts_actions_assigned_professional_id_profiles_id_fk" FOREIGN KEY ("assigned_professional_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pts_cases" ADD CONSTRAINT "pts_cases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pts_cases" ADD CONSTRAINT "pts_cases_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pts_plans" ADD CONSTRAINT "pts_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pts_plans" ADD CONSTRAINT "pts_plans_case_id_pts_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."pts_cases"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pts_plans" ADD CONSTRAINT "pts_plans_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pts_signals" ADD CONSTRAINT "pts_signals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pts_signals" ADD CONSTRAINT "pts_signals_case_id_pts_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."pts_cases"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pts_signals" ADD CONSTRAINT "pts_signals_destination_unit_id_service_units_id_fk" FOREIGN KEY ("destination_unit_id") REFERENCES "public"."service_units"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;