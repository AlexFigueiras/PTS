/**
 * Sentry — browser/client. Carregado pelo Next.js como instrumentation client.
 */
import * as Sentry from '@sentry/nextjs';
import { appEnv } from '@/lib/app-env';

const FALLBACK_DSN =
  'https://c1b135c606feb3d6fcd0a75b29db0796@o4511361258029056.ingest.de.sentry.io/4511361269497936';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? FALLBACK_DSN,
  environment: appEnv,
  enabled: appEnv !== 'local',
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});

// Marca o início de cada navegação client-side para correlação de transações.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
