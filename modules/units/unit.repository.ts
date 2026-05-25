import { and, asc, eq } from 'drizzle-orm';
import { serviceUnits, type ServiceUnit, type NewServiceUnit } from '@/lib/db/schema';
import { BaseTenantRepository } from '@/repositories/base.repository';

export class UnitRepository extends BaseTenantRepository {
  async create(input: Omit<NewServiceUnit, 'tenantId'>): Promise<ServiceUnit> {
    const [row] = await this.db
      .insert(serviceUnits)
      .values({ ...input, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async update(id: string, input: Partial<Omit<NewServiceUnit, 'tenantId' | 'id'>>): Promise<ServiceUnit | undefined> {
    const [row] = await this.db
      .update(serviceUnits)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(serviceUnits.id, id), eq(serviceUnits.tenantId, this.tenantId)))
      .returning();
    return row;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(serviceUnits)
      .where(and(eq(serviceUnits.id, id), eq(serviceUnits.tenantId, this.tenantId)))
      .returning({ id: serviceUnits.id });
    
    return result.length > 0;
  }

  async findById(id: string): Promise<ServiceUnit | undefined> {
    const [row] = await this.db
      .select()
      .from(serviceUnits)
      .where(and(eq(serviceUnits.id, id), eq(serviceUnits.tenantId, this.tenantId)))
      .limit(1);
    return row;
  }

  async list(): Promise<ServiceUnit[]> {
    return this.db
      .select()
      .from(serviceUnits)
      .where(eq(serviceUnits.tenantId, this.tenantId))
      .orderBy(asc(serviceUnits.name));
  }
}
