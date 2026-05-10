import { z } from 'zod';

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_DIRECT_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Cloudflare R2 — server-only, NUNCA expor ao client
  CLOUDFLARE_R2_ENDPOINT: z.string().url().optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1).optional(),
  // Resend (e-mail transacional) — server-only
  RESEND_API_KEY: z.string().min(1).optional(),
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
