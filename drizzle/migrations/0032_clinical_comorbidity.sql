-- 0032_clinical_comorbidity.sql
-- Bloco 5 - Ajustes menores.
-- Adiciona a necessidade de comorbidade clínica e mapeia para Atenção Básica (UBS/eSF).

INSERT INTO "need_types" ("id", "label", "description") VALUES
  ('comorbidade_clinica', 'Comorbidade Clínica', 'Diabetes, hipertensão, condição orgânica em paciente psíquico')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "component_need_types" ("component_id", "need_type_id") VALUES
  ('atencao_basica', 'comorbidade_clinica')
ON CONFLICT DO NOTHING;
