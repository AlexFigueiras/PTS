-- Aplica migrations 0002..0007 que nunca foram rodadas no Supabase.
-- Idempotente E defensivo: lida com tabelas pré-existentes com schema incompleto.
-- Usa CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS para cada coluna.
-- Rodar no Supabase SQL Editor.

-- ============================================================
-- 0002 patients
-- ============================================================
CREATE TABLE IF NOT EXISTS "patients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "full_name" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "preferred_name" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "birth_date" date;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "gender" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "cpf" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_tenant_id_tenants_id_fk') THEN
    ALTER TABLE "patients" ADD CONSTRAINT "patients_tenant_id_tenants_id_fk"
      FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "patients_tenant_idx" ON "patients" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "patients_tenant_name_idx" ON "patients" USING btree ("tenant_id","full_name");

-- ============================================================
-- 0003 files
-- ============================================================
CREATE TABLE IF NOT EXISTS "files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "entity_id" uuid;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "storage_key" text;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "original_name" text;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "mime_type" text;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "size" bigint;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "uploaded_by" uuid;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_tenant_id_tenants_id_fk') THEN
    ALTER TABLE "files" ADD CONSTRAINT "files_tenant_id_tenants_id_fk"
      FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_uploaded_by_profiles_id_fk') THEN
    ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_profiles_id_fk"
      FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "files_tenant_idx" ON "files" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "files_entity_idx" ON "files" USING btree ("tenant_id","entity_type","entity_id");
CREATE INDEX IF NOT EXISTS "files_created_idx" ON "files" USING btree ("tenant_id","created_at");

-- ============================================================
-- 0004 rename enum value viewer → assistant
-- ============================================================
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'tenant_role' AND e.enumlabel = 'viewer'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'tenant_role' AND e.enumlabel = 'assistant'
  ) THEN
    ALTER TYPE "public"."tenant_role" RENAME VALUE 'viewer' TO 'assistant';
  END IF;
END $$;

ALTER TABLE "tenant_members" ALTER COLUMN "role" SET DEFAULT 'assistant';

-- ============================================================
-- 0005 clinical_records
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'record_type') THEN
    CREATE TYPE "public"."record_type" AS ENUM('session_note', 'assessment', 'evolution');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'record_status') THEN
    CREATE TYPE "public"."record_status" AS ENUM('draft', 'finalized');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "clinical_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "patient_id" uuid;
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "professional_id" uuid;
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "type" "record_type" DEFAULT 'session_note' NOT NULL;
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "content" text;
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "session_date" date;
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "status" "record_status" DEFAULT 'draft' NOT NULL;
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinical_records_tenant_id_fk') THEN
    ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_tenant_id_fk"
      FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinical_records_patient_id_fk') THEN
    ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_patient_id_fk"
      FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinical_records_professional_id_fk') THEN
    ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_professional_id_fk"
      FOREIGN KEY ("professional_id") REFERENCES "public"."profiles"("id") ON DELETE restrict;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "records_tenant_idx" ON "clinical_records" ("tenant_id");
CREATE INDEX IF NOT EXISTS "records_patient_idx" ON "clinical_records" ("tenant_id", "patient_id");
CREATE INDEX IF NOT EXISTS "records_session_date_idx" ON "clinical_records" ("tenant_id", "patient_id", "session_date" DESC);

-- ============================================================
-- 0006 tenant_invites
-- ============================================================
CREATE TABLE IF NOT EXISTS "tenant_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
ALTER TABLE "tenant_invites" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "tenant_invites" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "tenant_invites" ADD COLUMN IF NOT EXISTS "role" "tenant_role" DEFAULT 'assistant' NOT NULL;
ALTER TABLE "tenant_invites" ADD COLUMN IF NOT EXISTS "token" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "tenant_invites" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
ALTER TABLE "tenant_invites" ADD COLUMN IF NOT EXISTS "accepted_at" timestamp with time zone;
ALTER TABLE "tenant_invites" ADD COLUMN IF NOT EXISTS "invited_by" uuid;
ALTER TABLE "tenant_invites" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_invites_token_key') THEN
    ALTER TABLE "tenant_invites" ADD CONSTRAINT "tenant_invites_token_key" UNIQUE ("token");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_invites_tenant_id_fk') THEN
    ALTER TABLE "tenant_invites" ADD CONSTRAINT "tenant_invites_tenant_id_fk"
      FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_invites_invited_by_fk') THEN
    ALTER TABLE "tenant_invites" ADD CONSTRAINT "tenant_invites_invited_by_fk"
      FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE set null;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "invites_tenant_idx" ON "tenant_invites" ("tenant_id");
CREATE INDEX IF NOT EXISTS "invites_token_idx" ON "tenant_invites" ("token");
CREATE INDEX IF NOT EXISTS "invites_email_tenant_idx" ON "tenant_invites" ("tenant_id", "email");

-- ============================================================
-- 0007 patient geo + pts_documents
-- ============================================================
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "social_name" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "full_address" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "lat" double precision;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "lon" double precision;

CREATE TABLE IF NOT EXISTS "pts_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
ALTER TABLE "pts_documents" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "pts_documents" ADD COLUMN IF NOT EXISTS "patient_id" uuid;
ALTER TABLE "pts_documents" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'draft' NOT NULL;
ALTER TABLE "pts_documents" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "pts_documents" ADD COLUMN IF NOT EXISTS "data" jsonb;
ALTER TABLE "pts_documents" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "pts_documents" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pts_documents_tenant_id_tenants_id_fk') THEN
    ALTER TABLE "pts_documents" ADD CONSTRAINT "pts_documents_tenant_id_tenants_id_fk"
      FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pts_documents_patient_id_patients_id_fk') THEN
    ALTER TABLE "pts_documents" ADD CONSTRAINT "pts_documents_patient_id_patients_id_fk"
      FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "pts_documents_tenant_idx" ON "pts_documents" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "pts_documents_patient_idx" ON "pts_documents" USING btree ("patient_id");
