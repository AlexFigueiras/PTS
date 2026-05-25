import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { UnitRepository } from './unit.repository';

const deleteUnitAudited = withAudit<string, boolean>(
  {
    action: 'delete',
    entityType: 'unit',
    entityId: (id) => id,
    metadata: (id) => ({ unitId: id }),
  },
  async (ctx: TenantContext, id: string): Promise<boolean> => {
    requireRole(ctx, 'ADMIN');
    const repo = new UnitRepository(ctx);
    
    const existing = await repo.findById(id);
    if (!existing) {
      return false;
    }

    return repo.delete(id);
  },
);

export class DeleteUnitService extends BaseService {
  async execute(id: string): Promise<boolean> {
    return deleteUnitAudited(this.ctx, id);
  }
}
