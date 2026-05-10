import { and, asc, eq } from 'drizzle-orm';
import { tenantMembers, profiles } from '@/lib/db/schema';
import { BaseTenantRepository } from '@/repositories/base.repository';
import type { TenantRole } from '@/lib/db/schema';
import type { MemberDto } from './member.dto';

export class MemberRepository extends BaseTenantRepository {
  async list(): Promise<MemberDto[]> {
    const rows = await this.db
      .select({
        userId: tenantMembers.userId,
        role: tenantMembers.role,
        joinedAt: tenantMembers.createdAt,
        email: profiles.email,
        fullName: profiles.fullName,
      })
      .from(tenantMembers)
      .innerJoin(profiles, eq(tenantMembers.userId, profiles.id))
      .where(eq(tenantMembers.tenantId, this.tenantId))
      .orderBy(asc(tenantMembers.createdAt));

    return rows.map((r) => ({
      userId: r.userId,
      email: r.email,
      fullName: r.fullName,
      role: r.role,
      joinedAt: r.joinedAt.toISOString(),
    }));
  }

  async updateRole(userId: string, role: TenantRole): Promise<boolean> {
    const [row] = await this.db
      .update(tenantMembers)
      .set({ role })
      .where(and(eq(tenantMembers.tenantId, this.tenantId), eq(tenantMembers.userId, userId)))
      .returning({ userId: tenantMembers.userId });
    return !!row;
  }

  async remove(userId: string): Promise<boolean> {
    const [row] = await this.db
      .delete(tenantMembers)
      .where(and(eq(tenantMembers.tenantId, this.tenantId), eq(tenantMembers.userId, userId)))
      .returning({ userId: tenantMembers.userId });
    return !!row;
  }
}
