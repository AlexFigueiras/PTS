/**
 * Next.js instrumentation hook — Sentry server/edge init.
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captura erros de Server Components, Server Actions e Route Handlers.
export { captureRequestError as onRequestError } from '@sentry/nextjs';
