import { and, eq, desc } from 'drizzle-orm';
import { BaseTenantRepository } from '@/repositories/base.repository';
import type { TenantContext } from '@/lib/tenant-context';
import {
  ptsDimensions,
  type PtsDimension,
  type NewPtsDimension,
  type DimensionPayload,
  type DimensionSourceRef,
  type DimensionSensitivity,
} from '@/lib/db/schema';
import type { Dimension } from '@pts/domain';

export type CreateDimensionData = {
  caseId: string;
  dimension: Dimension;
  payload: DimensionPayload;
  sensitivity: DimensionSensitivity;
  sourceRef?: DimensionSourceRef;
  versionHash?: string;
};

export { type PtsDimension, type DimensionPayload, type DimensionSensitivity };

export class PtsDimensionRepository extends BaseTenantRepository {
  private readonly tx?: any;

  constructor(ctx: TenantContext, tx?: any) {
    super(ctx);
    this.tx = tx;
  }

  protected override get db() {
    return this.tx ?? super.db;
  }

  async upsertDimension(data: CreateDimensionData): Promise<PtsDimension> {
    const values: NewPtsDimension = {
      tenantId: this.tenantId,
      caseId: data.caseId,
      dimension: data.dimension,
      payload: data.payload,
      sensitivity: data.sensitivity,
      sourceRef: data.sourceRef,
      versionHash: data.versionHash ?? null,
    };
    // Upsert by (tenantId, caseId, dimension) — última derivação ganha.
    const [row] = await this.db
      .insert(ptsDimensions)
      .values(values)
      .returning();
    return row;
  }

  async findByCaseId(caseId: string): Promise<PtsDimension[]> {
    return this.db
      .select()
      .from(ptsDimensions)
      .where(and(eq(ptsDimensions.caseId, caseId), eq(ptsDimensions.tenantId, this.tenantId)))
      .orderBy(desc(ptsDimensions.createdAt));
  }

  async findLatestByCaseDimension(caseId: string, dimension: Dimension): Promise<PtsDimension | undefined> {
    const [row] = await this.db
      .select()
      .from(ptsDimensions)
      .where(
        and(
          eq(ptsDimensions.caseId, caseId),
          eq(ptsDimensions.dimension, dimension),
          eq(ptsDimensions.tenantId, this.tenantId),
        ),
      )
      .orderBy(desc(ptsDimensions.createdAt))
      .limit(1);
    return row;
  }
}
