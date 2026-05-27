import { pgTable, pgEnum, uuid, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { profiles } from './profiles';

export const notificationTypeEnum = pgEnum('notification_type', ['info', 'warning', 'error']);

export const inboxNotifications = pgTable(
  'inbox_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: notificationTypeEnum('type').notNull().default('info'),
    readAt: timestamp('read_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<{
      jobId?: string;
      patientId?: string;
      [key: string]: any;
    }>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('inbox_notifications_user_read_idx').on(t.userId, t.readAt),
    index('inbox_notifications_tenant_idx').on(t.tenantId),
  ]
);

export type InboxNotification = typeof inboxNotifications.$inferSelect;
export type NewInboxNotification = typeof inboxNotifications.$inferInsert;
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
