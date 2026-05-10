import { eq } from 'drizzle-orm';
import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { getDb } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';

type Input = { name: string };

const updateTenantAudited = withAudit<Input, void>(
  { action: 'update', entityType: 'tenant' },
  async (ctx: TenantContext, input: Input) => {
    requireRole(ctx, 'admin');
    await getDb()
      .update(tenants)
      .set({ name: input.name.trim(), updatedAt: new Date() })
      .where(eq(tenants.id, ctx.tenantId));
  },
);

export class UpdateTenantService extends BaseService {
  async execute(input: Input): Promise<void> {
    return updateTenantAudited(this.ctx, input);
  }
}
