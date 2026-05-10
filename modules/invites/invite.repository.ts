import { and, eq, gt, isNull } from 'drizzle-orm';
import { tenantInvites, type TenantInvite, type NewTenantInvite } from '@/lib/db/schema';
import { BaseTenantRepository } from '@/repositories/base.repository';

export class InviteRepository extends BaseTenantRepository {
  async create(input: Omit<NewTenantInvite, 'tenantId'>): Promise<TenantInvite> {
    const [row] = await this.db
      .insert(tenantInvites)
      .values({ ...input, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async findByToken(token: string): Promise<TenantInvite | undefined> {
    const [row] = await this.db
      .select()
      .from(tenantInvites)
      .where(eq(tenantInvites.token, token))
      .limit(1);
    return row;
  }

  async listPending(): Promise<TenantInvite[]> {
    return this.db
      .select()
      .from(tenantInvites)
      .where(
        and(
          eq(tenantInvites.tenantId, this.tenantId),
          isNull(tenantInvites.acceptedAt),
          gt(tenantInvites.expiresAt, new Date()),
        ),
      );
  }

  async markAccepted(id: string): Promise<void> {
    await this.db
      .update(tenantInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(tenantInvites.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(tenantInvites)
      .where(and(eq(tenantInvites.id, id), eq(tenantInvites.tenantId, this.tenantId)));
  }
}
