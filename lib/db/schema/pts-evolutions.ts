import { pgTable, uuid, text, timestamp, jsonb, index, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { patients } from './patients';
import { profiles } from './profiles';
import { serviceUnits, serviceUnitTypeEnum } from './service-units';
import { ptsResponses } from './pts-responses';

/**
 * Evolução Espacial (Radar) — reavaliações periódicas do PTS baseline.
 *
 * Rastreabilidade intersetorial: cada ciclo de evolução registra qual
 * profissional (`professionalId`) e a partir de qual unidade (`unitId` /
 * `unitType`) a nova pontuação multidomínio foi gerada.
 */
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
    // Rastreabilidade: quem e de onde gerou esta evolução
    professionalId: uuid('professional_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    unitId: uuid('unit_id').references(() => serviceUnits.id, { onDelete: 'set null' }),
    unitType: serviceUnitTypeEnum('unit_type'),
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
    index('pts_evolutions_professional_idx').on(t.professionalId),
    index('pts_evolutions_unit_idx').on(t.unitId),
  ],
);

export type PtsEvolution = typeof ptsEvolutions.$inferSelect;
export type NewPtsEvolution = typeof ptsEvolutions.$inferInsert;
