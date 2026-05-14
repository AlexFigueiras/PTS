import { pgTable, uuid, text, timestamp, jsonb, index, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { patients } from './patients';
import { ptsResponses } from './pts-responses';

export const ptsEvolutions = pgTable(
  'pts_evolutions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ptsId: uuid('pts_id')
      .notNull()
      .references(() => ptsResponses.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(2),
    data: jsonb('data').notNull().default({}),
    scores: jsonb('scores').notNull().default({}),
    status: text('status').notNull().default('draft'),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('pts_evolutions_pts_idx').on(t.ptsId),
    index('pts_evolutions_patient_idx').on(t.patientId),
  ],
);

export type PtsEvolution = typeof ptsEvolutions.$inferSelect;
export type NewPtsEvolution = typeof ptsEvolutions.$inferInsert;
