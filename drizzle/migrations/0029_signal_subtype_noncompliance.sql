-- Migration 0029: signal_subtype column for alerta_descumprimento (§5.7)
-- Adds a signal_subtype column to pts_signals so the motor can mark
-- automatically generated non-compliance alerts without a parallel system.

DO $$ BEGIN
  CREATE TYPE signal_subtype AS ENUM ('alerta_descumprimento', 'busca_ativa_sugerida');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

--> statement-breakpoint
ALTER TABLE pts_signals
  ADD COLUMN IF NOT EXISTS signal_subtype signal_subtype;

--> statement-breakpoint
-- Index to efficiently scan for open non-compliance alerts (cron idempotency)
CREATE INDEX IF NOT EXISTS idx_pts_signals_subtype
  ON pts_signals (tenant_id, signal_subtype)
  WHERE signal_subtype IS NOT NULL;
