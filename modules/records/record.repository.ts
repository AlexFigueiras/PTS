import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { clinicalRecords, type ClinicalRecord, type NewClinicalRecord } from '@/lib/db/schema';
import { BaseTenantRepository } from '@/repositories/base.repository';
import { buildFilters } from '@/lib/db/filters';
import {
  getPaginationOffset,
  toPaginatedResult,
  type PaginatedResult,
} from '@/lib/pagination';
import type { RecordFilters } from './record.dto';

type CreateInput = Omit<NewClinicalRecord, 'tenantId'>;
type UpdateInput = Partial<
  Omit<NewClinicalRecord, 'tenantId' | 'id' | 'patientId' | 'professionalId' | 'createdAt'>
>;

export class RecordRepository extends BaseTenantRepository {
  async create(input: CreateInput): Promise<ClinicalRecord> {
    const [row] = await this.db
      .insert(clinicalRecords)
      .values({ ...input, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async update(id: string, input: UpdateInput): Promise<ClinicalRecord | undefined> {
    const [row] = await this.db
      .update(clinicalRecords)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(clinicalRecords.id, id),
          eq(clinicalRecords.tenantId, this.tenantId),
          isNull(clinicalRecords.deletedAt),
        ),
      )
      .returning();
    return row;
  }

  async findById(id: string): Promise<ClinicalRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(clinicalRecords)
      .where(
        and(
          eq(clinicalRecords.id, id),
          eq(clinicalRecords.tenantId, this.tenantId),
          isNull(clinicalRecords.deletedAt),
        ),
      )
      .limit(1);
    return row;
  }

  async listByPatient(filters: RecordFilters): Promise<PaginatedResult<ClinicalRecord>> {
    const where = buildFilters(
      eq(clinicalRecords.tenantId, this.tenantId),
      filters.patientId ? eq(clinicalRecords.patientId, filters.patientId) : undefined,
      isNull(clinicalRecords.deletedAt),
      filters.type ? eq(clinicalRecords.type, filters.type) : undefined,
      filters.status ? eq(clinicalRecords.status, filters.status) : undefined,
    );

    const offset = getPaginationOffset(filters);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(clinicalRecords)
        .where(where)
        .orderBy(desc(clinicalRecords.sessionDate), desc(clinicalRecords.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(clinicalRecords).where(where),
    ]);

    return toPaginatedResult(rows, Number(total), filters);
  }

  async softDelete(id: string): Promise<boolean> {
    const [row] = await this.db
      .update(clinicalRecords)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(clinicalRecords.id, id),
          eq(clinicalRecords.tenantId, this.tenantId),
          isNull(clinicalRecords.deletedAt),
        ),
      )
      .returning({ id: clinicalRecords.id });
    return !!row;
  }
}
