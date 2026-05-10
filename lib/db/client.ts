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
  const pg = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    prepare: false,
  });
  return { sql: pg, db: drizzle(pg, { schema }) };
}

let _cache: ReturnType<typeof createClient> | undefined;

function getClient() {
  if (globalThis.__drizzleClient && globalThis.__postgresClient) {
    return { sql: globalThis.__postgresClient, db: globalThis.__drizzleClient };
  }
  if (!_cache) {
    _cache = createClient();
    if (process.env.NODE_ENV !== 'production') {
      globalThis.__drizzleClient = _cache.db;
      globalThis.__postgresClient = _cache.sql;
    }
  }
  return _cache;
}

export function getDb() {
  return getClient().db;
}

export function getSql() {
  return getClient().sql;
}

export type Database = ReturnType<typeof getDb>;
