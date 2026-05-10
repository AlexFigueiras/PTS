'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { getDb } from '@/lib/db/client';
import { ptsDocuments, patients } from '@/lib/db/schema';

export type PtsStatus = 'draft' | 'completed';

export async function savePtsDocument(
  patientId: string,
  data: Record<string, unknown>,
  status: PtsStatus,
) {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const db = getDb();

  const existing = await db
    .select({ id: ptsDocuments.id })
    .from(ptsDocuments)
    .where(and(eq(ptsDocuments.patientId, patientId), eq(ptsDocuments.tenantId, ctx.tenantId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(ptsDocuments)
      .set({ data, status, updatedAt: new Date() })
      .where(eq(ptsDocuments.id, existing[0].id));
  } else {
    await db.insert(ptsDocuments).values({
      tenantId: ctx.tenantId,
      patientId,
      status,
      createdBy: ctx.userId,
      data,
    });
  }

  // Sync lat/lon/fullAddress/socialName back to the patients table for the map
  const addr = data.fullAddress as string | undefined;
  const lat = data.lat as number | null | undefined;
  const lon = data.lon as number | null | undefined;
  const socialName = data.socialName as string | undefined;

  if (addr !== undefined || lat !== undefined || socialName !== undefined) {
    await db
      .update(patients)
      .set({
        ...(addr !== undefined && { fullAddress: addr }),
        ...(lat !== undefined && { lat: lat ?? undefined }),
        ...(lon !== undefined && { lon: lon ?? undefined }),
        ...(socialName !== undefined && { socialName }),
        updatedAt: new Date(),
      })
      .where(and(eq(patients.id, patientId), eq(patients.tenantId, ctx.tenantId)));
  }

  revalidatePath(`/patients/${patientId}/pts`);
  revalidatePath('/dashboard');
}

export async function loadPtsDocument(patientId: string) {
  const ctx = await getActiveTenantContext();
  if (!ctx) return null;

  const db = getDb();

  const [doc] = await db
    .select()
    .from(ptsDocuments)
    .where(and(eq(ptsDocuments.patientId, patientId), eq(ptsDocuments.tenantId, ctx.tenantId)))
    .limit(1);

  return doc ?? null;
}
