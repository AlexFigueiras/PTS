/**
 * Error reporting — fachada com chave de ambiente.
 *
 * - local        → console.error (não polui o painel do Sentry).
 * - staging/prod → encaminha ao provedor configurado (Sentry hoje).
 *
 * Use `reportError(err, context)` em qualquer try/catch onde o erro mereça
 * visibilidade. NÃO chame `Sentry.captureException` direto fora deste módulo
 * — isso burla o gate de ambiente e o anti-lock-in.
 */
import { isLocal } from '@/lib/app-env';
import { sentryTracker } from './sentry';
import type { ErrorContext, ErrorLevel, ErrorTracker } from './types';

const noopTracker: ErrorTracker = {
  capture: () => {},
  captureMessage: () => {},
};

const tracker: ErrorTracker = isLocal ? noopTracker : sentryTracker;

export function reportError(err: unknown, context?: ErrorContext): void {
  if (isLocal) {
    console.error('[reportError]', err, context ?? '');
    return;
  }
  tracker.capture(err, context);
}

export function reportMessage(
  message: string,
  level: ErrorLevel = 'info',
  context?: ErrorContext,
): void {
  if (isLocal) {
    const fn = level === 'error' || level === 'fatal' ? console.error : console.log;
    fn(`[reportMessage:${level}]`, message, context ?? '');
    return;
  }
  tracker.captureMessage(message, level, context);
}

export type { ErrorContext, ErrorLevel, ErrorTracker } from './types';
