/**
 * Sentry — Node.js runtime.
 * Importado por instrumentation.ts via register() quando NEXT_RUNTIME='nodejs'.
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
  // Em local também desligamos via `enabled`, mas mantemos sample 0 como
  // segurança extra contra leaks acidentais.
  sendDefaultPii: false,
});
