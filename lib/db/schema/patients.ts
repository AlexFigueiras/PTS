import { pgTable, uuid, text, date, timestamp, index, doublePrecision } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const patients = pgTable(
  'patients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    fullName: text('fullName').notNull(),
    preferredName: text('preferred_name'),
    socialName: text('social_name'),
    birthDate: date('birthDate'),
    gender: text('gender'),
    cpf: text('cpf'),
    phone: text('phone'),
    email: text('email'),
    fullAddress: text('full_address'),
    lat: doublePrecision('lat'),
    lon: doublePrecision('lon'),
    notes: text('notes'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('patients_tenant_idx').on(t.tenantId),
    index('patients_tenant_name_idx').on(t.tenantId, t.fullName),
  ],
);

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
