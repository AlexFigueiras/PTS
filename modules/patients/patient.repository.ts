import { and, count, desc, eq, ilike } from 'drizzle-orm';
import { patients, type Patient, type NewPatient } from '@/lib/db/schema';
import { BaseTenantRepository } from '@/repositories/base.repository';
import { buildFilters } from '@/lib/db/filters';
import {
  getPaginationOffset,
  toPaginatedResult,
  type PaginationParams,
  type PaginatedResult,
} from '@/lib/pagination';

type ListFilters = PaginationParams & {
  search?: string;
  status?: string;
};

export class PatientRepository extends BaseTenantRepository {
  async create(input: Omit<NewPatient, 'tenantId'>): Promise<Patient> {
    const [row] = await this.db
      .insert(patients)
      .values({ ...input, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async update(id: string, input: Partial<Omit<NewPatient, 'tenantId' | 'id'>>): Promise<Patient | undefined> {
    const [row] = await this.db
      .update(patients)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(patients.id, id), eq(patients.tenantId, this.tenantId)))
      .returning();
    return row;
  }

  async findById(id: string): Promise<Patient | undefined> {
    const [row] = await this.db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.tenantId, this.tenantId)))
      .limit(1);
    return row;
  }

  async list(filters: ListFilters): Promise<PaginatedResult<Patient>> {
    const where = buildFilters(
      eq(patients.tenantId, this.tenantId),
      filters.search ? ilike(patients.fullName, `%${filters.search}%`) : undefined,
      filters.status ? eq(patients.status, filters.status) : undefined,
    );

    const offset = getPaginationOffset(filters);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(patients)
        .where(where)
        .orderBy(desc(patients.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(patients).where(where),
    ]);

    return toPaginatedResult(rows, Number(total), filters);
  }
}
