import { getDb } from '@/lib/db/client';
import { groupSessions, groupAttendance, patients, groupMemberships } from '@/lib/db/schema';
import { eq, and, desc, InferSelectModel, InferInsertModel, isNull } from 'drizzle-orm';

export type GroupSession = InferSelectModel<typeof groupSessions>;
export type NewGroupSession = InferInsertModel<typeof groupSessions>;
export type Attendance = InferSelectModel<typeof groupAttendance>;

export class SessionRepository {
  constructor(private tenantId: string) {}

  async listByGroup(groupId: string) {
    return await getDb()
      .select()
      .from(groupSessions)
      .where(eq(groupSessions.groupId, groupId))
      .orderBy(desc(groupSessions.sessionDate));
  }

  async getById(id: string) {
    const session = await getDb()
      .select()
      .from(groupSessions)
      .where(eq(groupSessions.id, id))
      .limit(1)
      .then((res) => res[0]);

    if (!session) return null;

    const attendance = await getDb()
      .select({
        id: groupAttendance.id,
        patientId: groupAttendance.patientId,
        isPresent: groupAttendance.isPresent,
        participationNotes: groupAttendance.participationNotes,
        outcomes: groupAttendance.outcomes,
        patientName: patients.fullName,
      })
      .from(groupAttendance)
      .innerJoin(patients, eq(groupAttendance.patientId, patients.id))
      .where(eq(groupAttendance.sessionId, id));

    return { ...session, attendance };
  }

  async createWithAttendance(data: NewGroupSession, attendance: { patientId: string; isPresent: boolean; participationNotes?: string; outcomes?: string }[]) {
    return await getDb().transaction(async (tx) => {
      const [newSession] = await tx.insert(groupSessions).values(data).returning();

      if (attendance.length > 0) {
        await tx.insert(groupAttendance).values(
          attendance.map((a) => ({
            sessionId: newSession.id,
            ...a,
          }))
        );
      }

      return newSession;
    });
  }

  /**
   * Prepara uma nova sessão com os membros atuais do grupo para preenchimento da chamada
   */
  async getInitialAttendance(groupId: string) {
    return await getDb()
      .select({
        patientId: patients.id,
        patientName: patients.fullName,
      })
      .from(groupMemberships)
      .innerJoin(patients, eq(groupMemberships.patientId, patients.id))
      .where(and(eq(groupMemberships.groupId, groupId), isNull(groupMemberships.leftAt)));
  }
}
