import { z } from 'zod';

const emptyToUndefined = z.preprocess((val) => (val === '' ? undefined : val), z.string().min(1).optional());
const emptyToUrlUndefined = z.preprocess((val) => (val === '' ? undefined : val), z.string().url().optional());

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_DIRECT_URL: emptyToUrlUndefined,
  SUPABASE_SERVICE_ROLE_KEY: emptyToUndefined,
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Cloudflare R2 — server-only, NUNCA expor ao client
  CLOUDFLARE_R2_ENDPOINT: emptyToUrlUndefined,
  CLOUDFLARE_R2_ACCESS_KEY_ID: emptyToUndefined,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: emptyToUndefined,
  CLOUDFLARE_R2_BUCKET_NAME: emptyToUndefined,
  // Resend (e-mail transacional) — server-only
  RESEND_API_KEY: emptyToUndefined,
  // AI Keys
  GEMINI_API_KEY: emptyToUndefined,
  // Cifragem de PII
  PTS_PII_ENCRYPTION_KEY: emptyToUndefined,
  // Feature flags — server-only
  RNDS_ENABLED: z.enum(['true', 'false']).optional().default('false').transform(v => v === 'true'),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const isServer = typeof window === 'undefined';

const parsedPublic = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsedPublic.success) {
  console.warn(
    '[env] Public envs ausentes — preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local',
  );
}

let serverEnv: z.infer<typeof serverSchema> | null = null;
if (isServer) {
  const parsedServer = serverSchema.safeParse(process.env);
  if (!parsedServer.success) {
    console.warn(
      '[env] Server envs incompletas — DATABASE_URL é necessária para queries:',
      parsedServer.error.flatten().fieldErrors,
    );
  } else {
    serverEnv = parsedServer.data;
  }
}

export const publicEnv = parsedPublic.success
  ? parsedPublic.data
  : ({} as z.infer<typeof publicSchema>);

export function getServerEnv(): z.infer<typeof serverSchema> {
  if (!isServer) {
    throw new Error('getServerEnv() só pode ser chamado no servidor');
  }
  if (!serverEnv) {
    const parsed = serverSchema.parse(process.env);
    serverEnv = parsed;
  }
  return serverEnv;
}
