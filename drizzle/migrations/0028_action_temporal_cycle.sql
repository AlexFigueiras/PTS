-- 0028_action_temporal_cycle.sql
-- Bloco 1 — Ciclo de vida temporal da Ação (§5.6 do plano).
-- Adiciona campos temporais obrigatórios a pts_actions e cria pts_reavaliacoes.

-- 1. Enums novos
DO $$ BEGIN
  CREATE TYPE "public"."frequencia_tipo" AS ENUM(
    'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."horizonte_tipo" AS ENUM(
    'curto_prazo', 'medio_prazo', 'longo_prazo'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."aceite_usuario" AS ENUM(
    'aceita', 'recusa', 'repactuar'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."reavaliacao_resultado" AS ENUM(
    'cumpriu', 'cumpriu_parcial', 'nao_cumpriu'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."reavaliacao_proxima_acao" AS ENUM(
    'continuar', 'repactuar', 'encerrar', 'escalar'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

-- 2. Campos temporais em pts_actions (todos nullable para não quebrar linhas existentes;
--    a obrigatoriedade de prazo/frequência/reavaliação é enforced pelo Zod na camada de aplicação
--    ao pactuar — §5.6 do plano).
ALTER TABLE "pts_actions"
  ADD COLUMN IF NOT EXISTS "data_inicio" date,
  ADD COLUMN IF NOT EXISTS "prazo_fim" date,
  ADD COLUMN IF NOT EXISTS "frequencia_tipo" "frequencia_tipo",
  ADD COLUMN IF NOT EXISTS "frequencia_detalhe" text,
  ADD COLUMN IF NOT EXISTS "proximo_retorno" date,
  ADD COLUMN IF NOT EXISTS "data_proxima_reavaliacao" date,
  ADD COLUMN IF NOT EXISTS "horizonte_tipo" "horizonte_tipo",
  ADD COLUMN IF NOT EXISTS "aceite_usuario" "aceite_usuario";
--> statement-breakpoint

-- 3. Tabela de Reavaliações
CREATE TABLE IF NOT EXISTS "pts_reavaliacoes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "acao_id" uuid NOT NULL REFERENCES "pts_actions"("id") ON DELETE cascade,
  "data" date NOT NULL,
  "resultado" "reavaliacao_resultado" NOT NULL,
  "nota" text,
  "proxima_acao" "reavaliacao_proxima_acao" NOT NULL,
  "created_by" uuid REFERENCES "profiles"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "pts_reavaliacoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pts_reavaliacoes" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS "pts_reavaliacoes_tenant_select" ON "pts_reavaliacoes";
CREATE POLICY "pts_reavaliacoes_tenant_select" ON "pts_reavaliacoes"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint

DROP POLICY IF EXISTS "pts_reavaliacoes_tenant_insert" ON "pts_reavaliacoes";
CREATE POLICY "pts_reavaliacoes_tenant_insert" ON "pts_reavaliacoes"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint

DROP POLICY IF EXISTS "pts_reavaliacoes_tenant_update" ON "pts_reavaliacoes";
CREATE POLICY "pts_reavaliacoes_tenant_update" ON "pts_reavaliacoes"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
--> statement-breakpoint

DROP POLICY IF EXISTS "pts_reavaliacoes_tenant_delete" ON "pts_reavaliacoes";
CREATE POLICY "pts_reavaliacoes_tenant_delete" ON "pts_reavaliacoes"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));
--> statement-breakpoint

-- 4. Índices
CREATE INDEX IF NOT EXISTS "idx_pts_reavaliacoes_acao" ON "pts_reavaliacoes"("acao_id");
CREATE INDEX IF NOT EXISTS "idx_pts_reavaliacoes_tenant" ON "pts_reavaliacoes"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_pts_actions_prazo_fim" ON "pts_actions"("prazo_fim");
CREATE INDEX IF NOT EXISTS "idx_pts_actions_reavaliacao" ON "pts_actions"("data_proxima_reavaliacao");
