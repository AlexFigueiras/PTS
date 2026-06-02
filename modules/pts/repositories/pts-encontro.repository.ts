import { and, eq } from 'drizzle-orm';
import { BaseTenantRepository } from '@/repositories/base.repository';
import type { TenantContext } from '@/lib/tenant-context';
import { encontros, type Encontro, type NewEncontro } from '@/lib/db/schema';

export class PtsEncontroRepository extends BaseTenantRepository {
  private readonly tx?: any;

  constructor(ctx: TenantContext, tx?: any) {
    super(ctx);
    this.tx = tx;
  }

  protected override get db() {
    return this.tx ?? super.db;
  }

  async createEncontro(input: Omit<NewEncontro, 'tenantId'>): Promise<Encontro> {
    const [row] = await this.db
      .insert(encontros)
      .values({
        ...input,
        tenantId: this.tenantId,
      })
      .returning();
    return row;
  }

  async findByPlanId(planId: string): Promise<Encontro[]> {
    return this.db
      .select()
      .from(encontros)
      .where(and(eq(encontros.planoId, planId), eq(encontros.tenantId, this.tenantId)));
  }
}
