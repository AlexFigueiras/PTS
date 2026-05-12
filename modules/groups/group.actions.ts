'use server';

import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { GroupRepository } from './group.repository';
import { SessionRepository } from './session.repository';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createGroupAction(data: any, facilitatorIds: string[], memberIds: string[]) {
  const ctx = await getActiveTenantContext();
  if (!ctx) throw new Error('Unauthorized');

  const repo = new GroupRepository(ctx.tenantId);
  
  await repo.create({
    ...data,
    tenantId: ctx.tenantId,
  }, facilitatorIds, memberIds);

  revalidatePath('/groups');
  redirect('/groups');
}

export async function recordSessionAction(groupId: string, sessionDate: string, attendance: any[]) {
  const ctx = await getActiveTenantContext();
  if (!ctx) throw new Error('Unauthorized');

  const repo = new SessionRepository(ctx.tenantId);
  
  await repo.createWithAttendance({
    groupId,
    sessionDate: new Date(sessionDate),
  }, attendance.map(a => ({
    patientId: a.patientId,
    isPresent: a.isPresent,
    participationNotes: a.participationNotes || null,
    outcomes: a.outcomes || null,
  })));

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}
