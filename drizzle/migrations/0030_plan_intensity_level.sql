-- Migration 0030: nivel_intensidade em pts_plans + arquivado em pts_cases (§5.8 do plano)
-- Classificação de risco por horizonte temporal: intensivo → semestral → anual → alta por continuidade.
-- Alta por continuidade = estado terminal; caso arquivado nunca é deletado (trilha preservada).

DO $$ BEGIN
  CREATE TYPE nivel_intensidade AS ENUM (
    'intensivo',
    'manutencao_semestral',
    'manutencao_anual',
    'alta_continuidade'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

--> statement-breakpoint
ALTER TABLE pts_plans
  ADD COLUMN IF NOT EXISTS nivel_intensidade nivel_intensidade NOT NULL DEFAULT 'intensivo';

--> statement-breakpoint
-- Marca o caso como arquivado ao atingir alta_continuidade — nunca deletado.
ALTER TABLE pts_cases
  ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false;

--> statement-breakpoint
-- Índice para a visão de desafogo: filtrar casos intensivos vs. manutenção.
CREATE INDEX IF NOT EXISTS idx_pts_plans_intensidade
  ON pts_plans (tenant_id, nivel_intensidade);

--> statement-breakpoint
-- Índice para excluir casos arquivados das filas de cuidado ativo.
CREATE INDEX IF NOT EXISTS idx_pts_cases_arquivado
  ON pts_cases (tenant_id, arquivado)
  WHERE arquivado = false;
