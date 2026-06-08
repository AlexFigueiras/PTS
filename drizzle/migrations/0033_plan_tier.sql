-- Migration 0033: plan_tier em tenants (gating Básico vs Premium)
-- Básico  = monitoramento + sinalizações/encaminhamentos (caso até `acompanhamento`).
-- Premium = desbloqueia o ciclo PTS/PIA (ativar plano, RT, encontros, metas, reavaliações).
-- A fronteira de enforcement é a ativação do plano (case_status -> pts_ativo/pia_ativo).
-- Migração aditiva (creates-only). Default seguro (fail-closed): BASICO.

DO $$ BEGIN
  CREATE TYPE plan_tier AS ENUM (
    'BASICO',
    'PREMIUM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

--> statement-breakpoint
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan_tier plan_tier NOT NULL DEFAULT 'BASICO';
