import { pgTable, uuid, boolean, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';
import { serviceUnits } from './service-units';

/**
 * Tabela de junção (pivot) Profissionais × Unidades.
 *
 * Elimina o vínculo estático de um profissional pertencer a uma única unidade:
 * o mesmo profissional pode atuar em múltiplas unidades intersetoriais
 * (ex.: um psicólogo que atende no CAPS e também no CRAS).
 *
 * `isPrimary` marca a unidade de lotação principal do profissional — usada
 * como origem padrão na rastreabilidade do PTS.
 */
export const professionalsToUnits = pgTable(
  'professionals_to_units',
  {
    professionalId: uuid('professional_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => serviceUnits.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.professionalId, t.unitId] }),
    index('professionals_to_units_unit_idx').on(t.unitId),
  ],
);

export type ProfessionalToUnit = typeof professionalsToUnits.$inferSelect;
export type NewProfessionalToUnit = typeof professionalsToUnits.$inferInsert;
