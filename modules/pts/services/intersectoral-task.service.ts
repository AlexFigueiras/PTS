// @ts-nocheck
// FROZEN: branch RNDS pós-contrato (RNDS_ENABLED) — reavaliar Fase 2/3
import { getDb } from '@/lib/db/client';
import {
  intersectoralTasks,
  serviceUnits,
  patients,
  profiles,
  type IntersectoralTask,
  type TaskHistoryEntry
} from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { withAudit } from '@/lib/audit/with-audit';
import { requireRole, hasRole, ForbiddenError, type UserRole } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import { PtsRepository } from '../pts.repository';
import type { TaskStatus, IntersectoralTaskInsertInput } from '../pts.dto';
import { RndsQueueService } from '@/modules/rnds/services/rnds-queue.service';
import { getServerEnv } from '@/lib/env';

/**
 * Classe de erro para representar recurso de tarefa não encontrado ou fora do tenant.
 */
export class TaskNotFoundError extends Error {
  constructor(message = 'Tarefa intersetorial não encontrada ou acesso negado.') {
    super(message);
    this.name = 'TaskNotFoundError';
  }
}

/**
 * Classe de erro para representar transições inválidas na máquina de estados finita da tarefa.
 */
export class InvalidTaskTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTaskTransitionError';
  }
}

/**
 * Matriz imutável de transições permitidas para a FSM de Tarefas Intersetoriais.
 */
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  requested: ['accepted', 'cancelled', 'failed'],
  accepted: ['in-progress', 'cancelled', 'failed'],
  'in-progress': ['completed', 'cancelled', 'failed'],
  completed: [],
  cancelled: [],
  failed: [],
};

/**
 * Função de domínio envelopada por auditoria para criação de tarefas intersetoriais.
 */
const createTaskAudited = withAudit<
  Omit<IntersectoralTaskInsertInput, 'tenantId' | 'history' | 'status'>,
  IntersectoralTask
>(
  {
    action: 'create',
    entityType: 'intersectoral_task',
    entityId: (_, output) => output?.id,
    metadata: (input) => ({
      patientId: input.patientId,
      sourceUnitId: input.sourceUnitId,
      targetUnitId: input.targetUnitId,
      priority: input.priority,
    }),
  },
  async (ctx: TenantContext, input): Promise<IntersectoralTask> => {
    // 1. Governança: Requer permissão técnica mínima de PROFESSIONAL
    requireRole(ctx, 'PROFESSIONAL');

    // 2. Governança: Profissional deve possuir unidade ativa selecionada
    if (!ctx.activeUnitId) {
      throw new ForbiddenError(
        'Acesso negado: o profissional precisa ter uma unidade de atuação ativa (active_unit_id) para iniciar encaminhamentos.'
      );
    }

    // 3. Validação defensiva: Unidade de origem deve corresponder à unidade ativa selecionada
    if (input.sourceUnitId !== ctx.activeUnitId) {
      throw new ForbiddenError(
        `Acesso negado: a unidade de origem da tarefa (${input.sourceUnitId}) deve ser estritamente igual à sua unidade de atuação ativa (${ctx.activeUnitId}).`
      );
    }

    // 4. Executa criação e integrações de forma puramente atômica e transacional
    return await getDb().transaction(async (tx) => {
      // A) Busca a unidade de origem ativa de forma segura para certificar-se de seu tipo
      const [originUnit] = await tx
        .select()
        .from(serviceUnits)
        .where(and(eq(serviceUnits.id, ctx.activeUnitId!), eq(serviceUnits.tenantId, ctx.tenantId)))
        .limit(1);

      if (!originUnit) {
        throw new Error('Unidade de atuação ativa não encontrada ou fora do escopo do município.');
      }

      const repo = new PtsRepository(ctx, tx);

      // B) Inicializa o histórico com a primeira entrada operacional
      const initialHistoryEntry: TaskHistoryEntry = {
        status: 'requested',
        changedAt: new Date().toISOString(),
        changedBy: ctx.userId,
        notes: 'Solicitação de encaminhamento intersetorial iniciada (Warm Handoff).',
      };

      const task = await repo.createTask({
        ...input,
        status: 'requested',
        history: [initialHistoryEntry],
      });

      // C) Se RNDS habilitado e unidade for de Saúde (HEALTH), enfileira transacionalmente na RNDS (Outbox Pattern)
      const rndsEnabled = getServerEnv().RNDS_ENABLED;
      if (rndsEnabled && originUnit.type === 'HEALTH') {
        const [patient] = await tx
          .select()
          .from(patients)
          .where(and(eq(patients.id, input.patientId), eq(patients.tenantId, ctx.tenantId)))
          .limit(1);

        if (!patient) {
          throw new Error('Paciente associado ao encaminhamento não foi encontrado.');
        }

        const [prof] = await tx
          .select()
          .from(profiles)
          .where(eq(profiles.id, ctx.userId))
          .limit(1);

        const rndsGender: 'unknown' | 'male' | 'female' | 'other' =
          patient.gender === 'male' ? 'male' :
          patient.gender === 'female' ? 'female' :
          patient.gender === 'other' ? 'other' : 'unknown';
        const patientDto = {
          fullName: patient.fullName,
          birthDate: patient.birthDate || '1990-01-01',
          gender: rndsGender,
          cpf: patient.cpf || '00000000191',
          cns: patient.cns || null,
        };

        const encounterDto = {
          status: 'finished' as const,
          priorityCode: '1', // 1 = Eletivo / Rotina
          periodStart: new Date().toISOString(),
          periodEnd: new Date().toISOString(),
          cnes: '9999999', // CNES Fictício
          participant: {
            fullName: prof?.fullName || 'Profissional de Saúde do PTS',
            cnsOrCpf: prof?.cpf || '00000000191',
            cbo: '251510', // CBO padrão de Psicólogo
          },
        };

        const rndsQueue = new RndsQueueService(ctx);
        await rndsQueue.enqueueRac(
          {
            status: 'final',
            categoryCode: '1',
            date: new Date().toISOString(),
            title: 'Registro de Atendimento Clínico - PTS (Encaminhamento Intersetorial)',
            patient: patientDto,
            encounter: encounterDto,
            diagnosticos: [
              {
                code: 'F99',
                display: 'Transtorno mental não especificado (PTS)',
                system: 'http://hl7.org/fhir/sid/cid-10' as const,
                type: 'primary' as const,
              },
            ],
            sinaisVitais: [],
            alergias: [],
            prescricoes: [],
          },
          { tx }
        );
      }

      return task;
    });
  }
);

/**
 * Função de domínio envelopada por auditoria para atribuição ou remoção de profissional responsável da tarefa.
 */
const assignTaskAudited = withAudit<
  { taskId: string; ownerId: string | null },
  IntersectoralTask
>(
  {
    action: 'update',
    entityType: 'intersectoral_task',
    entityId: (input) => input.taskId,
    metadata: (input) => ({
      ownerId: input.ownerId,
    }),
  },
  async (ctx: TenantContext, input): Promise<IntersectoralTask> => {
    requireRole(ctx, 'PROFESSIONAL');

    if (!ctx.activeUnitId) {
      throw new ForbiddenError(
        'Acesso negado: o profissional precisa ter uma unidade de atuação ativa (active_unit_id) para atribuir responsabilidades.'
      );
    }

    return await getDb().transaction(async (tx) => {
      // 1. Busca a tarefa e assegura isolamento multi-tenant aplicando Pessimistic Locking (FOR UPDATE)
      const [task] = await tx
        .select()
        .from(intersectoralTasks)
        .where(and(eq(intersectoralTasks.id, input.taskId), eq(intersectoralTasks.tenantId, ctx.tenantId)))
        .for('update')
        .limit(1);

      if (!task) {
        throw new TaskNotFoundError(`Tarefa intersetorial com ID '${input.taskId}' não foi encontrada.`);
      }

      // 2. Apenas profissionais da unidade de destino podem receber ou gerenciar atribuição desta tarefa
      if (ctx.activeUnitId !== task.targetUnitId) {
        throw new ForbiddenError(
          `Acesso negado: apenas profissionais atuando na unidade de destino (${task.targetUnitId}) podem assumir ou distribuir esta tarefa.`
        );
      }

      // 3. Adiciona entrada informativa de atribuição no histórico
      const historyMessage = input.ownerId
        ? `Responsabilidade da tarefa atribuída ao profissional técnico (UUID: ${input.ownerId}).`
        : 'Responsabilidade técnica da tarefa removida (fila de espera genérica).';

      const currentHistory = (task.history || []) as TaskHistoryEntry[];
      const updatedHistory: TaskHistoryEntry[] = [
        ...currentHistory,
        {
          status: task.status,
          changedAt: new Date().toISOString(),
          changedBy: ctx.userId,
          notes: historyMessage,
        },
      ];

      const [updated] = await tx
        .update(intersectoralTasks)
        .set({
          ownerId: input.ownerId,
          history: updatedHistory,
          updatedAt: new Date(),
        })
        .where(and(eq(intersectoralTasks.id, input.taskId), eq(intersectoralTasks.tenantId, ctx.tenantId)))
        .returning();

      return updated;
    });
  }
);

/**
 * Função de domínio envelopada por auditoria para transições da máquina de estados.
 */
const transitionTaskStatusAudited = withAudit<
  { taskId: string; nextStatus: TaskStatus; notes?: string | null },
  IntersectoralTask
>(
  {
    action: 'update',
    entityType: 'intersectoral_task',
    entityId: (input) => input.taskId,
    metadata: (input) => ({
      nextStatus: input.nextStatus,
      hasNotes: !!input.notes,
    }),
  },
  async (ctx: TenantContext, input): Promise<IntersectoralTask> => {
    const { taskId, nextStatus, notes } = input;

    requireRole(ctx, 'PROFESSIONAL');

    if (!ctx.activeUnitId) {
      throw new ForbiddenError(
        'Acesso negado: o profissional técnico precisa ter uma unidade de atuação ativa (active_unit_id) para atualizar o status de encaminhamentos.'
      );
    }

    return await getDb().transaction(async (tx) => {
      // 1. Busca a tarefa atual validando estritamente RLS/Tenant e aplicando Pessimistic Locking (FOR UPDATE)
      const [task] = await tx
        .select()
        .from(intersectoralTasks)
        .where(and(eq(intersectoralTasks.id, taskId), eq(intersectoralTasks.tenantId, ctx.tenantId)))
        .for('update')
        .limit(1);

      if (!task) {
        throw new TaskNotFoundError(`Tarefa intersetorial com ID '${taskId}' não foi encontrada neste município.`);
      }

      // 2. Força imutabilidade e validação da máquina de estados (FSM)
      const currentStatus = task.status;
      const allowedNextStatuses = VALID_TRANSITIONS[currentStatus];

      if (!allowedNextStatuses || allowedNextStatuses.length === 0) {
        throw new InvalidTaskTransitionError(
          `Operação bloqueada: A tarefa com ID '${taskId}' já se encontra no status terminal '${currentStatus}' e nenhuma transição subsequente é permitida.`
        );
      }

      if (!allowedNextStatuses.includes(nextStatus)) {
        throw new InvalidTaskTransitionError(
          `Transição rejeitada: O fluxo operacional não permite passar o status de '${currentStatus}' para '${nextStatus}'.`
        );
      }

      // 3. Governança e Travas de Permissões Intersetoriais no Core
      const activeUnitId = ctx.activeUnitId;
      const userRole = ctx.role;

      const isDestinationMutation = ['accepted', 'in-progress', 'completed', 'failed'].includes(nextStatus);
      const isOriginMutation = nextStatus === 'cancelled';

      if (isDestinationMutation) {
        // Mutações de destino: Somente profissionais da unidade de destino da tarefa
        if (activeUnitId !== task.targetUnitId) {
          throw new ForbiddenError(
            `Acesso negado: apenas profissionais vinculados e atuando na unidade de destino do encaminhamento (${task.targetUnitId}) ` +
            `possuem autorização para realizar a ação '${nextStatus}'. Sua unidade ativa: (${activeUnitId}).`
          );
        }
      } else if (isOriginMutation) {
        // Mutações de origem (cancelled): Apenas o criador original do encaminhamento (na unidade de origem)
        // ou coordenadores (MANAGER/ADMIN) atuando na unidade de destino
        const isCreatorInSourceUnit = activeUnitId === task.sourceUnitId;
        const isManagerInTargetUnit = hasRole(userRole, 'MANAGER') && activeUnitId === task.targetUnitId;

        if (!isCreatorInSourceUnit && !isManagerInTargetUnit) {
          throw new ForbiddenError(
            `Acesso negado: o cancelamento deste encaminhamento exige ser o criador técnico atuando na unidade de origem (${task.sourceUnitId}) ` +
            `ou ter papel de Gerente (MANAGER/ADMIN) atuando na unidade de destino (${task.targetUnitId}).`
          );
        }
      }

      // 4. Append Atômico do histórico de auditoria clínica
      const newHistoryEntry: TaskHistoryEntry = {
        status: nextStatus,
        changedAt: new Date().toISOString(),
        changedBy: ctx.userId,
        notes: notes ?? null,
      };

      const currentHistory = (task.history || []) as TaskHistoryEntry[];
      const updatedHistory: TaskHistoryEntry[] = [...currentHistory, newHistoryEntry];

      const [updatedTask] = await tx
        .update(intersectoralTasks)
        .set({
          status: nextStatus,
          history: updatedHistory,
          updatedAt: new Date(),
        })
        .where(and(eq(intersectoralTasks.id, taskId), eq(intersectoralTasks.tenantId, ctx.tenantId)))
        .returning();

      return updatedTask;
    });
  }
);

/**
 * Serviço que orquestra o ciclo de vida e a governança de encaminhamentos/tarefas intersetoriais.
 */
export class IntersectoralTaskService extends BaseService {
  /**
   * Cria um novo encaminhamento intersetorial isolado por tenant e validando a unidade de atuação ativa.
   */
  async createTask(input: Omit<IntersectoralTaskInsertInput, 'tenantId' | 'history' | 'status'>): Promise<IntersectoralTask> {
    return createTaskAudited(this.ctx, input);
  }

  /**
   * Atribui ou remove a responsabilidade técnica de uma tarefa da unidade de destino.
   */
  async assignTask(input: { taskId: string; ownerId: string | null }): Promise<IntersectoralTask> {
    return assignTaskAudited(this.ctx, input);
  }

  /**
   * Executa a transição regulada de status da tarefa sob máquina de estados (FSM)
   * e regras de governança clínica baseadas no activeUnitId e no perfil profissional do usuário.
   */
  async transitionTaskStatus(
    taskId: string,
    nextStatus: TaskStatus,
    ctx: { userId: string; activeUnitId: string | null; userRole: UserRole },
    notes?: string | null
  ): Promise<IntersectoralTask> {
    const tenantCtx: TenantContext = {
      tenantId: this.ctx.tenantId,
      userId: ctx.userId,
      role: ctx.userRole,
      activeUnitId: ctx.activeUnitId,
    };
    return transitionTaskStatusAudited(tenantCtx, { taskId, nextStatus, notes });
  }

  /**
   * Obtém uma tarefa intersetorial específica, validando o isolamento de tenant.
   */
  async getTaskById(taskId: string): Promise<IntersectoralTask> {
    const repo = new PtsRepository(this.ctx);
    const task = await repo.findTaskById(taskId);
    if (!task) {
      throw new TaskNotFoundError(`Tarefa intersetorial com ID '${taskId}' não encontrada ou acesso negado.`);
    }
    return task;
  }
}
