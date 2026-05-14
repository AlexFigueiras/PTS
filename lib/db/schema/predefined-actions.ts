import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const predefinedActions = pgTable('predefined_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PredefinedAction = typeof predefinedActions.$inferSelect;
export type NewPredefinedAction = typeof predefinedActions.$inferInsert;
