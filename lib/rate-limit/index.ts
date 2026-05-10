/**
 * Rate limiting — interface + implementação Upstash Redis (Edge-safe).
 * Quando UPSTASH_REDIS_REST_URL/TOKEN não estão definidos, usa noop
 * (libera tudo). Não derrube a app por falta de Redis em dev.
 */

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export type RateLimiter = {
  /** Identificador único da chave (ex.: `ip:1.2.3.4`, `user:uuid`). */
  limit: (identifier: string) => Promise<RateLimitResult>;
};

const noopLimiter: RateLimiter = {
  async limit() {
    return { success: true, limit: Infinity, remaining: Infinity, reset: 0 };
  },
};

type LimiterOptions = {
  /** Janela em segundos. */
  windowSec: number;
  /** Tokens disponíveis por janela. */
  tokens: number;
  /** Prefixo da chave no Redis (ex.: 'ratelimit:auth'). */
  prefix: string;
};

let cachedRedis: import('@upstash/redis').Redis | null = null;

async function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (cachedRedis) return cachedRedis;
  const { Redis } = await import('@upstash/redis');
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

export async function createRateLimiter(opts: LimiterOptions): Promise<RateLimiter> {
  const redis = await getRedis();
  if (!redis) return noopLimiter;
  const { Ratelimit } = await import('@upstash/ratelimit');
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(opts.tokens, `${opts.windowSec} s`),
    prefix: opts.prefix,
    analytics: false,
  });
  return {
    async limit(identifier) {
      const r = await rl.limit(identifier);
      return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
    },
  };
}

/** Limites pré-configurados — singletons criados lazy. */
const limiters = new Map<string, Promise<RateLimiter>>();

export function getLimiter(key: 'auth' | 'api' | 'mutation'): Promise<RateLimiter> {
  if (!limiters.has(key)) {
    const opts: Record<typeof key, LimiterOptions> = {
      auth: { windowSec: 60, tokens: 10, prefix: 'rl:auth' },
      api: { windowSec: 60, tokens: 60, prefix: 'rl:api' },
      mutation: { windowSec: 60, tokens: 30, prefix: 'rl:mut' },
    };
    limiters.set(key, createRateLimiter(opts[key]));
  }
  return limiters.get(key)!;
}
