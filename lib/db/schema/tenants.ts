import { pgTable, uuid, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    settings: jsonb('settings').$type<{
      ivc_weights?: { alpha: number; beta: number; gamma: number };
    }>().default({ ivc_weights: { alpha: 0.35, beta: 0.35, gamma: 0.30 } }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('tenants_slug_idx').on(t.slug)],
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
