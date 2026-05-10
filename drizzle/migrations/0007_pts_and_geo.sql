-- Migração segura: adiciona colunas de geolocalização aos pacientes e cria tabela PTS
-- Todas as operações usam IF NOT EXISTS — seguro para re-execução.

ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "social_name" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "full_address" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "lat" double precision;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "lon" double precision;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pts_documents" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "patient_id" uuid NOT NULL,
    "status" text DEFAULT 'draft' NOT NULL,
    "created_by" text,
    "data" jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "pts_documents" ADD CONSTRAINT "pts_documents_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pts_documents" ADD CONSTRAINT "pts_documents_patient_id_patients_id_fk"
    FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pts_documents_tenant_idx" ON "pts_documents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pts_documents_patient_idx" ON "pts_documents" USING btree ("patient_id");
