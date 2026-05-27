-- ============================================================
-- Sistema de Governança e Controle de Acesso (RBAC de 3 níveis)
-- Hierarquia: ADMIN > MANAGER > PROFESSIONAL
-- ============================================================

-- 1. Criação resiliente dos Tipos Enum -------------------------------------
DO $$ BEGIN
	CREATE TYPE "public"."profile_status" AS ENUM('PENDING', 'ACTIVE', 'INACTIVE');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
	CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'MANAGER', 'PROFESSIONAL');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- 2. Colunas resilientes para Perfis ---------------------------------------
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "role" "user_role" DEFAULT 'PROFESSIONAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "status" "profile_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "cpf" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "professional_registry" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "job_title" text;--> statement-breakpoint

-- 3. Colunas resilientes para Convites de Tenant ---------------------------
ALTER TABLE "tenant_invites" ADD COLUMN IF NOT EXISTS "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_invites" ADD COLUMN IF NOT EXISTS "unit_id" uuid;--> statement-breakpoint

-- 4. Chaves Estrangeiras Robustas -----------------------------------------
DO $$ BEGIN
	ALTER TABLE "tenant_invites" ADD CONSTRAINT "tenant_invites_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "tenant_invites" ADD CONSTRAINT "tenant_invites_unit_id_service_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."service_units"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- 5. Índices Robustos -----------------------------------------------------
CREATE INDEX IF NOT EXISTS "invites_profile_idx" ON "tenant_invites" USING btree ("profile_id");--> statement-breakpoint

-- 6. Migração de dados legados para ADMIN ----------------------------------
UPDATE "profiles" SET "role" = 'ADMIN'
WHERE "id" IN (
  SELECT "user_id" FROM "tenant_members" WHERE "role" IN ('owner', 'admin')
);--> statement-breakpoint

-- 7. Trigger robusta para novos usuários -----------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_email text;
  v_full_name text;
  v_slug_base text;
  v_slug text;
BEGIN
  v_email := NEW.email;
  v_full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, v_email, v_full_name)
  ON CONFLICT (id) DO NOTHING;

  -- Convite: SendProfessionalInviteService cuida do vínculo e do papel.
  IF NEW.raw_user_meta_data ? 'invite_token' THEN
    RETURN NEW;
  END IF;

  -- Idempotência: se já tem qualquer membership, não cria tenant novo.
  IF EXISTS (SELECT 1 FROM public.tenant_members WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_slug_base := regexp_replace(lower(split_part(v_email, '@', 1)), '[^a-z0-9]+', '-', 'g');
  v_slug := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'tenant_name', ''), v_full_name || ' - Rede Intersetorial'),
    v_slug
  )
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (v_tenant_id, NEW.id, 'owner');

  -- Dono do tenant = Administrador Geral.
  UPDATE public.profiles SET role = 'ADMIN', status = 'ACTIVE' WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END $$;
