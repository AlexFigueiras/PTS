-- 0023_signal_engine.sql
-- Fase 2 — Motor de Sinalização Cruzada.
-- Catálogo da rede (RAPS/SUAS/Jurídico/Educação), tipos de necessidade e
-- enriquecimento de `pts_signals` para roteamento, distribuição e resolução.

-- 1. Catálogo de componentes da rede (dados de referência, globais ao sistema)
CREATE TABLE IF NOT EXISTS "network_components" (
  "id" text PRIMARY KEY NOT NULL,         -- slug: 'atencao_basica', 'caps', ...
  "name" text NOT NULL,                    -- nome pt-BR
  "sphere" text NOT NULL,                  -- 'HEALTH' | 'SOCIAL' | 'LEGAL' | 'EDUCATION'
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- 2. Tipos de necessidade (dados de referência, globais ao sistema)
CREATE TABLE IF NOT EXISTS "need_types" (
  "id" text PRIMARY KEY NOT NULL,          -- slug: 'risco_reinternacao', ...
  "label" text NOT NULL,                   -- label pt-BR
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- 3. Join: componente <-> necessidade
CREATE TABLE IF NOT EXISTS "component_need_types" (
  "component_id" text NOT NULL REFERENCES "network_components"("id") ON DELETE cascade,
  "need_type_id" text NOT NULL REFERENCES "need_types"("id") ON DELETE cascade,
  PRIMARY KEY ("component_id", "need_type_id")
);
--> statement-breakpoint

-- 4. Enriquecer service_units com o componente da rede que a unidade representa
ALTER TABLE "service_units"
  ADD COLUMN IF NOT EXISTS "component_id" text REFERENCES "network_components"("id") ON DELETE set null;
--> statement-breakpoint

-- 5. Enriquecer pts_signals (roteamento, autoria, distribuição, validação RT, resolução)
ALTER TABLE "pts_signals"
  ADD COLUMN IF NOT EXISTS "source_unit_id" uuid REFERENCES "service_units"("id") ON DELETE set null,
  ADD COLUMN IF NOT EXISTS "author_id" uuid REFERENCES "profiles"("id") ON DELETE set null,
  ADD COLUMN IF NOT EXISTS "need_type_id" text REFERENCES "need_types"("id") ON DELETE set null,
  ADD COLUMN IF NOT EXISTS "assigned_professional_id" uuid REFERENCES "profiles"("id") ON DELETE set null,
  ADD COLUMN IF NOT EXISTS "rt_validator_id" uuid REFERENCES "profiles"("id") ON DELETE set null,
  ADD COLUMN IF NOT EXISTS "resolution_notes" text,
  ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;
--> statement-breakpoint

-- 6. Indexes
CREATE INDEX IF NOT EXISTS "idx_pts_signals_dest_unit" ON "pts_signals"("destination_unit_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pts_signals_author" ON "pts_signals"("author_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pts_signals_assigned" ON "pts_signals"("assigned_professional_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_service_units_component" ON "service_units"("component_id");
--> statement-breakpoint

-- 7. RLS — dados de referência são legíveis por qualquer utilizador autenticado.
-- Escrita só ocorre via migração/seed (role de migração ignora RLS).
ALTER TABLE "network_components" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "need_types" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "component_need_types" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "network_components_read" ON "network_components";
CREATE POLICY "network_components_read" ON "network_components"
  FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
DROP POLICY IF EXISTS "need_types_read" ON "need_types";
CREATE POLICY "need_types_read" ON "need_types"
  FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
DROP POLICY IF EXISTS "component_need_types_read" ON "component_need_types";
CREATE POLICY "component_need_types_read" ON "component_need_types"
  FOR SELECT TO authenticated USING (true);
--> statement-breakpoint

-- 8. SEED — derivado de packages/domain/src/network-catalog.ts (manter em sincronia)
-- Componentes RAPS (Saúde)
INSERT INTO "network_components" ("id", "name", "sphere", "description") VALUES
  ('atencao_basica', 'Atenção Básica', 'HEALTH', 'UBS, NASF, Consultório na Rua, Centros de Convivência'),
  ('caps', 'Atenção Psicossocial (CAPS)', 'HEALTH', 'CAPS em suas modalidades'),
  ('urgencia_emergencia', 'Urgência e Emergência', 'HEALTH', 'SAMU 192, UPA 24h, Sala de Estabilização'),
  ('residencial_transitorio', 'Atenção Residencial Transitória', 'HEALTH', 'Unidade de Acolhimento, Regime Residencial'),
  ('hospitalar', 'Atenção Hospitalar', 'HEALTH', 'Enfermaria especializada, serviço de referência'),
  ('desinstitucionalizacao', 'Desinstitucionalização', 'HEALTH', 'Residenciais Terapêuticos, Programa de Volta para Casa'),
  ('reabilitacao_psicossocial', 'Reabilitação Psicossocial', 'HEALTH', 'Trabalho/renda, cooperativas sociais')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
-- Componentes SUAS (Social)
INSERT INTO "network_components" ("id", "name", "sphere", "description") VALUES
  ('cras_paif', 'CRAS / PAIF', 'SOCIAL', 'Proteção Social Básica'),
  ('creas_paefi', 'CREAS / PAEFI', 'SOCIAL', 'Proteção Social Especial de Média Complexidade'),
  ('acolhimento_institucional', 'Acolhimento Institucional', 'SOCIAL', 'Alta Complexidade SUAS'),
  ('socioeducativo', 'Serviço Socioeducativo', 'SOCIAL', 'Medidas socioeducativas')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
-- Componentes Jurídico / Educação
INSERT INTO "network_components" ("id", "name", "sphere", "description") VALUES
  ('conselho_tutelar', 'Conselho Tutelar', 'LEGAL', 'Proteção de crianças e adolescentes'),
  ('defensoria', 'Defensoria Pública', 'LEGAL', 'Assistência jurídica gratuita'),
  ('escola', 'Escola / Creche', 'EDUCATION', 'Rede de educação básica'),
  ('naapa', 'NAAPA', 'EDUCATION', 'Núcleo de Apoio e Acompanhamento para Aprendizagem')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
-- Tipos de necessidade
INSERT INTO "need_types" ("id", "label", "description") VALUES
  ('risco_reinternacao', 'Risco de Reinternação', 'Padrão de reinternações frequentes ou fatores de risco'),
  ('situacao_rua', 'Situação de Rua', 'Pessoa em situação de rua ou moradia precária'),
  ('vulnerabilidade_social_familiar', 'Vulnerabilidade Social Familiar', 'Família com indicadores de vulnerabilidade socioeconômica'),
  ('pos_internacao_sem_moradia', 'Pós-internação sem Moradia', 'Alta hospitalar sem residência estável'),
  ('quadro_agudo', 'Quadro Agudo', 'Urgência/emergência clínica ou psiquiátrica'),
  ('abandono_tratamento', 'Abandono de Tratamento', 'Descontinuidade de acompanhamento prescrito'),
  ('violacao_direitos', 'Violação de Direitos', 'Situação de violência, abuso ou negligência'),
  ('medida_protetiva', 'Medida Protetiva', 'Necessidade de proteção jurídica (ECA, idoso, etc)'),
  ('reabilitacao_psicossocial', 'Reabilitação Psicossocial', 'Reinserção social, geração de renda'),
  ('evasao_escolar', 'Evasão Escolar', 'Criança/adolescente fora da escola'),
  ('perda_beneficio', 'Perda de Benefício Social', 'Cancelamento ou suspensão de benefício'),
  ('uso_substancias', 'Uso de Substâncias', 'Necessidade de atenção por uso de álcool/drogas'),
  ('isolamento_social', 'Isolamento Social', 'Pessoa sem rede de apoio ou convivência')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
-- Mapeamento necessidade -> componente
INSERT INTO "component_need_types" ("component_id", "need_type_id") VALUES
  ('caps', 'risco_reinternacao'),
  ('atencao_basica', 'risco_reinternacao'),
  ('atencao_basica', 'situacao_rua'),
  ('cras_paif', 'situacao_rua'),
  ('cras_paif', 'vulnerabilidade_social_familiar'),
  ('creas_paefi', 'vulnerabilidade_social_familiar'),
  ('residencial_transitorio', 'pos_internacao_sem_moradia'),
  ('acolhimento_institucional', 'pos_internacao_sem_moradia'),
  ('urgencia_emergencia', 'quadro_agudo'),
  ('caps', 'quadro_agudo'),
  ('atencao_basica', 'abandono_tratamento'),
  ('caps', 'abandono_tratamento'),
  ('creas_paefi', 'violacao_direitos'),
  ('conselho_tutelar', 'violacao_direitos'),
  ('conselho_tutelar', 'medida_protetiva'),
  ('defensoria', 'medida_protetiva'),
  ('reabilitacao_psicossocial', 'reabilitacao_psicossocial'),
  ('cras_paif', 'reabilitacao_psicossocial'),
  ('escola', 'evasao_escolar'),
  ('naapa', 'evasao_escolar'),
  ('conselho_tutelar', 'evasao_escolar'),
  ('cras_paif', 'perda_beneficio'),
  ('caps', 'uso_substancias'),
  ('atencao_basica', 'uso_substancias'),
  ('cras_paif', 'isolamento_social'),
  ('reabilitacao_psicossocial', 'isolamento_social')
ON CONFLICT DO NOTHING;
