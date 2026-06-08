import { pgTable, pgEnum, uuid, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';

/**
 * Tier de produto do município (tenant).
 * BASICO  — monitoramento + sinalizações/encaminhamentos (caso até `acompanhamento`).
 * PREMIUM — desbloqueia o ciclo PTS/PIA (ativar plano, RT, encontros, metas, reavaliações).
 * Hierarquia: BASICO < PREMIUM. Default seguro (fail-closed): BASICO.
 */
export const planTierEnum = pgEnum('plan_tier', ['BASICO', 'PREMIUM']);

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    settings: jsonb('settings').$type<{
      ivc_weights?: { alpha: number; beta: number; gamma: number };
    }>().default({ ivc_weights: { alpha: 0.35, beta: 0.35, gamma: 0.30 } }).notNull(),
    planTier: planTierEnum('plan_tier').notNull().default('BASICO'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('tenants_slug_idx').on(t.slug)],
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type PlanTier = (typeof planTierEnum.enumValues)[number];
