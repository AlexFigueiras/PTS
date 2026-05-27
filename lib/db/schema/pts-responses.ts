import { pgTable, uuid, text, timestamp, jsonb, index, integer, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { patients } from './patients';
import { profiles } from './profiles';
import { serviceUnits, serviceUnitTypeEnum } from './service-units';

/**
 * PTS Baseline (Multidomínio) — a primeira aplicação do Plano Terapêutico
 * Singular de um cidadão.
 *
 * Rastreabilidade intersetorial: registra explicitamente qual profissional
 * (`professionalId`) gerou a avaliação e a partir de qual unidade (`unitId`)
 * e tipo de unidade (`unitType`).
 */
export const ptsResponses = pgTable(
  'pts_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    // Rastreabilidade: quem e de onde gerou o PTS
    professionalId: uuid('professional_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    unitId: uuid('unit_id').references(() => serviceUnits.id, { onDelete: 'set null' }),
    unitType: serviceUnitTypeEnum('unit_type'),
    status: text('status').notNull().default('draft'),
    version: integer('version').notNull().default(1),
    isLocked: boolean('is_locked').notNull().default(false),
    reviewPeriodDays: integer('review_period_days').default(30),
    nextReviewAt: timestamp('next_review_at', { withTimezone: true }),
    createdBy: text('created_by'),
    data: jsonb('data').notNull().default({}),
    scores: jsonb('scores').notNull().default({}),
    suggestedGoals: jsonb('suggested_goals').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('pts_responses_tenant_idx').on(t.tenantId),
    index('pts_responses_patient_idx').on(t.patientId),
    index('pts_responses_professional_idx').on(t.professionalId),
    index('pts_responses_unit_idx').on(t.unitId),
    uniqueIndex('pts_responses_tenant_patient_unique_idx').on(t.tenantId, t.patientId),
  ],
);

export type PtsResponse = typeof ptsResponses.$inferSelect;
export type NewPtsResponse = typeof ptsResponses.$inferInsert;

