import { pgTable, uuid, text, timestamp, date, boolean, pgEnum, primaryKey, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { patients } from './patients';
import { profiles } from './profiles';
import { serviceUnits } from './service-units';
import type { ActionStatus, SignalStatus, SignalPriority, CaseStatus, FrequenciaTipo, HorizonteTipo, AceiteUsuario, ReavaliacaoResultado, ReavaliacaoProximaAcao, SignalSubtype, NivelIntensidade } from '@pts/domain';

export const caseStatusEnum = pgEnum('case_status', [
  'radar',
  'observacao',
  'acompanhamento',
  'pts_ativo',
  'pia_ativo',
  'alta',
  'evasao',
  'transferencia',
  'obito',
  'recusa',
]);

export const frequenciaTipoEnum = pgEnum('frequencia_tipo', [
  'semanal',
  'quinzenal',
  'mensal',
  'bimestral',
  'trimestral',
  'outro',
]);

export const horizonteTipoEnum = pgEnum('horizonte_tipo', [
  'curto_prazo',
  'medio_prazo',
  'longo_prazo',
]);

export const aceiteUsuarioEnum = pgEnum('aceite_usuario', [
  'aceita',
  'recusa',
  'repactuar',
]);

export const reavaliacaoResultadoEnum = pgEnum('reavaliacao_resultado', [
  'cumpriu',
  'cumpriu_parcial',
  'nao_cumpriu',
]);

export const reavaliacaoProximaAcaoEnum = pgEnum('reavaliacao_proxima_acao', [
  'continuar',
  'repactuar',
  'encerrar',
  'escalar',
]);

export const signalSubtypeEnum = pgEnum('signal_subtype', [
  'alerta_descumprimento',
  'busca_ativa_sugerida',
]);

export const nivelIntensidadeEnum = pgEnum('nivel_intensidade', [
  'intensivo',
  'manutencao_semestral',
  'manutencao_anual',
  'alta_continuidade',
]);

/**
 * Tabela de Casos (pts_cases):
 * Representa um caso ativo de acompanhamento intersetorial do cidadão.
 */
export const ptsCases = pgTable('pts_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  status: caseStatusEnum('status').$type<CaseStatus>().notNull().default('radar'),
  // Estado terminal (§5.8): alta por continuidade → caso arquivado, nunca deletado.
  arquivado: boolean('arquivado').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const participacaoUsuarioEnum = pgEnum('participacao_usuario', [
  'presente',
  'representado_familia',
  'dispensado_por_incapacidade',
]);

export const encontrosTipoEnum = pgEnum('encontros_tipo', [
  'articulacao_rede',
  'reuniao_pts',
]);

/**
 * Tabela de Planos (pts_plans):
 * Representa os Planos Terapêuticos Singulares (PTS) ou Planos Individuais de Atendimento (PIA).
 */
export const ptsPlans = pgTable('pts_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  caseId: uuid('case_id')
    .notNull()
    .references(() => ptsCases.id, { onDelete: 'cascade' }),
  type: text('type').$type<'PTS' | 'PIA'>().notNull(),
  ownerId: uuid('owner_id').references(() => profiles.id, { onDelete: 'restrict' }),
  legalMeasure: text('legal_measure'),
  mandatoryReviewDate: timestamp('mandatory_review_date', { withTimezone: true }),
  // Classificação de risco por horizonte (§5.8): intensivo → semestral → anual → alta.
  nivelIntensidade: nivelIntensidadeEnum('nivel_intensidade')
    .$type<NivelIntensidade>()
    .notNull()
    .default('intensivo'),
  participacaoUsuario: participacaoUsuarioEnum('participacao_usuario')
    .$type<'presente' | 'representado_familia' | 'dispensado_por_incapacidade'>(),
  participacaoJustificativa: text('participacao_justificativa'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Tabela de Ações (pts_actions):
 * Ações pactuadas dentro do plano terapêutico singular ou individual.
 * Tipado estritamente usando o union ActionStatus de @pts/domain.
 */
export const ptsActions = pgTable('pts_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => ptsPlans.id, { onDelete: 'cascade' }),
  responsibleUnitId: uuid('responsible_unit_id')
    .notNull()
    .references(() => serviceUnits.id, { onDelete: 'restrict' }),
  assignedProfessionalId: uuid('assigned_professional_id').references(() => profiles.id, { onDelete: 'set null' }),
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  status: text('status').$type<ActionStatus>().notNull(),
  description: text('description').notNull(),
  evolutionNotes: text('evolution_notes'),
  // Campos do ciclo de vida temporal (§5.6 do plano)
  dataInicio: date('data_inicio'),
  prazofim: date('prazo_fim'),
  frequenciaTipo: frequenciaTipoEnum('frequencia_tipo').$type<FrequenciaTipo>(),
  frequenciaDetalhe: text('frequencia_detalhe'),
  proximoRetorno: date('proximo_retorno'),
  dataProximaReavaliacao: date('data_proxima_reavaliacao'),
  horizonteTipo: horizonteTipoEnum('horizonte_tipo').$type<HorizonteTipo>(),
  aceiteUsuario: aceiteUsuarioEnum('aceite_usuario').$type<AceiteUsuario>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Catálogo de componentes da rede (RAPS/SUAS/Jurídico/Educação).
 * Dados de referência globais — seed derivado de @pts/domain/network-catalog.
 */
export const networkComponents = pgTable('network_components', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sphere: text('sphere').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Tipos de necessidade que um profissional pode sinalizar.
 * Dados de referência globais — seed derivado de @pts/domain/network-catalog.
 */
export const needTypes = pgTable('need_types', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Join necessidade <-> componente da rede.
 */
export const componentNeedTypes = pgTable(
  'component_need_types',
  {
    componentId: text('component_id')
      .notNull()
      .references(() => networkComponents.id, { onDelete: 'cascade' }),
    needTypeId: text('need_type_id')
      .notNull()
      .references(() => needTypes.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.componentId, t.needTypeId] })],
);

/**
 * Tabela de Sinalizações Cruzadas (pts_signals):
 * Suporte a alertas e roteamento com prioridades e gate estritos de governança.
 * Tipado estritamente usando os unions de SignalStatus e SignalPriority de @pts/domain.
 */
export const ptsSignals = pgTable(
  'pts_signals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id')
      .notNull()
      .references(() => ptsCases.id, { onDelete: 'cascade' }),
    sourceRecordId: uuid('source_record_id'),
    sourceUnitId: uuid('source_unit_id').references(() => serviceUnits.id, { onDelete: 'set null' }),
    authorId: uuid('author_id').references(() => profiles.id, { onDelete: 'set null' }),
    needTypeId: text('need_type_id').references(() => needTypes.id, { onDelete: 'set null' }),
    destinationComponent: text('destination_component').notNull(),
    destinationUnitId: uuid('destination_unit_id').references(() => serviceUnits.id, { onDelete: 'set null' }),
    assignedProfessionalId: uuid('assigned_professional_id').references(() => profiles.id, { onDelete: 'set null' }),
    rtValidatorId: uuid('rt_validator_id').references(() => profiles.id, { onDelete: 'set null' }),
    priority: text('priority').$type<SignalPriority>().notNull(),
    status: text('status').$type<SignalStatus>().notNull(),
    signalSubtype: signalSubtypeEnum('signal_subtype').$type<SignalSubtype>(),
    abstractReason: text('abstract_reason').notNull(),
    resolutionNotes: text('resolution_notes'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_pts_signals_dest_unit').on(t.destinationUnitId, t.status),
    index('idx_pts_signals_author').on(t.authorId),
    index('idx_pts_signals_assigned').on(t.assignedProfessionalId),
  ],
);

/**
 * Tabela de Reavaliações (pts_reavaliacoes):
 * Cada Reavaliação está vinculada a uma Ação e registra resultado datado, nota e próxima ação.
 */
export const ptsReavaliacoes = pgTable(
  'pts_reavaliacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    acaoId: uuid('acao_id')
      .notNull()
      .references(() => ptsActions.id, { onDelete: 'cascade' }),
    data: date('data').notNull(),
    resultado: reavaliacaoResultadoEnum('resultado').$type<ReavaliacaoResultado>().notNull(),
    nota: text('nota'),
    proximaAcao: reavaliacaoProximaAcaoEnum('proxima_acao').$type<ReavaliacaoProximaAcao>().notNull(),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_pts_reavaliacoes_acao').on(t.acaoId),
    index('idx_pts_reavaliacoes_tenant').on(t.tenantId),
  ],
);

export type PtsCase = typeof ptsCases.$inferSelect;
export type NewPtsCase = typeof ptsCases.$inferInsert;
export type PtsPlan = typeof ptsPlans.$inferSelect;
export type NewPtsPlan = typeof ptsPlans.$inferInsert;
export type { NivelIntensidade };
export type PtsAction = typeof ptsActions.$inferSelect;
export type NewPtsAction = typeof ptsActions.$inferInsert;
export type PtsSignal = typeof ptsSignals.$inferSelect;
export type NewPtsSignal = typeof ptsSignals.$inferInsert;
export type NetworkComponent = typeof networkComponents.$inferSelect;
export type NewNetworkComponent = typeof networkComponents.$inferInsert;
export type NeedType = typeof needTypes.$inferSelect;
export type NewNeedType = typeof needTypes.$inferInsert;
export type ComponentNeedType = typeof componentNeedTypes.$inferSelect;
export type NewComponentNeedType = typeof componentNeedTypes.$inferInsert;
export type PtsReavaliacao = typeof ptsReavaliacoes.$inferSelect;
export type NewPtsReavaliacao = typeof ptsReavaliacoes.$inferInsert;

export const encontros = pgTable(
  'encontros',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    planoId: uuid('plano_id')
      .notNull()
      .references(() => ptsPlans.id, { onDelete: 'cascade' }),
    tipo: encontrosTipoEnum('tipo').$type<'articulacao_rede' | 'reuniao_pts'>().notNull(),
    data: timestamp('data', { withTimezone: true }).notNull(),
    participantes: uuid('participantes').array().notNull(),
    usuarioPresente: boolean('usuario_presente').notNull().default(false),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_encontros_plano').on(t.planoId),
    index('idx_encontros_tenant').on(t.tenantId),
  ],
);

export type Encontro = typeof encontros.$inferSelect;
export type NewEncontro = typeof encontros.$inferInsert;


