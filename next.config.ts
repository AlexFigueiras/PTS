import path from 'node:path';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverComponentsHmrCache: true,
    optimizePackageImports: [
      'recharts',
      'lucide-react',
      'framer-motion',
      'cmdk',
      'sonner',
      'date-fns',
    ],
  },
};

// Sentry só envolve o bundler em produção (com auth token).
// Em dev local, o wrapper adiciona overhead significativo sem benefício.
const isSentryBuildEnabled =
  process.env.NODE_ENV === 'production' && Boolean(process.env.SENTRY_AUTH_TOKEN);

export default isSentryBuildEnabled
  ? withSentryConfig(nextConfig, {
      silent: true,
      widenClientFileUpload: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  : nextConfig;
