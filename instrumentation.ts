/**
 * Next.js instrumentation hook — Sentry server/edge init.
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 *
 * Em dev local, pula completamente a carga do SDK Sentry para reduzir
 * tempo de compilação e uso de memória. Em staging/produção, registra
 * normalmente.
 */
const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? 'local';
const isLocal = appEnv === 'local';

export async function register() {
  if (isLocal) return;
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captura erros de Server Components, Server Actions e Route Handlers.
// Em local, é no-op — evita carregar o SDK do Sentry no servidor de dev.
export async function onRequestError(...args: unknown[]) {
  if (isLocal) return;
  const { captureRequestError } = await import('@sentry/nextjs');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (captureRequestError as any)(...args);
}
