import { and, eq } from 'drizzle-orm';
import { BaseService } from '@/services/base.service';
import { requireRole, ForbiddenError, ROLE_LABELS } from '@/lib/auth/authorization';
import { getDb } from '@/lib/db/client';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  tenants,
  profiles,
  tenantMembers,
  tenantInvites,
  professionalsToUnits,
  serviceUnits,
  type UserRole,
  type TenantRole,
} from '@/lib/db/schema';
import { EmailService } from '@/modules/email/email.service';

const INVITE_TTL_HOURS = 48;
const INVITE_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/** Mapeia o papel de governança para o enum legado de `tenant_members`. */
function toTenantRole(role: UserRole): TenantRole {
  return role === 'PROFESSIONAL' ? 'professional' : 'admin';
}

export type SendProfessionalInviteInput = {
  fullName: string;
  cpf: string;
  email: string;
  professionalRegistry: string;
  jobTitle: string;
  unitId: string;
  role: UserRole;
};

export type SendProfessionalInviteResult =
  | { kind: 'invited'; email: string }
  | { kind: 'linked'; email: string }
  | { kind: 'already-linked'; email: string };

/**
 * Fluxo inverso de convites controlados — a organização "puxa" o profissional.
 *
 * - Profissional novo: pré-cadastra a conta (status PENDING), cria o vínculo
 *   imediato em `professionals_to_units` e gera um token de ativação (48h).
 * - Profissional já existente: apenas adiciona o novo vínculo de unidade
 *   (multi-vínculo) — não duplica conta nem exige nova senha.
 */
export class SendProfessionalInviteService extends BaseService {
  async execute(input: SendProfessionalInviteInput): Promise<SendProfessionalInviteResult> {
    // Apenas Administrador Geral e Gerente de Unidade podem convidar.
    requireRole(this.ctx, 'MANAGER');

    // Um Gerente só cria Profissionais Técnicos; Admin pode criar Gerentes.
    if (this.ctx.role === 'MANAGER' && input.role !== 'PROFESSIONAL') {
      throw new ForbiddenError('Gerentes só podem convidar Profissionais Técnicos.');
    }

    const db = this.ctx.tx || getDb();
    const email = input.email.toLowerCase().trim();

    // A unidade alvo precisa pertencer ao tenant ativo.
    const [unit] = await db
      .select({ id: serviceUnits.id, name: serviceUnits.name })
      .from(serviceUnits)
      .where(and(eq(serviceUnits.id, input.unitId), eq(serviceUnits.tenantId, this.ctx.tenantId)))
      .limit(1);
    if (!unit) throw new Error('Unidade inválida para este tenant.');

    // Um Gerente só convida para unidades onde ele próprio atua.
    if (this.ctx.role === 'MANAGER') {
      const [link] = await db
        .select({ unitId: professionalsToUnits.unitId })
        .from(professionalsToUnits)
        .where(
          and(
            eq(professionalsToUnits.professionalId, this.ctx.userId),
            eq(professionalsToUnits.unitId, input.unitId),
          ),
        )
        .limit(1);
      if (!link) throw new ForbiddenError('Você não gerencia esta unidade.');
    }

    const [existing] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    // ── Multi-vínculo: profissional já cadastrado ──────────────────────────
    if (existing) {
      const [alreadyLinked] = await db
        .select({ unitId: professionalsToUnits.unitId })
        .from(professionalsToUnits)
        .where(
          and(
            eq(professionalsToUnits.professionalId, existing.id),
            eq(professionalsToUnits.unitId, input.unitId),
          ),
        )
        .limit(1);
      if (alreadyLinked) return { kind: 'already-linked', email };

      await db
        .insert(tenantMembers)
        .values({ tenantId: this.ctx.tenantId, userId: existing.id, role: toTenantRole(input.role) })
        .onConflictDoNothing();
      await db
        .insert(professionalsToUnits)
        .values({ professionalId: existing.id, unitId: input.unitId, isPrimary: false })
        .onConflictDoNothing();

      return { kind: 'linked', email };
    }

    // ── Profissional novo: pré-cadastro + token de ativação ────────────────
    const admin = createSupabaseAdminClient();
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
      email_confirm: true,
      user_metadata: { full_name: input.fullName, invite_token: 'pending' },
    });
    if (error || !created.user) {
      throw new Error(error?.message ?? 'Falha ao pré-cadastrar a conta.');
    }
    const userId = created.user.id;

    try {
      // O trigger handle_new_user cria a linha base em profiles; consolidamos
      // os dados de governança via upsert (idempotente).
      await db
        .insert(profiles)
        .values({
          id: userId,
          email,
          fullName: input.fullName,
          role: input.role,
          status: 'PENDING',
          cpf: input.cpf,
          professionalRegistry: input.professionalRegistry,
          jobTitle: input.jobTitle,
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            fullName: input.fullName,
            role: input.role,
            status: 'PENDING',
            cpf: input.cpf,
            professionalRegistry: input.professionalRegistry,
            jobTitle: input.jobTitle,
            updatedAt: new Date(),
          },
        });

      await db
        .insert(tenantMembers)
        .values({ tenantId: this.ctx.tenantId, userId, role: toTenantRole(input.role) })
        .onConflictDoNothing();

      await db
        .insert(professionalsToUnits)
        .values({ professionalId: userId, unitId: input.unitId, isPrimary: true })
        .onConflictDoNothing();

      const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3_600_000);
      const [invite] = await db
        .insert(tenantInvites)
        .values({
          tenantId: this.ctx.tenantId,
          email,
          role: toTenantRole(input.role),
          profileId: userId,
          unitId: input.unitId,
          expiresAt,
          invitedBy: this.ctx.userId,
        })
        .returning({ token: tenantInvites.token });

      const [[tenant], [inviter]] = await Promise.all([
        db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, this.ctx.tenantId)).limit(1),
        db.select({ fullName: profiles.fullName, email: profiles.email }).from(profiles).where(eq(profiles.id, this.ctx.userId)).limit(1),
      ]);

      await new EmailService().sendInviteEmail({
        to: email,
        tenantName: tenant?.name ?? 'Plataforma de PTS',
        inviterName: inviter?.fullName ?? inviter?.email ?? 'Administração',
        role: ROLE_LABELS[input.role],
        inviteUrl: `${INVITE_BASE_URL}/invite/${invite.token}`,
        expiresInDays: 2,
      });

      return { kind: 'invited', email };
    } catch (err) {
      // Compensação: remove a conta órfã se a parte de dados falhar.
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      throw err;
    }
  }
}

export type InviteDetails = {
  token: string;
  tenantId: string;
  unitName: string | null;
  profile: { id: string; fullName: string | null; cpf: string | null; email: string };
};

/**
 * Carrega os dados de um convite válido para a tela de ativação.
 * Retorna null se o token não existe, já foi usado ou expirou.
 */
export async function loadInviteForActivation(token: string): Promise<InviteDetails | null> {
  const db = getDb();
  const [row] = await db
    .select({
      token: tenantInvites.token,
      tenantId: tenantInvites.tenantId,
      acceptedAt: tenantInvites.acceptedAt,
      expiresAt: tenantInvites.expiresAt,
      unitName: serviceUnits.name,
      profileId: profiles.id,
      fullName: profiles.fullName,
      cpf: profiles.cpf,
      email: profiles.email,
    })
    .from(tenantInvites)
    .innerJoin(profiles, eq(tenantInvites.profileId, profiles.id))
    .leftJoin(serviceUnits, eq(tenantInvites.unitId, serviceUnits.id))
    .where(eq(tenantInvites.token, token))
    .limit(1);

  if (!row) return null;
  if (row.acceptedAt) return null;
  if (row.expiresAt < new Date()) return null;

  return {
    token: row.token,
    tenantId: row.tenantId,
    unitName: row.unitName,
    profile: { id: row.profileId, fullName: row.fullName, cpf: row.cpf, email: row.email },
  };
}

export type ActivationResult = { email: string; tenantId: string; unitId: string | null };

/**
 * Ativa a conta pré-cadastrada: define a senha definitiva (Admin API),
 * marca o profile como ACTIVE e consome o token de convite.
 */
export class ActivateAccountService {
  async execute(token: string, password: string): Promise<ActivationResult> {
    const db = getDb();

    const [invite] = await db
      .select()
      .from(tenantInvites)
      .where(eq(tenantInvites.token, token))
      .limit(1);

    if (!invite) throw new Error('Convite não encontrado.');
    if (invite.acceptedAt) throw new Error('Este convite já foi utilizado.');
    if (invite.expiresAt < new Date()) throw new Error('Este convite expirou.');
    if (!invite.profileId) throw new Error('Convite inválido: sem pré-cadastro.');

    const [profile] = await db
      .select({ email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, invite.profileId))
      .limit(1);
    if (!profile) throw new Error('Perfil pré-cadastrado não encontrado.');

    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.updateUserById(invite.profileId, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error('Não foi possível definir a senha. Tente novamente.');

    await db
      .update(profiles)
      .set({ status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(profiles.id, invite.profileId));

    await db
      .update(tenantInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(tenantInvites.id, invite.id));

    return { email: profile.email, tenantId: invite.tenantId, unitId: invite.unitId };
  }
}
