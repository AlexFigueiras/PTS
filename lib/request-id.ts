import { cache } from 'react';
import { headers } from 'next/headers';

/**
 * Lê o `x-request-id` injetado pelo proxy. Cacheado por request via React.cache —
 * o cache vive APENAS dentro do render desta request (não cruza requests).
 */
export const getRequestId = cache(async (): Promise<string> => {
  const h = await headers();
  return h.get('x-request-id') ?? 'no-request-id';
});
