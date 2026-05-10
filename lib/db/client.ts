import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getServerEnv } from '@/lib/env';
import * as schema from './schema';

declare global {
  var __drizzleClient: ReturnType<typeof drizzle<typeof schema>> | undefined;
  var __postgresClient: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const env = getServerEnv();
  const sql = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    prepare: false,
  });
  return { sql, db: drizzle(sql, { schema }) };
}

const cached = globalThis.__drizzleClient
  ? { sql: globalThis.__postgresClient!, db: globalThis.__drizzleClient }
  : createClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__drizzleClient = cached.db;
  globalThis.__postgresClient = cached.sql;
}

export const db = cached.db;
export const sql = cached.sql;
export type Database = typeof db;
