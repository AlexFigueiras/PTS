/**
 * Logger estruturado.
 * - Node runtime: pino (com pino-pretty em dev).
 * - Edge runtime / browser: fallback para console com saída JSON.
 *
 * NUNCA logar tokens, senhas, JWTs nem campos PII brutos. Use `redact`
 * (já configurado abaixo) para campos sensíveis comuns.
 *
 * Em código de request server-side, prefira `getRequestLogger()`
 * (lib/request-logger.ts) — ele injeta requestId/userId/tenantId
 * automaticamente para correlação.
 */
import { appEnv } from './app-env';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

type LogFn = (obj: object | string, msg?: string) => void;

export type Logger = {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
  child: (bindings: Record<string, unknown>) => Logger;
};

const isEdge = typeof EdgeRuntime !== 'undefined' || process.env.NEXT_RUNTIME === 'edge';
const isBrowser = typeof window !== 'undefined';
const level = (process.env.LOG_LEVEL as LogLevel) ?? 'info';

function makeConsoleLogger(bindings: Record<string, unknown> = {}): Logger {
  const log = (lvl: LogLevel) => (objOrMsg: object | string, msg?: string) => {
    const base = { level: lvl, time: new Date().toISOString(), ...bindings };
    if (typeof objOrMsg === 'string') {
      console.log(JSON.stringify({ ...base, msg: objOrMsg }));
    } else {
      console.log(JSON.stringify({ ...base, ...objOrMsg, msg }));
    }
  };
  return {
    trace: log('trace'),
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    fatal: log('fatal'),
    child: (extra) => makeConsoleLogger({ ...bindings, ...extra }),
  };
}

let cached: Logger | null = null;

function makePinoLogger(): Logger {
  // Importação dinâmica para evitar bundling em Edge.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pino = require('pino') as (opts: unknown) => Logger;
  const transport =
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
      : undefined;
  const instance = pino({
    level,
    redact: {
      paths: [
        'password',
        '*.password',
        'token',
        '*.token',
        'authorization',
        'cookie',
        'jwt',
        'access_token',
        'refresh_token',
        'apiKey',
        'api_key',
      ],
      censor: '[redacted]',
    },
    transport,
  });
  return instance;
}

const baseBindings = { appEnv };

export function getLogger(bindings?: Record<string, unknown>): Logger {
  const merged = { ...baseBindings, ...bindings };
  if (isEdge || isBrowser) {
    return makeConsoleLogger(merged);
  }
  if (!cached) cached = makePinoLogger().child(baseBindings);
  return bindings ? cached.child(bindings) : cached;
}

export const logger = getLogger();

declare const EdgeRuntime: unknown;
