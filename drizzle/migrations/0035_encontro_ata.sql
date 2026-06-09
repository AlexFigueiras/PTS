-- Migration 0035: ata (pauta/decisões) em encontros (Ajuste D — maturidade do PTS)
-- Memória das pactuações intersetoriais: o que foi discutido e decidido em cada
-- reunião de articulação de rede / reunião de PTS. Migração aditiva (creates-only).

ALTER TABLE encontros
  ADD COLUMN IF NOT EXISTS ata text;
