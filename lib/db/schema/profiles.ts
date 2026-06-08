import { pgTable, pgEnum, uuid, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Hierarquia de governança (RBAC) — três níveis de permissão.
 *
 * ADMIN        — Administrador Geral (Município/Prefeitura): dono do tenant,
 *                cria unidades intersetoriais e convida Gerentes.
 * MANAGER      — Gerente de Unidade (Coordenador do CAPS / Diretor do CRAS):
 *                gerencia a equipe local e convida Profissionais da sua unidade.
 * PROFESSIONAL — Profissional Técnico (ponta): opera o fluxo de cidadãos e PTS.
 *
 * Hierarquia estrita: ADMIN > MANAGER > PROFESSIONAL.
 */
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'MANAGER', 'PROFESSIONAL']);

/**
 * Estado do perfil no ciclo de convite controlado.
 * PENDING  — pré-cadastrado por um convite, ainda não ativou a conta.
 * ACTIVE   — conta ativada, pode operar a plataforma.
 * INACTIVE — desligado / acesso revogado.
 */
export const profileStatusEnum = pgEnum('profile_status', ['PENDING', 'ACTIVE', 'INACTIVE']);

/**
 * Espelha auth.users do Supabase. O `id` deve ser igual a auth.users.id.
 * Não armazena credenciais — só dados de perfil e governança.
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  // Governança e identificação profissional
  role: userRoleEnum('role').notNull().default('PROFESSIONAL'),
  status: profileStatusEnum('status').notNull().default('ACTIVE'),
  cpf: text('cpf'),
  professionalRegistry: text('professional_registry'), // Registro/Conselho (ex.: CRP 06/12345)
  municipalRegistry: text('municipal_registry'), // Matrícula funcional única do servidor no município — chave de vínculo com sistemas externos de origem
  jobTitle: text('job_title'), // Cargo (ex.: Psicólogo, Assistente Social)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type ProfileStatus = (typeof profileStatusEnum.enumValues)[number];
