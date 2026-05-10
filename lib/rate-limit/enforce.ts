import { getLimiter, type RateLimitResult } from './index';

export class RateLimitError extends Error {
  readonly result: RateLimitResult;
  constructor(result: RateLimitResult) {
    super('Rate limit excedido');
    this.name = 'RateLimitError';
    this.result = result;
  }
}

/**
 * Aplica rate limit no boundary de Server Actions / Route Handlers.
 * Lança `RateLimitError` se excedido.
 *
 * Por que NÃO no proxy?
 *   - Proxy deve ser MÍNIMO (refresh + redirect + validação leve).
 *   - Rate limit envolve chamada externa (Upstash) — fica fora do hot path
 *     de toda navegação.
 *   - Action-level permite limites por contexto (auth/api/mutation) e
 *     identifier mais ricos (userId quando autenticado).
 */
export async function enforceRateLimit(
  bucket: 'auth' | 'api' | 'mutation',
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = await getLimiter(bucket);
  const result = await limiter.limit(identifier);
  if (!result.success) throw new RateLimitError(result);
  return result;
}
