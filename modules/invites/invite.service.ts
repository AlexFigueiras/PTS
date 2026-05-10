import { and, eq } from 'drizzle-orm';
import { BaseService } from '@/services/base.service';
import { requireRole } from '@/lib/auth/authorization';
import { getDb } from '@/lib/db/client';
import { tenants, profiles, tenantMembers, tenantInvites } from '@/lib/db/schema';
import { EmailService } from '@/modules/email/email.service';
import { ROLE_LABELS } from '@/modules/members/member.dto';
import type { TenantRole } from '@/lib/db/schema';
import { InviteRepository } from './invite.repository';

const INVITE_TTL_DAYS = 7;
const INVITE_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export class CreateInviteService extends BaseService {
  async execute(email: string, role: TenantRole): Promise<void> {
    requireRole(this.ctx, 'admin');

    const db = getDb();
    const normalizedEmail = email.toLowerCase().trim();

    const [existing] = await db
      .select({ userId: tenantMembers.userId })
      .from(tenantMembers)
      .innerJoin(profiles, eq(tenantMembers.userId, profiles.id))
      .where(
        and(eq(tenantMembers.tenantId, this.ctx.tenantId), eq(profiles.email, normalizedEmail)),
      )
      .limit(1);
    if (existing) throw new Error('Este e-mail já é membro da equipe.');

    const [[tenant], [inviter]] = await Promise.all([
      db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, this.ctx.tenantId)).limit(1),
      db.select({ fullName: profiles.fullName, email: profiles.email }).from(profiles).where(eq(profiles.id, this.ctx.userId)).limit(1),
    ]);

    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);
    const invite = await new InviteRepository(this.ctx).create({
      email: normalizedEmail,
      role,
      expiresAt,
      invitedBy: this.ctx.userId,
    });

    await new EmailService().sendInviteEmail({
      to: normalizedEmail,
      tenantName: tenant?.name ?? 'CAPS',
      inviterName: inviter?.fullName ?? inviter?.email ?? 'Administrador',
      role: ROLE_LABELS[role],
      inviteUrl: `${INVITE_BASE_URL}/invite/${invite.token}`,
      expiresInDays: INVITE_TTL_DAYS,
    });
  }
}

export class AcceptInviteService {
  async execute(token: string, userId: string): Promise<string> {
    const db = getDb();

    const [invite] = await db
      .select()
      .from(tenantInvites)
      .where(eq(tenantInvites.token, token))
      .limit(1);

    if (!invite) throw new Error('Convite não encontrado.');
    if (invite.acceptedAt) throw new Error('Convite já utilizado.');
    if (invite.expiresAt < new Date()) throw new Error('Convite expirado.');

    const [alreadyMember] = await db
      .select({ role: tenantMembers.role })
      .from(tenantMembers)
      .where(and(eq(tenantMembers.tenantId, invite.tenantId), eq(tenantMembers.userId, userId)))
      .limit(1);
    if (alreadyMember) throw new Error('Você já é membro desta clínica.');

    await Promise.all([
      db.insert(tenantMembers).values({ tenantId: invite.tenantId, userId, role: invite.role }),
      db.update(tenantInvites).set({ acceptedAt: new Date() }).where(eq(tenantInvites.id, invite.id)),
    ]);

    return invite.tenantId;
  }
}
