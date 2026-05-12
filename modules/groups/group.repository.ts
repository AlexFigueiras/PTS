import { getDb } from '@/lib/db/client';
import { groups, groupFacilitators, groupMemberships, profiles, patients } from '@/lib/db/schema';
import { eq, and, isNull, desc, InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Group = InferSelectModel<typeof groups>;
export type NewGroup = InferInsertModel<typeof groups>;

export class GroupRepository {
  constructor(private tenantId: string) {}

  async list() {
    return await getDb()
      .select()
      .from(groups)
      .where(and(eq(groups.tenantId, this.tenantId), isNull(groups.deletedAt)))
      .orderBy(desc(groups.createdAt));
  }

  async getById(id: string) {
    const group = await getDb()
      .select()
      .from(groups)
      .where(and(eq(groups.id, id), eq(groups.tenantId, this.tenantId)))
      .limit(1)
      .then((res) => res[0]);

    if (!group) return null;

    const facilitators = await getDb()
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
      })
      .from(groupFacilitators)
      .innerJoin(profiles, eq(groupFacilitators.profileId, profiles.id))
      .where(eq(groupFacilitators.groupId, id));

    const members = await getDb()
      .select({
        id: patients.id,
        fullName: patients.fullName,
      })
      .from(groupMemberships)
      .innerJoin(patients, eq(groupMemberships.patientId, patients.id))
      .where(and(eq(groupMemberships.groupId, id), isNull(groupMemberships.leftAt)));

    return { ...group, facilitators, members };
  }

  async create(data: NewGroup, facilitatorIds: string[], memberIds: string[]) {
    return await getDb().transaction(async (tx) => {
      const [newGroup] = await tx
        .insert(groups)
        .values({ ...data, tenantId: this.tenantId })
        .returning();

      if (facilitatorIds.length > 0) {
        await tx.insert(groupFacilitators).values(
          facilitatorIds.map((profileId) => ({
            groupId: newGroup.id,
            profileId,
          }))
        );
      }

      if (memberIds.length > 0) {
        await tx.insert(groupMemberships).values(
          memberIds.map((patientId) => ({
            groupId: newGroup.id,
            patientId,
          }))
        );
      }

      return newGroup;
    });
  }

  async update(id: string, data: Partial<NewGroup>, facilitatorIds?: string[], memberIds?: string[]) {
    return await getDb().transaction(async (tx) => {
      await tx
        .update(groups)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(groups.id, id), eq(groups.tenantId, this.tenantId)));

      if (facilitatorIds) {
        await tx.delete(groupFacilitators).where(eq(groupFacilitators.groupId, id));
        if (facilitatorIds.length > 0) {
          await tx.insert(groupFacilitators).values(
            facilitatorIds.map((profileId) => ({
              groupId: id,
              profileId,
            }))
          );
        }
      }

      if (memberIds) {
        // Simple approach: remove all and re-add. 
        // Real-world might need tracking leftAt for history.
        await tx.delete(groupMemberships).where(eq(groupMemberships.groupId, id));
        if (memberIds.length > 0) {
          await tx.insert(groupMemberships).values(
            memberIds.map((patientId) => ({
              groupId: id,
              patientId,
            }))
          );
        }
      }
    });
  }
}
