import { pgTable, uuid, text, date, timestamp, index, doublePrecision } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const patients = pgTable(
  'patients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenantId')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    fullName: text('fullName').notNull(),
    preferredName: text('preferredName'),
    socialName: text('socialName'),
    birthDate: date('birthDate'),
    gender: text('gender'),
    cpf: text('cpf'),
    phone: text('phone'),
    email: text('email'),
    fullAddress: text('fullAddress'),
    lat: doublePrecision('lat'),
    lon: doublePrecision('lon'),
    notes: text('notes'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('patients_tenant_idx').on(t.tenantId),
    index('patients_tenant_name_idx').on(t.tenantId, t.fullName),
  ],
);

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
