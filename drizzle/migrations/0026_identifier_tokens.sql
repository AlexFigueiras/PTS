-- 0026_identifier_tokens.sql
CREATE SEQUENCE IF NOT EXISTS cidadao_token_seq START WITH 1;

CREATE TABLE IF NOT EXISTS "identifier_tokens" (
  "token" text PRIMARY KEY,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "identifier_type" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "identifier_tokens" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "identifier_tokens_tenant_select" ON "identifier_tokens";
CREATE POLICY "identifier_tokens_tenant_select" ON "identifier_tokens"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "identifier_tokens_tenant_insert" ON "identifier_tokens";
CREATE POLICY "identifier_tokens_tenant_insert" ON "identifier_tokens"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "identifier_tokens_tenant_update" ON "identifier_tokens";
CREATE POLICY "identifier_tokens_tenant_update" ON "identifier_tokens"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "identifier_tokens_tenant_delete" ON "identifier_tokens";
CREATE POLICY "identifier_tokens_tenant_delete" ON "identifier_tokens"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));

CREATE INDEX IF NOT EXISTS "idx_identifier_tokens_tenant" ON "identifier_tokens" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_identifier_tokens_patient" ON "identifier_tokens" ("patient_id");
