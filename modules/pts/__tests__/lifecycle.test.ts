import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InitializeCaseService } from '../services/initialize-case.service';
import { RecordActionService } from '../services/record-action.service';
import { getAuthenticatedDb, withTransactionContext } from '@/lib/db/client';
import { ForbiddenError } from '@/lib/auth/authorization';
import type { TenantContext } from '@/lib/tenant-context';
import { InvalidStateTransitionError } from '@pts/domain';

// Mock do AuditService usando uma classe real para suportar o construtor 'new'
vi.mock('@/modules/audit', () => {
  return {
    AuditService: class {
      record = vi.fn().mockResolvedValue(undefined);
    }
  };
});

// Mock do Db Client
const mockTxSelect = vi.fn();
const mockTxInsert = vi.fn();
const mockTxUpdate = vi.fn();

const mockTx = {
  select: mockTxSelect,
  insert: mockTxInsert,
  update: mockTxUpdate,
} as any;

const mockDbSelect = mockTxSelect;
const mockDbInsert = mockTxInsert;
const mockDbTransaction = vi.fn((callback) => callback(mockTx));

const mockDb = {
  select: mockDbSelect,
  insert: mockDbInsert,
  transaction: mockDbTransaction,
} as any;

vi.mock('@/lib/db/client', () => ({
  getDb: vi.fn(() => mockDb),
  getAuthenticatedDb: vi.fn(() => mockDb),
  withTransactionContext: vi.fn(async (userId, tenantId, callback) => callback(mockTx)),
}));

describe('PTS Case, Plan & Action Lifecycle Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validHealthCtx: TenantContext = {
    tenantId: 'tenant-123',
    userId: 'user-456',
    role: 'PROFESSIONAL',
    activeUnitId: 'unit-health',
  };

  const validSocialCtx: TenantContext = {
    tenantId: 'tenant-123',
    userId: 'user-456',
    role: 'PROFESSIONAL',
    activeUnitId: 'unit-social',
  };

  const invalidRoleCtx: TenantContext = {
    tenantId: 'tenant-123',
    userId: 'user-456',
    role: 'OTHER' as any, // Simula papel não autorizado fora do enum
    activeUnitId: 'unit-health',
  };

  const missingUnitCtx: TenantContext = {
    tenantId: 'tenant-123',
    userId: 'user-456',
    role: 'PROFESSIONAL',
    activeUnitId: null,
  };

  describe('InitializeCaseService Tests', () => {
    it('deve rejeitar inicialização se o role do usuário for insuficiente', async () => {
      const service = new InitializeCaseService(invalidRoleCtx);
      await expect(service.execute({ patientId: 'patient-789' })).rejects.toThrow(ForbiddenError);
    });

    it('deve rejeitar se o profissional não possuir unidade ativa selecionada', async () => {
      const service = new InitializeCaseService(missingUnitCtx);
      await expect(service.execute({ patientId: 'patient-789' })).rejects.toThrow(ForbiddenError);
    });

    it('deve rejeitar se a unidade ativa não for encontrada no tenant', async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]), // Unidade não encontrada
          }),
        }),
      });

      const service = new InitializeCaseService(validHealthCtx);
      await expect(service.execute({ patientId: 'patient-789' })).rejects.toThrow(ForbiddenError);
    });

    it('deve rejeitar se o cidadão/paciente não for encontrado no tenant', async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'unit-health', type: 'HEALTH' }]),
          }),
        }),
      });

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]), // Cidadão não encontrado
          }),
        }),
      });

      const service = new InitializeCaseService(validHealthCtx);
      await expect(service.execute({ patientId: 'patient-789' })).rejects.toThrow(
        'Cidadão/Paciente não foi encontrado ou não pertence a este município.'
      );
    });

    it('deve inicializar com sucesso caso e plano do tipo PTS quando unidade ativa for de Saúde (HEALTH)', async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'unit-health', type: 'HEALTH' }]),
          }),
        }),
      });

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'patient-789', fullName: 'Maria Silva' }]),
          }),
        }),
      });

      mockTxSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      mockTxInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([{ id: 'case-abc', patientId: 'patient-789', status: 'radar' }]),
        }),
      });

      mockTxInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([{ id: 'plan-xyz', caseId: 'case-abc', type: 'PTS', ownerId: 'user-456' }]),
        }),
      });

      const service = new InitializeCaseService(validHealthCtx);
      const result = await service.execute({ patientId: 'patient-789' });

      expect(result).toBeDefined();
      expect(result.case.id).toBe('case-abc');
      expect(result.plan.type).toBe('PTS');
      expect(result.plan.ownerId).toBe('user-456');

      expect(withTransactionContext).toHaveBeenCalled();
    });

    it('deve inicializar com sucesso o plano unificado (tipo PTS) mesmo sob unidade ativa de Assistência Social (SOCIAL) — Plano Único Compartilhado', async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'unit-social', type: 'SOCIAL' }]),
          }),
        }),
      });

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'patient-789', fullName: 'Maria Silva' }]),
          }),
        }),
      });

      mockTxSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      mockTxInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([{ id: 'case-abc', patientId: 'patient-789', status: 'radar' }]),
        }),
      });

      // Plano Único Compartilhado: tipo do plano inicializado deve ser 'PTS'
      mockTxInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([{ id: 'plan-xyz', caseId: 'case-abc', type: 'PTS', ownerId: 'user-456' }]),
        }),
      });

      const service = new InitializeCaseService(validSocialCtx);
      const result = await service.execute({ patientId: 'patient-789', legalMeasure: 'Medida Protetiva ECA' });

      expect(result).toBeDefined();
      expect(result.case.id).toBe('case-abc');
      expect(result.plan.type).toBe('PTS');
      expect(result.plan.ownerId).toBe('user-456');
    });

    it('deve acolher/assumir com sucesso um caso em status de observacao e transitar para acompanhamento', async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'unit-health', type: 'HEALTH' }]),
          }),
        }),
      });

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'patient-789', fullName: 'Maria Silva' }]),
          }),
        }),
      });

      mockTxSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'case-observacao', patientId: 'patient-789', status: 'observacao' }]),
          }),
        }),
      });

      mockTxUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([{ id: 'case-observacao', status: 'acompanhamento' }]),
        }),
      });

      mockTxInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([{ id: 'plan-xyz', caseId: 'case-observacao', type: 'PTS', ownerId: 'user-456' }]),
        }),
      });

      const service = new InitializeCaseService(validHealthCtx);
      const result = await service.execute({ patientId: 'patient-789' });

      expect(result).toBeDefined();
      expect(result.case.status).toBe('acompanhamento');
      expect(mockTxUpdate).toHaveBeenCalled();
    });

    it('deve falhar se já houver um caso ativo para o cidadão no tenant', async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'unit-health', type: 'HEALTH' }]),
          }),
        }),
      });

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'patient-789', fullName: 'Maria Silva' }]),
          }),
        }),
      });

      mockTxSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'case-active-duplicate', status: 'radar' }]),
          }),
        }),
      });

      const service = new InitializeCaseService(validHealthCtx);
      await expect(service.execute({ patientId: 'patient-789' })).rejects.toThrow(
        'Cidadão já possui um caso intersetorial ativo neste município.'
      );

      expect(mockTxInsert).not.toHaveBeenCalled();
    });
  });

  describe('RecordActionService & Action Lifecycle FSM Tests', () => {
    it('deve permitir a pactuação de uma nova ação no plano unificado', async () => {
      mockTxInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([{
            id: 'action-111',
            planId: 'plan-xyz',
            status: 'pactuada',
            description: 'Encaminhamento para CAPS AD',
          }]),
        }),
      });

      const service = new RecordActionService(validHealthCtx);
      const result = await service.createAction({
        planId: 'plan-xyz',
        responsibleUnitId: 'unit-health',
        deadline: new Date(),
        description: 'Encaminhamento para CAPS AD',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('action-111');
      expect(result.status).toBe('pactuada');
    });

    it('deve permitir a transição estruturalmente válida de pactuada -> em_andamento na FSM', async () => {
      // 1. mock findById para retornar ação 'pactuada'
      mockTxSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'action-111', status: 'pactuada' }]),
          }),
        }),
      });

      // 2. mock updateActionStatus
      mockTxUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([{ id: 'action-111', status: 'em_andamento' }]),
          }),
        }),
      });

      const service = new RecordActionService(validHealthCtx);
      const result = await service.transitionAction({
        actionId: 'action-111',
        nextStatus: 'em_andamento',
        evolutionNotes: 'Atendimento inicial agendado.',
      });

      expect(result.status).toBe('em_andamento');
    });

    it('deve bloquear e lançar erro estrutural ao tentar transição inválida de pactuada -> concluida direto na FSM', async () => {
      // 1. mock findById para retornar ação 'pactuada'
      mockTxSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ id: 'action-111', status: 'pactuada' }]),
          }),
        }),
      });

      const service = new RecordActionService(validHealthCtx);
      await expect(
        service.transitionAction({
          actionId: 'action-111',
          nextStatus: 'concluida', // Pactuada não pula direto para concluida sem passar por em_andamento
        })
      ).rejects.toThrow(InvalidStateTransitionError);

      expect(mockTxUpdate).not.toHaveBeenCalled();
    });
  });
});
