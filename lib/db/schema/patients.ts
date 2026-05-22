import { pgTable, uuid, text, date, timestamp, index, doublePrecision } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

/**
 * Cidadão no território. Núcleo enxuto de identificação — sem dados clínicos.
 * Mantém apenas o necessário para identificar e localizar a pessoa na rede
 * intersetorial (Saúde, Assistência Social, Jurídico, Educação).
 */
export const patients = pgTable(
  'patients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    // Identificação universal
    fullName: text('fullName').notNull(),
    socialName: text('social_name'),
    motherName: text('mother_name'),
    birthDate: date('birthDate'),
    cpf: text('cpf'),
    // Identificadores sociais opcionais
    nis: text('nis'), // NIS / CadÚnico
    cns: text('cns'), // Cartão Nacional de Saúde
    // Contato e território
    gender: text('gender'),
    phone: text('phone'),
    email: text('email'),
    fullAddress: text('full_address'),
    lat: doublePrecision('lat'),
    lon: doublePrecision('lon'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('patients_tenant_idx').on(t.tenantId),
    index('patients_tenant_name_idx').on(t.tenantId, t.fullName),
    index('patients_tenant_cpf_idx').on(t.tenantId, t.cpf),
  ],
);

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
