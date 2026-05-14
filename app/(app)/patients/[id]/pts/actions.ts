'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { getDb } from '@/lib/db/client';
import { desc } from 'drizzle-orm';
import { ptsResponses, ptsEvolutions, patients, predefinedActions } from '@/lib/db/schema';
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
    const isCompleted = status === 'completed';
    await db
      .update(ptsResponses)
      .set({ 
        data: formData, 
        scores,
        suggestedGoals,
        status, 
        isLocked: isCompleted,
        ...(isCompleted && { 
          nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
        }),
        updatedAt: new Date() 
      })
      .where(eq(ptsResponses.id, existing[0].id));
  } else {
    const isCompleted = status === 'completed';
    await db.insert(ptsResponses).values({
      tenantId: ctx.tenantId,
      patientId,
      status,
      isLocked: isCompleted,
      ...(isCompleted && { 
        nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
      }),
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

export async function createPtsEvolution(
  ptsId: string,
  patientId: string,
  data: any,
  status: PtsStatus,
) {
  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const db = getDb();
  const scores = data.scores || {};
  const { scores: _, risks: __, suggestedActions: ___, ...formData } = data;

  const evolutions = await db
    .select({ version: ptsEvolutions.version })
    .from(ptsEvolutions)
    .where(eq(ptsEvolutions.ptsId, ptsId))
    .orderBy(desc(ptsEvolutions.version))
    .limit(1);
    
  const nextVersion = evolutions.length > 0 ? evolutions[0].version + 1 : 2;

  await db.insert(ptsEvolutions).values({
    ptsId,
    tenantId: ctx.tenantId,
    patientId,
    version: nextVersion,
    status,
    createdBy: ctx.userId,
    data: formData,
    scores,
  });

  if (status === 'completed') {
    await db.update(ptsResponses).set({
      nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }).where(eq(ptsResponses.id, ptsId));
  }

  revalidatePath(`/patients/${patientId}/pts/evolution`);
  revalidatePath(`/patients/${patientId}`);
}

export async function getPtsEvolutions(ptsId: string) {
  const ctx = await getActiveTenantContext();
  if (!ctx) return [];
  const db = getDb();
  
  return await db.select()
    .from(ptsEvolutions)
    .where(and(eq(ptsEvolutions.ptsId, ptsId), eq(ptsEvolutions.tenantId, ctx.tenantId)))
    .orderBy(desc(ptsEvolutions.createdAt));
}
