import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { patients } from './patients';

export const ptsDocuments = pgTable(
  'pts_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('draft'),
    createdBy: text('created_by'),
    data: jsonb('data'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('pts_documents_tenant_idx').on(t.tenantId),
    index('pts_documents_patient_idx').on(t.patientId),
  ],
);

export type PtsDocument = typeof ptsDocuments.$inferSelect;
export type NewPtsDocument = typeof ptsDocuments.$inferInsert;
