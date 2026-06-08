import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { patients } from './patients';
import { serviceUnits } from './service-units';
import { ptsCases } from './pts-relational';
import type { Dimension } from '@pts/domain';

/**
 * Camada-fonte sensível — Saúde.
 * Registros brutos de prontuário fictício por tenant.
 * Visíveis só à esfera de origem; nunca entram no PTS direto.
 */
export const sourceHealthRecords = pgTable(
  'source_health_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    unitLabel: text('unit_label').notNull(),
    originUnitId: uuid('origin_unit_id').references(() => serviceUnits.id, { onDelete: 'set null' }),
    authorMunicipalRegistry: text('author_municipal_registry'),
    rawText: text('raw_text').notNull(),
    structured: jsonb('structured'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_source_health_tenant_patient').on(t.tenantId, t.patientId)],
);

/**
 * Camada-fonte sensível — Assistência Social.
 * Registros brutos de acompanhamento CRAS/CREAS fictício por tenant.
 */
export const sourceSocialRecords = pgTable(
  'source_social_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    unitLabel: text('unit_label').notNull(),
    originUnitId: uuid('origin_unit_id').references(() => serviceUnits.id, { onDelete: 'set null' }),
    authorMunicipalRegistry: text('author_municipal_registry'),
    rawText: text('raw_text').notNull(),
    structured: jsonb('structured'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_source_social_tenant_patient').on(t.tenantId, t.patientId)],
);

export type DimensionSensitivity = 'normal' | 'restricted' | 'abstracted';

export type DimensionPayload = {
  estado: string;
  fragilidades: string[];
  potencialidades: string[];
  risco: 'baixo' | 'medio' | 'alto' | 'critico';
  observacoes?: string;
};

export type DimensionSourceRef = {
  source: 'health' | 'social' | 'manual';
  recordIds: string[];
  derivedAt: string;
};

/**
 * Dimensões derivadas (pts_dimensions).
 * Payload read-only compartilhado pelo caso; sensibilidade aplicada pelo sistema.
 * Dimensão Psíquico sai SEMPRE como 'abstracted' — regra fixa, não confiada à IA.
 */
export const ptsDimensions = pgTable(
  'pts_dimensions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id')
      .notNull()
      .references(() => ptsCases.id, { onDelete: 'cascade' }),
    dimension: text('dimension').$type<Dimension>().notNull(),
    payload: jsonb('payload').$type<DimensionPayload>().notNull(),
    sensitivity: text('sensitivity').$type<DimensionSensitivity>().notNull().default('normal'),
    sourceRef: jsonb('source_ref').$type<DimensionSourceRef>(),
    versionHash: text('version_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_pts_dimensions_case').on(t.caseId),
    index('idx_pts_dimensions_case_dim').on(t.caseId, t.dimension),
  ],
);

export type SourceHealthRecord = typeof sourceHealthRecords.$inferSelect;
export type NewSourceHealthRecord = typeof sourceHealthRecords.$inferInsert;
export type SourceSocialRecord = typeof sourceSocialRecords.$inferSelect;
export type NewSourceSocialRecord = typeof sourceSocialRecords.$inferInsert;
export type PtsDimension = typeof ptsDimensions.$inferSelect;
export type NewPtsDimension = typeof ptsDimensions.$inferInsert;
