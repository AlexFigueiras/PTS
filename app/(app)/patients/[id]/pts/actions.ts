'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { getDb } from '@/lib/db/client';
import { ptsResponses, patients, predefinedActions } from '@/lib/db/schema';
import { getClinicalAiSuggestions } from '@/lib/pts/ai-recommender';
import { PtsSchema } from '@/validations/pts-schema';

export type PtsStatus = 'draft' | 'completed';

export async function savePtsDocument(
  patientId: string,
  data: any, // Use any for simplicity in this transition
  status: PtsStatus,
) {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const db = getDb();

  const scores = data.scores || {};
  const suggestedGoals = data.suggestedActions || [];
  
  // Clean up data before saving to 'data' field
  const { scores: _, risks: __, suggestedActions: ___, ...formData } = data;

  const existing = await db
    .select({ id: ptsResponses.id })
    .from(ptsResponses)
    .where(and(eq(ptsResponses.patientId, patientId), eq(ptsResponses.tenantId, ctx.tenantId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(ptsResponses)
      .set({ 
        data: formData, 
        scores,
        suggestedGoals,
        status, 
        updatedAt: new Date() 
      })
      .where(eq(ptsResponses.id, existing[0].id));
  } else {
    await db.insert(ptsResponses).values({
      tenantId: ctx.tenantId,
      patientId,
      status,
      createdBy: ctx.userId,
      data: formData,
      scores,
      suggestedGoals,
    });
  }

  // Sync lat/lon/fullAddress/socialName back to the patients table
  const addr = formData.fullAddress as string | undefined;
  const lat = formData.lat as number | null | undefined;
  const lon = formData.lon as number | null | undefined;
  const socialName = formData.socialName as string | undefined;

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
    .from(ptsResponses)
    .where(and(eq(ptsResponses.patientId, patientId), eq(ptsResponses.tenantId, ctx.tenantId)))
    .limit(1);

  if (!doc) return null;

  // Reconstruct the form data object
  return {
    ...doc,
    data: {
      ...(doc.data as Record<string, unknown>),
      scores: doc.scores,
      suggestedActions: doc.suggestedGoals,
    }
  };
}

export async function generateAiSuggestions(formData: PtsSchema) {
  console.log('[Server Action] generateAiSuggestions triggered');
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    console.error('[Server Action] Unauthorized access attempt to AI suggestions');
    throw new Error('Unauthorized');
  }
  
  try {
    const result = await getClinicalAiSuggestions(formData);
    console.log('[Server Action] AI Suggestions generated successfully');
    return result;
  } catch (error) {
    console.error('[Server Action] AI Suggestion generation failed:', error);
    throw error;
  }
}

export async function getPredefinedActions() {
  const ctx = await getActiveTenantContext();
  if (!ctx) return [];
  
  const db = getDb();
  return await db.select().from(predefinedActions);
}
