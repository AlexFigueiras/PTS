-- ============================================================
-- Pivotagem arquitetural: Prontuário Eletrônico (PEP) →
-- Plataforma de Governança Intersetorial de Planos Terapêuticos
-- Singulares (PTS). Atende de igual para igual Saúde, Assistência
-- Social, Educação e Setor Jurídico/Direitos.
-- ============================================================

-- 1. Expulsão do legado de Prontuário Clínico (PEP) ------------------------
DROP TABLE IF EXISTS "clinical_records" CASCADE;--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN IF EXISTS "preferred_name";--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN IF EXISTS "notes";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."record_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."record_type";--> statement-breakpoint

-- 2. Tipo de unidade intersetorial ----------------------------------------
DO $$ BEGIN
	CREATE TYPE "public"."service_unit_type" AS ENUM('HEALTH', 'SOCIAL', 'LEGAL', 'EDUCATION');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- 3. Unidades intersetoriais (modelo genérico) ----------------------------
CREATE TABLE IF NOT EXISTS "service_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "service_unit_type" NOT NULL,
	"full_address" text,
	"lat" double precision,
	"lon" double precision,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_units" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- 4. Pivot Profissionais × Unidades (M2M) ---------------------------------
CREATE TABLE IF NOT EXISTS "professionals_to_units" (
	"professional_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professionals_to_units_professional_id_unit_id_pk" PRIMARY KEY("professional_id","unit_id")
);
--> statement-breakpoint
ALTER TABLE "professionals_to_units" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- 5. Limpeza da tabela de cidadãos (identificadores sociais) --------------
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "mother_name" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "nis" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "cns" text;--> statement-breakpoint

-- 6. Rastreabilidade intersetorial no PTS ---------------------------------
ALTER TABLE "pts_responses" ADD COLUMN IF NOT EXISTS "professional_id" uuid;--> statement-breakpoint
ALTER TABLE "pts_responses" ADD COLUMN IF NOT EXISTS "unit_id" uuid;--> statement-breakpoint
ALTER TABLE "pts_responses" ADD COLUMN IF NOT EXISTS "unit_type" "service_unit_type";--> statement-breakpoint
ALTER TABLE "pts_evolutions" ADD COLUMN IF NOT EXISTS "professional_id" uuid;--> statement-breakpoint
ALTER TABLE "pts_evolutions" ADD COLUMN IF NOT EXISTS "unit_id" uuid;--> statement-breakpoint
ALTER TABLE "pts_evolutions" ADD COLUMN IF NOT EXISTS "unit_type" "service_unit_type";--> statement-breakpoint

-- 7. Chaves Estrangeiras Robustas -----------------------------------------
DO $$ BEGIN
	ALTER TABLE "service_units" ADD CONSTRAINT "service_units_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "professionals_to_units" ADD CONSTRAINT "professionals_to_units_professional_id_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "professionals_to_units" ADD CONSTRAINT "professionals_to_units_unit_id_service_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."service_units"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "pts_responses" ADD CONSTRAINT "pts_responses_professional_id_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "pts_responses" ADD CONSTRAINT "pts_responses_unit_id_service_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."service_units"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "pts_evolutions" ADD CONSTRAINT "pts_evolutions_professional_id_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "pts_evolutions" ADD CONSTRAINT "pts_evolutions_unit_id_service_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."service_units"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- 8. Índices Robustos -----------------------------------------------------
CREATE INDEX IF NOT EXISTS "service_units_tenant_idx" ON "service_units" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_units_tenant_type_idx" ON "service_units" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "professionals_to_units_unit_idx" ON "professionals_to_units" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_tenant_cpf_idx" ON "patients" USING btree ("tenant_id","cpf");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pts_responses_professional_idx" ON "pts_responses" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pts_responses_unit_idx" ON "pts_responses" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pts_evolutions_professional_idx" ON "pts_evolutions" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pts_evolutions_unit_idx" ON "pts_evolutions" USING btree ("unit_id");
