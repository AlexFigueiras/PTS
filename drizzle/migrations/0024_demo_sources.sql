-- 0024_demo_sources.sql
-- Fase 3 — Fontes fictícias de ingestão (camada-fonte sensível, isolada).
-- source_health_records e source_social_records: registros brutos fictícios
-- por tenant, ligados a patients.id. Visíveis só à esfera de origem; nunca
-- entram no PTS direto — só alimentam a IA na ingestão.
-- pts_dimensions: dimensões derivadas (read-only), compartilhadas pelo caso.

-- 1. Registros-fonte: Saúde
CREATE TABLE IF NOT EXISTS "source_health_records" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"    uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "patient_id"   uuid NOT NULL REFERENCES "patients"("id") ON DELETE cascade,
  "recorded_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "unit_label"   text NOT NULL,
  "raw_text"     text NOT NULL,
  "structured"   jsonb,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- 2. Registros-fonte: Assistência Social
CREATE TABLE IF NOT EXISTS "source_social_records" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"    uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "patient_id"   uuid NOT NULL REFERENCES "patients"("id") ON DELETE cascade,
  "recorded_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "unit_label"   text NOT NULL,
  "raw_text"     text NOT NULL,
  "structured"   jsonb,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- 3. Dimensões derivadas (pts_dimensions): read-only, compartilhadas pelo caso
CREATE TABLE IF NOT EXISTS "pts_dimensions" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"    uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "case_id"      uuid NOT NULL REFERENCES "pts_cases"("id") ON DELETE cascade,
  "dimension"    text NOT NULL,
  "payload"      jsonb NOT NULL,
  "sensitivity"  text NOT NULL DEFAULT 'normal',
  "source_ref"   jsonb,
  "version_hash" text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- 4. Indexes
CREATE INDEX IF NOT EXISTS "idx_source_health_tenant_patient" ON "source_health_records"("tenant_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_source_social_tenant_patient" ON "source_social_records"("tenant_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pts_dimensions_case" ON "pts_dimensions"("case_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pts_dimensions_case_dim" ON "pts_dimensions"("case_id", "dimension");
--> statement-breakpoint

-- 5. RLS — camada-fonte sensível: tenant-scoped + FORCE RLS
ALTER TABLE "source_health_records" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "source_health_records" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "source_social_records" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "source_social_records" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pts_dimensions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pts_dimensions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS "source_health_tenant" ON "source_health_records";
CREATE POLICY "source_health_tenant" ON "source_health_records"
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
--> statement-breakpoint

DROP POLICY IF EXISTS "source_social_tenant" ON "source_social_records";
CREATE POLICY "source_social_tenant" ON "source_social_records"
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
--> statement-breakpoint

DROP POLICY IF EXISTS "pts_dimensions_tenant" ON "pts_dimensions";
CREATE POLICY "pts_dimensions_tenant" ON "pts_dimensions"
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
