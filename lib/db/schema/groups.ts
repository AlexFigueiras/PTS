import { pgTable, uuid, text, timestamp, boolean, pgEnum, integer } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';
import { patients } from './patients';
import { tenants } from './tenants';

export const dayOfWeekEnum = pgEnum('day_of_week', [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
]);

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  objective: text('objective'),
  targetAudience: text('target_audience'),
  daysOfWeek: dayOfWeekEnum('days_of_week').array(),
  startTime: text('start_time'), // Format "HH:mm"
  durationMinutes: integer('duration_minutes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const groupFacilitators = pgTable('group_facilitators', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id').notNull().references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const groupMemberships = pgTable('group_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  leftAt: timestamp('left_at', { withTimezone: true }),
});

export const groupSessions = pgTable('group_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  sessionDate: timestamp('session_date', { withTimezone: true }).notNull(),
  summary: text('summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const groupAttendance = pgTable('group_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => groupSessions.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  isPresent: boolean('is_present').notNull().default(true),
  participationNotes: text('participation_notes'),
  outcomes: text('outcomes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
