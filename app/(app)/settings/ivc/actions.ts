'use server';

import { revalidatePath } from 'next/cache';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { requireRole } from '@/lib/auth/authorization';
import { getDb } from '@/lib/db/client';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function saveIvcWeightsAction(alpha: number, beta: number, gamma: number) {
  const ctx = await getActiveTenantContext();
  if (!ctx) throw new Error('Unauthorized');
  
  // Apenas Administrador Geral (ADMIN) pode calibrar pesos federativos
  requireRole(ctx, 'ADMIN');

  const db = getDb();
  
  const sum = alpha + beta + gamma;
  // Margem de segurança de ponto flutuante para a soma ser precisamente 1.0 (100%)
  if (Math.abs(sum - 1.0) > 0.001) {
    throw new Error('A soma dos pesos (alpha + beta + gamma) deve ser precisamente 1.00 (100%)');
  }

  await db
    .update(tenants)
    .set({
      settings: {
        ivc_weights: { alpha, beta, gamma }
      },
      updatedAt: new Date()
    })
    .where(eq(tenants.id, ctx.tenantId));

  revalidatePath('/settings/ivc');
}

export async function getIvcWeightsAction() {
  const ctx = await getActiveTenantContext();
  if (!ctx) return { alpha: 0.35, beta: 0.35, gamma: 0.30 };

  const db = getDb();
  const [row] = await db
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId))
    .limit(1);

  const settings = row?.settings as any;
  return settings?.ivc_weights || { alpha: 0.35, beta: 0.35, gamma: 0.30 };
}
