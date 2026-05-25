import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { UnitRepository } from './unit.repository';
import { toUnitDto } from './unit.mapper';
import type { UpdateUnitInput, UnitDto } from './unit.dto';

const updateUnitAudited = withAudit<UpdateUnitInput, UnitDto | null>(
  {
    action: 'update',
    entityType: 'unit',
    entityId: (input) => input.id,
    metadata: (input) => ({ name: input.name, type: input.type }),
  },
  async (ctx: TenantContext, input: UpdateUnitInput): Promise<UnitDto | null> => {
    requireRole(ctx, 'ADMIN');
    const repo = new UnitRepository(ctx);
    
    // Verifica se a unidade existe antes de atualizar
    const existing = await repo.findById(input.id);
    if (!existing) {
      return null;
    }

    const { id, ...updateFields } = input;
    const updated = await repo.update(id, updateFields);
    return updated ? toUnitDto(updated) : null;
  },
);

export class UpdateUnitService extends BaseService {
  async execute(input: UpdateUnitInput): Promise<UnitDto | null> {
    return updateUnitAudited(this.ctx, input);
  }
}
