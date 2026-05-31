import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { patients } from './patients';

export const identifierTokens = pgTable(
  'identifier_tokens',
  {
    token: text('token').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    identifierType: text('identifier_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_identifier_tokens_tenant').on(t.tenantId),
    index('idx_identifier_tokens_patient').on(t.patientId),
  ]
);

export type IdentifierToken = typeof identifierTokens.$inferSelect;
export type NewIdentifierToken = typeof identifierTokens.$inferInsert;
