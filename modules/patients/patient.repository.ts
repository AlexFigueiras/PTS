import { and, count, desc, eq, ilike } from 'drizzle-orm';
import { patients, type Patient, type NewPatient } from '@/lib/db/schema';
import { BaseTenantRepository } from '@/repositories/base.repository';
import type { TenantContext } from '@/lib/tenant-context';
import { encrypt, generateHMAC } from '@/lib/crypto/field-cipher';
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
  private readonly tx?: any;

  constructor(ctx: TenantContext, tx?: any) {
    super(ctx);
    this.tx = tx;
  }

  protected override get db() {
    return this.tx ?? super.db;
  }

  async create(input: Omit<NewPatient, 'tenantId'>): Promise<Patient> {
    const cpfEncrypted = encrypt(input.cpf);
    const nisEncrypted = encrypt(input.nis);
    const cnsEncrypted = encrypt(input.cns);
    const cpfHashValue = generateHMAC(input.cpf);

    const [row] = await this.db
      .insert(patients)
      .values({
        ...input,
        cpf: cpfEncrypted,
        nis: nisEncrypted,
        cns: cnsEncrypted,
        cpfHash: cpfHashValue,
        tenantId: this.tenantId,
      })
      .returning();
    return row;
  }

  async update(id: string, input: Partial<Omit<NewPatient, 'tenantId' | 'id'>>): Promise<Patient | undefined> {
    const updates: Partial<NewPatient> = { ...input };

    if (input.cpf !== undefined) {
      updates.cpf = encrypt(input.cpf);
      updates.cpfHash = generateHMAC(input.cpf);
    }
    if (input.nis !== undefined) {
      updates.nis = encrypt(input.nis);
    }
    if (input.cns !== undefined) {
      updates.cns = encrypt(input.cns);
    }

    const [row] = await this.db
      .update(patients)
      .set({ ...updates, updatedAt: new Date() })
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
