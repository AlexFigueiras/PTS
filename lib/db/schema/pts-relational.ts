import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { patients } from './patients';
import { profiles } from './profiles';
import { serviceUnits } from './service-units';
import type { ActionStatus, SignalStatus, SignalPriority } from '@pts/domain';

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
  status: text('status').$type<'active' | 'closed'>().notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Tabela de Sinalizações Cruzadas (pts_signals):
 * Suporte a alertas e roteamento com prioridades e gate estritos de governança.
 * Tipado estritamente usando os unions de SignalStatus e SignalPriority de @pts/domain.
 */
export const ptsSignals = pgTable('pts_signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  caseId: uuid('case_id')
    .notNull()
    .references(() => ptsCases.id, { onDelete: 'cascade' }),
  sourceRecordId: uuid('source_record_id'),
  destinationComponent: text('destination_component').notNull(),
  destinationUnitId: uuid('destination_unit_id').references(() => serviceUnits.id, { onDelete: 'set null' }),
  priority: text('priority').$type<SignalPriority>().notNull(),
  status: text('status').$type<SignalStatus>().notNull(),
  abstractReason: text('abstract_reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
