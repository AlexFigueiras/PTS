import { and, eq, desc } from 'drizzle-orm';
import { BaseTenantRepository } from '@/repositories/base.repository';
import type { TenantContext } from '@/lib/tenant-context';
import { ptsReavaliacoes, type PtsReavaliacao } from '@/lib/db/schema';
import type { ReavaliacaoResultado, ReavaliacaoProximaAcao } from '@pts/domain';

export class PtsReavaliacaoRepository extends BaseTenantRepository {
  private readonly tx?: any;

  constructor(ctx: TenantContext, tx?: any) {
    super(ctx);
    this.tx = tx;
  }

  protected override get db() {
    return this.tx ?? super.db;
  }

  async create(input: {
    acaoId: string;
    data: string;
    resultado: ReavaliacaoResultado;
    nota?: string | null;
    proximaAcao: ReavaliacaoProximaAcao;
    createdBy?: string | null;
  }): Promise<PtsReavaliacao> {
    const [row] = await this.db
      .insert(ptsReavaliacoes)
      .values({
        tenantId: this.tenantId,
        acaoId: input.acaoId,
        data: input.data,
        resultado: input.resultado,
        nota: input.nota || null,
        proximaAcao: input.proximaAcao,
        createdBy: input.createdBy || null,
      })
      .returning();
    return row;
  }

  async findByAcaoId(acaoId: string): Promise<PtsReavaliacao[]> {
    return this.db
      .select()
      .from(ptsReavaliacoes)
      .where(and(eq(ptsReavaliacoes.acaoId, acaoId), eq(ptsReavaliacoes.tenantId, this.tenantId)))
      .orderBy(desc(ptsReavaliacoes.data));
  }
}
