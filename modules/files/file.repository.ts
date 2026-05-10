import { and, desc, eq, isNull } from 'drizzle-orm';
import { files, type FileRecord, type NewFileRecord } from '@/lib/db/schema';
import { BaseTenantRepository } from '@/repositories/base.repository';

export class FileRepository extends BaseTenantRepository {
  async create(input: Omit<NewFileRecord, 'tenantId'>): Promise<FileRecord> {
    const [row] = await this.db
      .insert(files)
      .values({ ...input, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async findById(id: string): Promise<FileRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(files)
      .where(
        and(eq(files.id, id), eq(files.tenantId, this.tenantId), isNull(files.deletedAt)),
      )
      .limit(1);
    return row;
  }

  async listByEntity(entityType: string, entityId: string): Promise<FileRecord[]> {
    return this.db
      .select()
      .from(files)
      .where(
        and(
          eq(files.tenantId, this.tenantId),
          eq(files.entityType, entityType),
          eq(files.entityId, entityId),
          isNull(files.deletedAt),
        ),
      )
      .orderBy(desc(files.createdAt));
  }

  async softDelete(id: string): Promise<FileRecord | undefined> {
    const [row] = await this.db
      .update(files)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(files.id, id), eq(files.tenantId, this.tenantId), isNull(files.deletedAt)),
      )
      .returning();
    return row;
  }
}
