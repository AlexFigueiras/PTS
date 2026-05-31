import { and, eq } from 'drizzle-orm';
import { BaseTenantRepository } from '@/repositories/base.repository';
import type { TenantContext } from '@/lib/tenant-context';
import { ptsCases, type PtsCase } from '@/lib/db/schema';

export class PtsCaseRepository extends BaseTenantRepository {
  private readonly tx?: any;

  constructor(ctx: TenantContext, tx?: any) {
    super(ctx);
    this.tx = tx;
  }

  protected override get db() {
    return this.tx ?? super.db;
  }

  async createCase(patientId: string, status: 'active' | 'closed' = 'active'): Promise<PtsCase> {
    const [row] = await this.db
      .insert(ptsCases)
      .values({
        tenantId: this.tenantId,
        patientId,
        status,
      })
      .returning();
    return row;
  }

  async findById(caseId: string): Promise<PtsCase | undefined> {
    const [row] = await this.db
      .select()
      .from(ptsCases)
      .where(and(eq(ptsCases.id, caseId), eq(ptsCases.tenantId, this.tenantId)))
      .limit(1);
    return row;
  }

  async findActiveByPatientId(patientId: string): Promise<PtsCase | undefined> {
    const [row] = await this.db
      .select()
      .from(ptsCases)
      .where(
        and(
          eq(ptsCases.patientId, patientId),
          eq(ptsCases.tenantId, this.tenantId),
          eq(ptsCases.status, 'active')
        )
      )
      .limit(1);
    return row;
  }
}
