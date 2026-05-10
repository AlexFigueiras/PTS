import { pgTable, uuid, timestamp, primaryKey, index, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { profiles } from './profiles';

export const tenantRoleEnum = pgEnum('tenant_role', ['owner', 'admin', 'professional', 'assistant']);

export const tenantMembers = pgTable(
  'tenant_members',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    role: tenantRoleEnum('role').notNull().default('assistant'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.userId] }),
    index('tenant_members_user_idx').on(t.userId),
  ],
);

export type TenantMember = typeof tenantMembers.$inferSelect;
export type NewTenantMember = typeof tenantMembers.$inferInsert;
export type TenantRole = (typeof tenantRoleEnum.enumValues)[number];
