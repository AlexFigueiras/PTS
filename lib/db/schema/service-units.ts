import { pgTable, pgEnum, uuid, text, timestamp, index, doublePrecision } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

/**
 * Tipo de unidade intersetorial. O sistema atende de igual para igual:
 * - HEALTH    → Saúde (CAPS, UBS, ambulatórios)
 * - SOCIAL    → Assistência Social (CRAS, CREAS, Centro POP)
 * - LEGAL     → Setor Jurídico / Direitos (Conselhos Tutelares, Defensoria, MP)
 * - EDUCATION → Educação (Escolas, creches, NAAPA)
 */
export const serviceUnitTypeEnum = pgEnum('service_unit_type', [
  'HEALTH',
  'SOCIAL',
  'LEGAL',
  'EDUCATION',
]);

/**
 * Unidades intersetoriais — modelo genérico que substitui o antigo conceito
 * exclusivo de "unidade de saúde". Toda unidade da rede (CAPS, CRAS, Conselho,
 * Escola) é representada aqui e classificada por `type`.
 */
export const serviceUnits = pgTable(
  'service_units',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: serviceUnitTypeEnum('type').notNull(),
    // Localização — base para o trabalho territorial intersetorial.
    fullAddress: text('full_address'),
    lat: doublePrecision('lat'),
    lon: doublePrecision('lon'),
    phone: text('phone'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('service_units_tenant_idx').on(t.tenantId),
    index('service_units_tenant_type_idx').on(t.tenantId, t.type),
  ],
);

export type ServiceUnit = typeof serviceUnits.$inferSelect;
export type NewServiceUnit = typeof serviceUnits.$inferInsert;
export type ServiceUnitType = (typeof serviceUnitTypeEnum.enumValues)[number];
