import * as Sentry from '@sentry/nextjs';
import type { ErrorContext, ErrorLevel, ErrorTracker } from './types';

function applyContext(scope: Sentry.Scope, ctx?: ErrorContext) {
  if (!ctx) return;
  if (ctx.user) {
    scope.setUser({
      id: ctx.user.id,
      email: ctx.user.email ?? undefined,
    });
  }
  if (ctx.tags) {
    for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
  }
  if (ctx.extra) {
    for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v);
  }
}

const sentryLevelMap: Record<ErrorLevel, Sentry.SeverityLevel> = {
  info: 'info',
  warning: 'warning',
  error: 'error',
  fatal: 'fatal',
};

export const sentryTracker: ErrorTracker = {
  capture(err, ctx) {
    Sentry.withScope((scope) => {
      applyContext(scope, ctx);
      Sentry.captureException(err);
    });
  },
  captureMessage(message, level, ctx) {
    Sentry.withScope((scope) => {
      applyContext(scope, ctx);
      Sentry.captureMessage(message, sentryLevelMap[level]);
    });
  },
};
