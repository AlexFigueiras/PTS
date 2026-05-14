import { pgTable, uuid, text, timestamp, jsonb, index, integer, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { patients } from './patients';

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
  },
  (t) => [
    index('pts_responses_tenant_idx').on(t.tenantId),
    index('pts_responses_patient_idx').on(t.patientId),
  ],
);

export type PtsResponse = typeof ptsResponses.$inferSelect;
export type NewPtsResponse = typeof ptsResponses.$inferInsert;
