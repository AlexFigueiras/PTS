// @ts-nocheck — código congelado: sync offline/delta foi removido (SYSTEM.md §8.10/§16).
// Mantido como módulo congelado (não mantido, fora do escopo de tipagem) até remoção definitiva.
import { getDb } from '@/lib/db/client';
import {
  intersectoralTasks,
  ptsEvolutions,
  ptsResponses,
  type IntersectoralTask,
  type PtsEvolution,
  type PtsResponse,
  type TaskHistoryEntry,
} from '@/lib/db/schema';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { PullSyncInput, PushSyncInput, SyncRecord } from '../dtos/sync.dto';
import { getLogger } from '@/lib/logger';

export interface PullSyncResult {
  tasks: IntersectoralTask[];
  evolutions: PtsEvolution[];
  responses: PtsResponse[];
  deleted: string[]; // Lista unificada de UUIDs que foram excluídos (Soft Delete / Tombstone)
  serverTimestamp: string;
}

export interface SyncConflict {
  id: string;
  entityType: 'task' | 'evolution';
  serverUpdatedAt: string;
  clientUpdatedAt: string;
  message: string;
  resolved?: boolean;
}

export interface PushSyncResult {
  success: boolean;
  appliedCount: {
    created: number;
    updated: number;
    deleted: number;
  };
  conflicts: SyncConflict[];
  changes: {
    intersectoral_tasks: {
      created: IntersectoralTask[];
      updated: IntersectoralTask[];
      deleted: string[];
    };
    pts_evolutions: {
      created: PtsEvolution[];
      updated: PtsEvolution[];
      deleted: string[];
    };
  };
  serverTimestamp: string;
}

/**
 * Serviço que gerencia o sincronismo descentralizado offline-first no campo.
 * Opera diretamente sobre tabelas relacionais do Drizzle ORM e PostgreSQL,
 * forçando isolamento estrito de Multi-Tenant a nível de município.
 */
export class SyncService extends BaseService {
  /**
   * Puxa o lote líquido de alterações (Pull API) ocorridas após a data de referência.
   * Aplica Janela de Tolerância de 1 minuto para evitar invisibilidade de transações não-comitadas.
   */
  async pullDelta(input: PullSyncInput): Promise<PullSyncResult> {
    // 1. Governança: Exige perfil mínimo de PROFESSIONAL
    requireRole(this.ctx, 'PROFESSIONAL');

    const lastPulled = input.lastPulledAt ? new Date(input.lastPulledAt) : null;
    const currentServerTime = new Date();

    // Janela de tolerância (Lookback Window): Subtrai 1 minuto para garantir visibilidade de commits tardios
    const adjustedLastPulled = lastPulled ? new Date(lastPulled.getTime() - 60000) : null;

    // 2. Monta as queries filtradas por tenant e opcionalmente por paciente
    const tasksConditions = [eq(intersectoralTasks.tenantId, this.ctx.tenantId)];
    const evolutionsConditions = [eq(ptsEvolutions.tenantId, this.ctx.tenantId)];
    const responsesConditions = [eq(ptsResponses.tenantId, this.ctx.tenantId)];

    if (input.patientId) {
      tasksConditions.push(eq(intersectoralTasks.patientId, input.patientId));
      evolutionsConditions.push(eq(ptsEvolutions.patientId, input.patientId));
      responsesConditions.push(eq(ptsResponses.patientId, input.patientId));
    }

    if (adjustedLastPulled) {
      // Para pulls incrementais, buscamos qualquer alteração posterior à data ajustada (incluindo deletados)
      tasksConditions.push(gt(intersectoralTasks.updatedAt, adjustedLastPulled));
      evolutionsConditions.push(gt(ptsEvolutions.updatedAt, adjustedLastPulled));
      responsesConditions.push(gt(ptsResponses.updatedAt, adjustedLastPulled));
    } else {
      // Para a carga inicial completa, buscamos apenas registros ativos (deletedAt nulo)
      tasksConditions.push(isNull(intersectoralTasks.deletedAt));
      evolutionsConditions.push(isNull(ptsEvolutions.deletedAt));
      responsesConditions.push(isNull(ptsResponses.deletedAt));
    }

    // 3. Executa buscas em paralelo
    const [rawTasks, rawEvolutions, rawResponses] = await Promise.all([
      getDb().select().from(intersectoralTasks).where(and(...tasksConditions)),
      getDb().select().from(ptsEvolutions).where(and(...evolutionsConditions)),
      getDb().select().from(ptsResponses).where(and(...responsesConditions)),
    ]);

    const deletedIdsSet = new Set<string>();
    const tasks: IntersectoralTask[] = [];
    const evolutions: PtsEvolution[] = [];
    const responses: PtsResponse[] = [];

    // Particiona os registros de tarefas (ativos vs excluídos)
    for (const t of rawTasks) {
      if (t.deletedAt) {
        deletedIdsSet.add(t.id);
      } else {
        tasks.push(t);
      }
    }

    // Particiona as evoluções (ativos vs excluídos)
    for (const e of rawEvolutions) {
      if (e.deletedAt) {
        deletedIdsSet.add(e.id);
      } else {
        evolutions.push(e);
      }
    }

    // Particiona as respostas (ativos vs excluídos)
    for (const r of rawResponses) {
      if (r.deletedAt) {
        deletedIdsSet.add(r.id);
      } else {
        responses.push(r);
      }
    }

    return {
      tasks,
      evolutions,
      responses,
      deleted: Array.from(deletedIdsSet),
      serverTimestamp: currentServerTime.toISOString(),
    };
  }

  /**
   * Processa em lote de forma extremamente atômica (Push API) as mutações geradas offline.
   * Realiza a detecção de conflitos por concorrência baseada em timestamp, salvaguarda chaves
   * estrangeiras de tarefas soft-deletadas e executa uma fusão lógica em memória (Merge Payload).
   * Retorna os dados compatíveis com o protocolo nativo de sincronização do WatermelonDB.
   */
  async pushDelta(input: PushSyncInput): Promise<PushSyncResult> {
    // 1. Governança: Exige perfil mínimo de PROFESSIONAL
    requireRole(this.ctx, 'PROFESSIONAL');

    const conflicts: SyncConflict[] = [];
    const mergedTasks: IntersectoralTask[] = [];
    const mergedEvolutions: PtsEvolution[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    const lastPulled = input.lastPulledAt ? new Date(input.lastPulledAt) : null;

    // 2. Executa todas as criações, atualizações (com mesclagem) e deleções em uma única transação atômica
    await getDb().transaction(async (tx) => {
      // A) Processar Criações Offline com Upsert e Salvaguarda Relacional
      for (const record of input.created) {
        try {
          if (record.entityType === 'task') {
            await tx
              .insert(intersectoralTasks)
              .values({
                id: record.id,
                tenantId: this.ctx.tenantId,
                patientId: record.patientId,
                status: record.status || 'requested',
                intent: record.intent || 'order',
                priority: record.priority || 'routine',
                description: record.description || '',
                sourceUnitId: record.sourceUnitId || this.ctx.activeUnitId,
                targetUnitId: record.targetUnitId,
                requesterId: record.requesterId || this.ctx.userId,
                ownerId: record.ownerId || null,
                history: record.history || [],
                createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
                updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
                deletedAt: null, // Assegura que o registro está ativo
              })
              .onConflictDoUpdate({
                target: intersectoralTasks.id,
                set: {
                  status: record.status || 'requested',
                  intent: record.intent || 'order',
                  priority: record.priority || 'routine',
                  description: record.description || '',
                  sourceUnitId: record.sourceUnitId || this.ctx.activeUnitId,
                  targetUnitId: record.targetUnitId,
                  requesterId: record.requesterId || this.ctx.userId,
                  ownerId: record.ownerId || null,
                  history: record.history || [],
                  updatedAt: new Date(),
                  deletedAt: null,
                },
              });
            createdCount++;
          } else if (record.entityType === 'evolution') {
            const finalData = { ...(record.data || {}) };
            const rawTaskId = record.taskId || record.data?.taskId;

            // Salvaguarda de Integridade Relacional para Tarefas Soft-Deletadas no servidor
            if (rawTaskId) {
              const [associatedTask] = await tx
                .select()
                .from(intersectoralTasks)
                .where(eq(intersectoralTasks.id, rawTaskId))
                .limit(1);

              if (!associatedTask || associatedTask.deletedAt) {
                getLogger().warn(
                  { taskId: rawTaskId, patientId: record.patientId, tenantId: this.ctx.tenantId },
                  'Associated task was soft-deleted or missing during evolution creation. Re-linking as contingency note.'
                );
                finalData.taskId = null;
                finalData.isContingency = true;
                finalData.notes = `[Nota de Contingência - Encaminhamento/Tarefa ${rawTaskId} excluída no servidor]: ` + (finalData.notes || '');
              }
            }

            await tx
              .insert(ptsEvolutions)
              .values({
                id: record.id,
                ptsId: record.ptsId,
                tenantId: this.ctx.tenantId,
                patientId: record.patientId,
                professionalId: record.professionalId || this.ctx.userId,
                unitId: record.unitId || this.ctx.activeUnitId,
                unitType: record.unitType || null,
                version: record.version || 2,
                data: finalData,
                scores: record.scores || {},
                status: record.status || 'draft',
                createdBy: record.createdBy || this.ctx.userId,
                createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
                updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
                deletedAt: null,
              })
              .onConflictDoUpdate({
                target: ptsEvolutions.id,
                set: {
                  ptsId: record.ptsId,
                  patientId: record.patientId,
                  professionalId: record.professionalId || this.ctx.userId,
                  unitId: record.unitId || this.ctx.activeUnitId,
                  unitType: record.unitType || null,
                  version: record.version || 2,
                  data: finalData,
                  scores: record.scores || {},
                  status: record.status || 'draft',
                  updatedAt: new Date(),
                  deletedAt: null,
                },
              });
            createdCount++;
          }
        } catch (err) {
          getLogger().error(
            { err, record, tenantId: this.ctx.tenantId },
            'Failed to insert/upsert synced record'
          );
          throw err; // Força rollback da transação em caso de falha estrutural
        }
      }

      // B) Processar Atualizações Offline com Detecção de Concorrência e Fusão Lógica
      for (const record of input.updated) {
        let dbRecord: any = null;

        // Recupera o registro atual de forma pessimista para comparação de timestamps
        if (record.entityType === 'task') {
          [dbRecord] = await tx
            .select()
            .from(intersectoralTasks)
            .where(and(eq(intersectoralTasks.id, record.id), eq(intersectoralTasks.tenantId, this.ctx.tenantId)))
            .limit(1);
        } else if (record.entityType === 'evolution') {
          [dbRecord] = await tx
            .select()
            .from(ptsEvolutions)
            .where(and(eq(ptsEvolutions.id, record.id), eq(ptsEvolutions.tenantId, this.ctx.tenantId)))
            .limit(1);
        }

        if (!dbRecord) {
          getLogger().warn(
            { id: record.id, entityType: record.entityType, tenantId: this.ctx.tenantId },
            'Update skipped: record not found in database.'
          );
          continue;
        }

        // Detecção de Concorrência
        const isConflicted = lastPulled && dbRecord.updatedAt.getTime() > lastPulled.getTime();

        if (isConflicted) {
          getLogger().warn(
            { id: record.id, entityType: record.entityType, tenantId: this.ctx.tenantId },
            'Concurrency conflict detected during push sync. Initiating Deterministic Merge Engine.'
          );

          if (record.entityType === 'task') {
            // 1. Fusão de Textos (description)
            let mergedDesc = dbRecord.description;
            if (record.description && record.description !== dbRecord.description) {
              mergedDesc = `[Servidor - Modificado em ${dbRecord.updatedAt.toISOString()}]: ${dbRecord.description}\n\n[Dispositivo Offline - Profissional ${this.ctx.userId}]: ${record.description}`;
            }

            // 2. Fusão analítica do histórico com Estabilização de Milissegundos contra Clock Drift
            const combinedHistory = [...(dbRecord.history || []), ...(record.history || [])];
            const historyMap = new Map<string, TaskHistoryEntry>();
            for (const entry of combinedHistory) {
              if (!entry || !entry.changedAt) continue;

              // Truncamento no nível de segundos para normalizar flutuações de relógio
              const normalizedTime = typeof entry.changedAt === 'string' && entry.changedAt.length >= 19
                ? entry.changedAt.substring(0, 19)
                : String(entry.changedAt);

              const sig = `${normalizedTime}_${entry.changedBy}_${entry.status}`;
              historyMap.set(sig, entry);
            }
            const mergedHistory = Array.from(historyMap.values()).sort(
              (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
            );

            // 3. Matriz de Severidade para Priority (stat > asap > urgent > routine)
            const prioritySeverity: Record<string, number> = {
              stat: 4,
              asap: 3,
              urgent: 2,
              routine: 1,
            };
            const localPrioVal = prioritySeverity[record.priority] || 0;
            const dbPrioVal = prioritySeverity[dbRecord.priority] || 0;
            const mergedPriority = localPrioVal > dbPrioVal ? record.priority : dbRecord.priority;

            // 4. Matriz de Severidade para Status (Encerramentos técnicos vencem)
            const closingStatuses = ['completed', 'failed', 'cancelled', 'rejected'];
            const isLocalClosed = closingStatuses.includes(record.status);
            const isDbClosed = closingStatuses.includes(dbRecord.status);
            let mergedStatus = dbRecord.status;

            if (isLocalClosed && !isDbClosed) {
              mergedStatus = record.status;
            } else if (!isLocalClosed && isDbClosed) {
              mergedStatus = dbRecord.status;
            } else if (isLocalClosed && isDbClosed) {
              mergedStatus = record.status; // Ambos encerrados, prevalece o local do profissional
            } else {
              mergedStatus = record.status || dbRecord.status;
            }

            // Anexa o Relatório Consolidado de Encerramento se a tarefa transitou para encerramento técnico
            if ((isLocalClosed && !isDbClosed) || (!isLocalClosed && isDbClosed)) {
              const report = `\n\n[Relatório Consolidado de Encerramento]: A tarefa foi encerrada com status '${mergedStatus}'. Mudanças concorrentes foram mescladas com sucesso.`;
              mergedDesc = mergedDesc + report;
            }

            // Persiste o registro consolidado e o recupera
            const [updatedTask] = await tx
              .update(intersectoralTasks)
              .set({
                status: mergedStatus,
                priority: mergedPriority,
                description: mergedDesc,
                history: mergedHistory,
                updatedAt: new Date(),
                deletedAt: null, // Assegura reativação
              })
              .where(and(eq(intersectoralTasks.id, record.id), eq(intersectoralTasks.tenantId, this.ctx.tenantId)))
              .returning();

            if (updatedTask) {
              mergedTasks.push(updatedTask);
            }

            conflicts.push({
              id: record.id,
              entityType: 'task',
              serverUpdatedAt: dbRecord.updatedAt.toISOString(),
              clientUpdatedAt: record.updatedAt || new Date().toISOString(),
              message: 'Conflito de concorrência mesclado deterministicamente com sucesso pelo servidor.',
              resolved: true,
            });
            updatedCount++;
          } else if (record.entityType === 'evolution') {
            // 1. Fusão de textos dentro de data
            const mergedData = { ...(dbRecord.data || {}), ...(record.data || {}) };
            const textFields = ['notes', 'justification', 'description'];

            for (const field of textFields) {
              const clientVal = record.data?.[field];
              const serverVal = dbRecord.data?.[field];

              if (typeof clientVal === 'string' && typeof serverVal === 'string' && clientVal !== serverVal) {
                const combined = `[Servidor - Modificado em ${dbRecord.updatedAt.toISOString()}]: ${serverVal}\n\n[Dispositivo Offline - Profissional ${this.ctx.userId}]: ${clientVal}`;
                mergedData[field] = combined;
              }
            }

            // 2. Fusão de Scores
            const mergedScores = { ...(dbRecord.scores || {}), ...(record.scores || {}) };

            // 3. Salvaguarda Relacional para tarefas soft-deletadas
            const rawTaskId = record.taskId || record.data?.taskId;
            if (rawTaskId) {
              const [associatedTask] = await tx
                .select()
                .from(intersectoralTasks)
                .where(eq(intersectoralTasks.id, rawTaskId))
                .limit(1);

              if (!associatedTask || associatedTask.deletedAt) {
                mergedData.taskId = null;
                mergedData.isContingency = true;
                mergedData.notes = `[Nota de Contingência - Encaminhamento/Tarefa ${rawTaskId} excluída no servidor]: ` + (mergedData.notes || '');
              }
            }

            const [updatedEvolution] = await tx
              .update(ptsEvolutions)
              .set({
                data: mergedData,
                scores: mergedScores,
                status: record.status || dbRecord.status,
                updatedAt: new Date(),
                deletedAt: null,
              })
              .where(and(eq(ptsEvolutions.id, record.id), eq(ptsEvolutions.tenantId, this.ctx.tenantId)))
              .returning();

            if (updatedEvolution) {
              mergedEvolutions.push(updatedEvolution);
            }

            conflicts.push({
              id: record.id,
              entityType: 'evolution',
              serverUpdatedAt: dbRecord.updatedAt.toISOString(),
              clientUpdatedAt: record.updatedAt || new Date().toISOString(),
              message: 'Conflito de concorrência em evolução mesclado deterministicamente com sucesso pelo servidor.',
              resolved: true,
            });
            updatedCount++;
          }
        } else {
          // Sem conflitos detectados: Fast-Forward seguro
          if (record.entityType === 'task') {
            await tx
              .update(intersectoralTasks)
              .set({
                status: record.status || dbRecord.status,
                intent: record.intent || dbRecord.intent,
                priority: record.priority || dbRecord.priority,
                description: record.description || dbRecord.description,
                sourceUnitId: record.sourceUnitId || dbRecord.sourceUnitId,
                targetUnitId: record.targetUnitId || dbRecord.targetUnitId,
                ownerId: record.ownerId !== undefined ? record.ownerId : dbRecord.ownerId,
                history: record.history || dbRecord.history,
                updatedAt: new Date(),
                deletedAt: null,
              })
              .where(and(eq(intersectoralTasks.id, record.id), eq(intersectoralTasks.tenantId, this.ctx.tenantId)));
            updatedCount++;
          } else if (record.entityType === 'evolution') {
            const finalData = { ...(record.data || {}) };
            const rawTaskId = record.taskId || record.data?.taskId;

            // Salvaguarda relacional mesmo em fast-forward
            if (rawTaskId) {
              const [associatedTask] = await tx
                .select()
                .from(intersectoralTasks)
                .where(eq(intersectoralTasks.id, rawTaskId))
                .limit(1);

              if (!associatedTask || associatedTask.deletedAt) {
                finalData.taskId = null;
                finalData.isContingency = true;
                finalData.notes = `[Nota de Contingência - Encaminhamento/Tarefa ${rawTaskId} excluída no servidor]: ` + (finalData.notes || '');
              }
            }

            await tx
              .update(ptsEvolutions)
              .set({
                ptsId: record.ptsId || dbRecord.ptsId,
                patientId: record.patientId || dbRecord.patientId,
                professionalId: record.professionalId || dbRecord.professionalId,
                unitId: record.unitId || dbRecord.unitId,
                unitType: record.unitType || dbRecord.unitType,
                version: record.version || dbRecord.version,
                data: finalData,
                scores: record.scores || dbRecord.scores,
                status: record.status || dbRecord.status,
                updatedAt: new Date(),
                deletedAt: null,
              })
              .where(and(eq(ptsEvolutions.id, record.id), eq(ptsEvolutions.tenantId, this.ctx.tenantId)));
            updatedCount++;
          }
        }
      }

      // C) Processar Deleções via Soft Delete (Tombstone)
      for (const id of input.deleted) {
        // Tenta desativar das tabelas controladas marcando com deleted_at, mantendo o escopo estrito do tenant
        const [taskDeleted] = await tx
          .update(intersectoralTasks)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(intersectoralTasks.id, id), eq(intersectoralTasks.tenantId, this.ctx.tenantId)))
          .returning({ id: intersectoralTasks.id });

        const [evolutionDeleted] = await tx
          .update(ptsEvolutions)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(ptsEvolutions.id, id), eq(ptsEvolutions.tenantId, this.ctx.tenantId)))
          .returning({ id: ptsEvolutions.id });

        const [responseDeleted] = await tx
          .update(ptsResponses)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(ptsResponses.id, id), eq(ptsResponses.tenantId, this.ctx.tenantId)))
          .returning({ id: ptsResponses.id });

        if (taskDeleted || evolutionDeleted || responseDeleted) {
          deletedCount++;
        }
      }
    });

    return {
      success: true,
      appliedCount: {
        created: createdCount,
        updated: updatedCount,
        deleted: deletedCount,
      },
      conflicts,
      changes: {
        intersectoral_tasks: {
          created: [],
          updated: mergedTasks,
          deleted: [],
        },
        pts_evolutions: {
          created: [],
          updated: mergedEvolutions,
          deleted: [],
        },
      },
      serverTimestamp: new Date().toISOString(),
    };
  }
}
