-- 0025_consent_recusa.sql
CREATE TABLE IF NOT EXISTS "patient_consents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "status" text NOT NULL,
  "granted_at" timestamp with time zone NOT NULL DEFAULT now(),
  "revoked_at" timestamp with time zone,
  "document_ref" text,
  "recorded_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "patient_consents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_consents_tenant_select" ON "patient_consents"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

CREATE POLICY "patient_consents_tenant_insert" ON "patient_consents"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

CREATE POLICY "patient_consents_tenant_update" ON "patient_consents"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

CREATE POLICY "patient_consents_tenant_delete" ON "patient_consents"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));

CREATE INDEX IF NOT EXISTS "idx_patient_consents_tenant" ON "patient_consents" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_patient_consents_patient" ON "patient_consents" ("patient_id");
