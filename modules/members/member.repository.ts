import { and, asc, eq } from 'drizzle-orm';
import { tenantMembers, profiles } from '@/lib/db/schema';
import { BaseTenantRepository } from '@/repositories/base.repository';
import type { UserRole } from '@/lib/db/schema';
import type { MemberDto } from './member.dto';

export class MemberRepository extends BaseTenantRepository {
  async list(): Promise<MemberDto[]> {
    const rows = await this.db
      .select({
        userId: tenantMembers.userId,
        joinedAt: tenantMembers.createdAt,
        email: profiles.email,
        fullName: profiles.fullName,
        jobTitle: profiles.jobTitle,
        role: profiles.role,
        status: profiles.status,
      })
      .from(tenantMembers)
      .innerJoin(profiles, eq(tenantMembers.userId, profiles.id))
      .where(eq(tenantMembers.tenantId, this.tenantId))
      .orderBy(asc(tenantMembers.createdAt));

    return rows.map((r) => ({
      userId: r.userId,
      email: r.email,
      fullName: r.fullName,
      jobTitle: r.jobTitle,
      role: r.role,
      status: r.status,
      joinedAt: r.joinedAt.toISOString(),
    }));
  }

  /**
   * Atualiza o papel hierárquico global (`profiles.role`).
   * Só permite alterar quem for membro do tenant ativo — barreira anti
   * cross-tenant, já que `profiles` não é tenant-scoped.
   */
  async updateRole(userId: string, role: UserRole): Promise<boolean> {
    const [member] = await this.db
      .select({ userId: tenantMembers.userId })
      .from(tenantMembers)
      .where(and(eq(tenantMembers.tenantId, this.tenantId), eq(tenantMembers.userId, userId)))
      .limit(1);
    if (!member) return false;

    await this.db
      .update(profiles)
      .set({ role, updatedAt: new Date() })
      .where(eq(profiles.id, userId));
    return true;
  }

  async remove(userId: string): Promise<boolean> {
    const [row] = await this.db
      .delete(tenantMembers)
      .where(and(eq(tenantMembers.tenantId, this.tenantId), eq(tenantMembers.userId, userId)))
      .returning({ userId: tenantMembers.userId });
    return !!row;
  }
}
