import path from 'node:path';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
};

export default withSentryConfig(nextConfig, {
  // Suprime logs do plugin durante o build.
  silent: true,

  // Otimização de bundle:
  // - widenClientFileUpload: cobre mais chunks com source maps no Sentry.
  // - disableLogger: remove o logger interno do Sentry do bundle do client.
  widenClientFileUpload: true,
  disableLogger: true,

  // Org/Project/AuthToken vêm de SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN.
  // Sem auth token o build segue (só não sobe source maps).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
