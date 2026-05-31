-- 0027_cifragem_pii.sql
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "cpf_hash" text;

DROP INDEX IF EXISTS "patients_tenant_cpf_idx";
CREATE INDEX IF NOT EXISTS "patients_tenant_cpf_hash_idx" ON "patients" ("tenant_id", "cpf_hash");
