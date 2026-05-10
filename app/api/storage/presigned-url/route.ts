import { NextRequest, NextResponse } from 'next/server';

import { requireAuthUser, UnauthorizedError } from '@/lib/auth/get-user';
import { getTenantContext } from '@/lib/auth/get-tenant-context';
import { enforceRateLimit, RateLimitError } from '@/lib/rate-limit/enforce';
import { getRequestLogger } from '@/lib/request-logger';
import { TenantAccessError } from '@/lib/tenant-context';
import { StorageService, presignedUrlRequestSchema } from '@/modules/storage';

/**
 * POST /api/storage/presigned-url
 *
 * Fluxo:
 *   1. Browser envia { tenantId, filename, mimeType, size, entity }
 *   2. Servidor valida auth, tenant, MIME type e tamanho
 *   3. Servidor gera key multi-tenant e presigned URL (credenciais NUNCA saem do servidor)
 *   4. Browser recebe { uploadUrl, key, publicUrl, expiresAt }
 *   5. Browser faz PUT direto para o R2 — arquivo NÃO passa pelo Next.js
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const log = await getRequestLogger();

  try {
    const user = await requireAuthUser();

    await enforceRateLimit('api', user.id);

    const body: unknown = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Body inválido ou ausente' }, { status: 400 });
    }

    const parsed = presignedUrlRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { tenantId, ...uploadInput } = parsed.data;
    const ctx = await getTenantContext(tenantId);
    const service = new StorageService(ctx);
    const result = await service.requestUpload(uploadInput);

    log.info(
      { key: result.key, entity: uploadInput.entity, mimeType: uploadInput.mimeType },
      'presigned URL gerada com sucesso',
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde antes de tentar novamente.' },
        { status: 429 },
      );
    }
    if (err instanceof TenantAccessError) {
      return NextResponse.json({ error: 'Acesso negado ao tenant' }, { status: 403 });
    }

    log.error({ err }, 'erro ao gerar presigned URL');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
