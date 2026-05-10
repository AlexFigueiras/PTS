/**
 * Interface de domínio para captura de erros — independente do vendor.
 * Services e helpers consomem ErrorTracker, NUNCA o SDK do Sentry direto.
 */

export type ErrorContext = {
  user?: { id?: string; email?: string | null };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

export type ErrorLevel = 'info' | 'warning' | 'error' | 'fatal';

export interface ErrorTracker {
  capture(err: unknown, context?: ErrorContext): void;
  captureMessage(message: string, level: ErrorLevel, context?: ErrorContext): void;
}
