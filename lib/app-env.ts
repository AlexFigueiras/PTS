/**
 * APP_ENV é a fonte da verdade para distinguir ambientes da aplicação.
 * Independe de NODE_ENV (que segue convenção do Node: development/production/test).
 *
 * Valores:
 *   - "local"     — dev na máquina do desenvolvedor.
 *   - "staging"   — deploy de pré-produção.
 *   - "production" — deploy oficial.
 *
 * Em CI/Vercel/etc., setar APP_ENV no painel do ambiente.
 */
export type AppEnv = 'local' | 'staging' | 'production';

const valid = new Set<AppEnv>(['local', 'staging', 'production']);

export const appEnv: AppEnv = (() => {
  // NEXT_PUBLIC_APP_ENV vence no browser (APP_ENV não é exposto ao client).
  // No server, qualquer um dos dois funciona.
  const v = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV;
  if (v && valid.has(v as AppEnv)) return v as AppEnv;
  return 'local';
})();

export const isLocal = appEnv === 'local';
export const isStaging = appEnv === 'staging';
export const isProduction = appEnv === 'production';
