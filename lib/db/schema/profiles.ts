import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Espelha auth.users do Supabase. O `id` deve ser igual a auth.users.id.
 * Não armazena credenciais — só dados de perfil.
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
