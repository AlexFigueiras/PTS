import { cache } from 'react';
import { getLogger, type Logger } from './logger';
import { getRequestId } from './request-id';

/**
 * Logger correlacionado para código server-side dentro de uma request.
 *
 * Garante que TODO log carregue:
 *   - requestId (do header x-request-id, injetado pelo proxy)
 *   - userId    (do usuário Supabase autenticado, se houver)
 *   - tenantId  (do cookie active_tenant_id, validado em tenant_members,
 *                se houver)
 *
 * Cacheado por request via React.cache: dentro do MESMO render, todas as
 * chamadas reaproveitam o mesmo logger e os mesmos lookups. Entre requests
 * NÃO há reuso (não há leak cross-user / cross-tenant).
 *
 * Uso típico:
 *   const log = await getRequestLogger();
 *   log.info({ orderId }, 'pedido criado');
 *
 * Se você não está dentro de uma request server-side (ex.: scripts, jobs),
 * use o `logger` direto de `lib/logger`.
 */
export const getRequestLogger = cache(async (extra?: Record<string, unknown>): Promise<Logger> => {
  const requestId = await getRequestId();

  let userId: string | null = null;
  let tenantId: string | null = null;

  // Imports tardios para evitar carregar Supabase/DB se nem houver request.
  try {
    const { getAuthUser } = await import('./auth/get-user');
    const user = await getAuthUser();
    userId = user?.id ?? null;
  } catch {
    // Sem sessão / sem cookie store — segue sem userId.
  }

  try {
    const { getActiveTenantContext } = await import('./auth/get-tenant-context');
    const ctx = await getActiveTenantContext();
    tenantId = ctx?.tenantId ?? null;
  } catch {
    // Sem tenant ativo — segue sem tenantId.
  }

  return getLogger({ requestId, userId, tenantId, ...extra });
});
