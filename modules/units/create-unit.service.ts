import { withAudit } from '@/lib/audit/with-audit';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { UnitRepository } from './unit.repository';
import { toUnitDto } from './unit.mapper';
import type { CreateUnitInput, UnitDto } from './unit.dto';

const createUnitAudited = withAudit<CreateUnitInput, UnitDto>(
  {
    action: 'create',
    entityType: 'unit',
    entityId: (_, output) => output?.id,
    metadata: (input) => ({ name: input.name, type: input.type }),
  },
  async (ctx: TenantContext, input: CreateUnitInput): Promise<UnitDto> => {
    requireRole(ctx, 'ADMIN');
    const repo = new UnitRepository(ctx);
    const unit = await repo.create(input);
    return toUnitDto(unit);
  },
);

export class CreateUnitService extends BaseService {
  async execute(input: CreateUnitInput): Promise<UnitDto> {
    return createUnitAudited(this.ctx, input);
  }
}
