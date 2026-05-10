import { pgTable, pgEnum, uuid, text, date, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { patients } from './patients';
import { profiles } from './profiles';

export const recordTypeEnum = pgEnum('record_type', ['session_note', 'assessment', 'evolution']);
export const recordStatusEnum = pgEnum('record_status', ['draft', 'finalized']);

export const clinicalRecords = pgTable(
  'clinical_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    professionalId: uuid('professional_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    type: recordTypeEnum('type').notNull().default('session_note'),
    title: text('title'),
    content: text('content').notNull(),
    sessionDate: date('session_date').notNull(),
    status: recordStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('records_tenant_idx').on(t.tenantId),
    index('records_patient_idx').on(t.tenantId, t.patientId),
    index('records_session_date_idx').on(t.tenantId, t.patientId, t.sessionDate),
  ],
);

export type ClinicalRecord = typeof clinicalRecords.$inferSelect;
export type NewClinicalRecord = typeof clinicalRecords.$inferInsert;
