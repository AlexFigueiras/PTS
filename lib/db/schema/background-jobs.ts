import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const backgroundJobs = pgTable(
  'background_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    queueName: text('queue_name').notNull(),
    payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),
    status: text('status')
      .notNull()
      .default('queued'), // 'queued' | 'processing' | 'completed' | 'failed' | 'dead_letter'
    retryCount: integer('retry_count').notNull().default(0),
    maxRetries: integer('max_retries').notNull().default(5),
    runAt: timestamp('run_at', { withTimezone: true }).notNull().defaultNow(),
    errorLog: text('error_log'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('background_jobs_tenant_idx').on(t.tenantId),
    index('background_jobs_status_run_at_idx').on(t.status, t.runAt),
    index('background_jobs_queue_idx').on(t.queueName),
  ]
);

export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export type NewBackgroundJob = typeof backgroundJobs.$inferInsert;
