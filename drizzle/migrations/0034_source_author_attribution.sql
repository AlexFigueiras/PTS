-- Migration 0034: vínculo de servidor municipal + atribuição de origem (Ajuste B)
-- `profiles.municipal_registry` = matrícula funcional única do servidor no município,
-- chave de vínculo com o sistema externo onde ele relata (prontuário CAPS, sistema do CRAS...).
-- `source_*_records.author_municipal_registry` carrega a matrícula de quem escreveu o relato;
-- `source_*_records.origin_unit_id` permite roteamento/atribuição mesmo sem unidade ativa (ingestão automatizada).
-- Migração aditiva (creates-only).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS municipal_registry text;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_profiles_municipal_registry
  ON profiles (municipal_registry)
  WHERE municipal_registry IS NOT NULL;

--> statement-breakpoint
ALTER TABLE source_health_records
  ADD COLUMN IF NOT EXISTS origin_unit_id uuid REFERENCES service_units(id) ON DELETE SET NULL;

--> statement-breakpoint
ALTER TABLE source_health_records
  ADD COLUMN IF NOT EXISTS author_municipal_registry text;

--> statement-breakpoint
ALTER TABLE source_social_records
  ADD COLUMN IF NOT EXISTS origin_unit_id uuid REFERENCES service_units(id) ON DELETE SET NULL;

--> statement-breakpoint
ALTER TABLE source_social_records
  ADD COLUMN IF NOT EXISTS author_municipal_registry text;
