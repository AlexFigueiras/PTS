import { pgTable, pgEnum, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { patients } from './patients';
import { profiles } from './profiles';
import { serviceUnits } from './service-units';

export const taskStatusEnumDb = pgEnum('task_status', [
  'requested',
  'accepted',
  'in-progress',
  'completed',
  'cancelled',
  'failed',
]);

export const taskIntentEnumDb = pgEnum('task_intent', [
  'proposal',
  'plan',
  'order',
  'original-order',
]);

export const taskPriorityEnumDb = pgEnum('task_priority', [
  'routine',
  'urgent',
  'stat',
  'asap',
]);

export interface TaskHistoryEntry {
  status: 'requested' | 'accepted' | 'in-progress' | 'completed' | 'cancelled' | 'failed';
  changedAt: string; // ISO DateTime
  changedBy: string; // UUID
  notes?: string | null;
}

/**
 * Tabela de Tarefas Intersetoriais (Encaminhamentos / Warm Handoff em Loop Fechado).
 * Segue o padrão e o vocabulário do recurso Task do FHIR v4.
 *
 * Sendo uma entidade de alta concorrência e máquina de estados viva,
 * ela é persistida de forma 100% relacional e isolada do documento principal do PTS,
 * prevenindo race conditions e permitindo indexação robusta nas filas de entrada das unidades.
 */
export const intersectoralTasks = pgTable(
  'intersectoral_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),

    // Metadados FHIR da Task com Enums Físicos
    status: taskStatusEnumDb('status').notNull().default('requested'),
    intent: taskIntentEnumDb('intent').notNull().default('order'),
    priority: taskPriorityEnumDb('priority').notNull().default('routine'),
    description: text('description').notNull(),

    // Vínculos de Rede (Atores e Unidades)
    sourceUnitId: uuid('source_unit_id')
      .notNull()
      .references(() => serviceUnits.id, { onDelete: 'restrict' }),
    targetUnitId: uuid('target_unit_id')
      .notNull()
      .references(() => serviceUnits.id, { onDelete: 'restrict' }),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    ownerId: uuid('owner_id')
      .references(() => profiles.id, { onDelete: 'set null' }),

    // Auditoria e Logs: histórico atômico de transições de status com tipagem estrita
    history: jsonb('history').$type<TaskHistoryEntry[]>().notNull().default([]),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index('intersectoral_tasks_tenant_idx').on(t.tenantId),
    patientIdx: index('intersectoral_tasks_patient_idx').on(t.patientId),
    targetUnitStatusIdx: index('intersectoral_tasks_target_unit_status_idx').on(t.targetUnitId, t.status),
    statusIdx: index('intersectoral_tasks_status_idx').on(t.status),
  })
);

export type IntersectoralTask = typeof intersectoralTasks.$inferSelect;
export type NewIntersectoralTask = typeof intersectoralTasks.$inferInsert;
