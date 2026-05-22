import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { profiles } from './profiles';
import { serviceUnits } from './service-units';
import { tenantRoleEnum } from './tenant-members';

/**
 * Convites controlados. No fluxo intersetorial o convite "puxa" o usuário:
 * a organização pré-cadastra o profissional (`profileId`) já vinculado a uma
 * unidade de origem (`unitId`) e gera um token temporário de ativação.
 */
export const tenantInvites = pgTable(
  'tenant_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: tenantRoleEnum('role').notNull().default('assistant'),
    // Pré-cadastro intersetorial
    profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id').references(() => serviceUnits.id, { onDelete: 'set null' }),
    token: uuid('token').notNull().defaultRandom().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    invitedBy: uuid('invited_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('invites_tenant_idx').on(t.tenantId),
    index('invites_token_idx').on(t.token),
    index('invites_email_tenant_idx').on(t.tenantId, t.email),
    index('invites_profile_idx').on(t.profileId),
  ],
);

export type TenantInvite = typeof tenantInvites.$inferSelect;
export type NewTenantInvite = typeof tenantInvites.$inferInsert;
