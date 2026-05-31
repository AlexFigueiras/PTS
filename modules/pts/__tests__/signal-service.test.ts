import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SignalService } from '../services/signal.service';
import { ForbiddenError } from '@/lib/auth/authorization';
import type { TenantContext } from '@/lib/tenant-context';
import { InvalidStateTransitionError, UnauthorizedTransitionError } from '@pts/domain';

vi.mock('@/modules/audit', () => ({
  AuditService: class {
    record = vi.fn().mockResolvedValue(undefined);
  },
}));

const mockTxSelect = vi.fn();
const mockTxInsert = vi.fn();
const mockTxUpdate = vi.fn();

const mockTx = {
  select: mockTxSelect,
  insert: mockTxInsert,
  update: mockTxUpdate,
} as any;

vi.mock('@/lib/db/client', () => ({
  getDb: vi.fn(() => mockTx),
  getAuthenticatedDb: vi.fn(() => mockTx),
  withTransactionContext: vi.fn(async (_userId, _tenantId, callback) => callback(mockTx)),
}));

/* Helpers de encadeamento Drizzle ------------------------------------ */

function selectReturning(rows: any[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
        orderBy: vi.fn().mockResolvedValue(rows),
        // findAwaitingRtValidation usa innerJoin antes do where
      }),
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue(rows) }),
      }),
    }),
  };
}
// Variante para selects sem .limit (ex.: lista de planos / unidades)
function selectList(rows: any[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
    }),
  };
}

function insertReturning(rows: any[]) {
  return { values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(rows) }) };
}

function updateReturning(rows: any[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(rows) }),
    }),
  };
}

describe('SignalService — Motor de Sinalização Cruzada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const authorCtx: TenantContext = {
    tenantId: 'tenant-1',
    userId: 'author-1',
    role: 'PROFESSIONAL',
    activeUnitId: 'unit-source',
  };

  const noUnitCtx: TenantContext = { ...authorCtx, activeUnitId: null };

  describe('createSignal — roteamento e validações', () => {
    it('rejeita sem unidade ativa', async () => {
      const service = new SignalService(noUnitCtx);
      await expect(
        service.createSignal({ caseId: 'case-1', needTypeId: 'risco_reinternacao', priority: 'pactuada', abstractReason: 'x' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejeita caso inativo / inexistente', async () => {
      mockTxSelect.mockReturnValueOnce(selectReturning([])); // caso não encontrado
      const service = new SignalService(authorCtx);
      await expect(
        service.createSignal({ caseId: 'case-x', needTypeId: 'risco_reinternacao', priority: 'pactuada', abstractReason: 'x' }),
      ).rejects.toThrow('Caso intersetorial não encontrado');
    });

    it('rejeita tipo de necessidade desconhecido', async () => {
      mockTxSelect.mockReturnValueOnce(selectReturning([{ id: 'case-1', status: 'pts_ativo' }]));
      const service = new SignalService(authorCtx);
      await expect(
        service.createSignal({ caseId: 'case-1', needTypeId: 'inexistente', priority: 'pactuada', abstractReason: 'x' }),
      ).rejects.toThrow('Tipo de necessidade desconhecido');
    });

    it('roteia para a unidade da rede que representa o componente preferido (caps)', async () => {
      // 1. caso ativo
      mockTxSelect.mockReturnValueOnce(selectReturning([{ id: 'case-1', status: 'pts_ativo' }]));
      // 2. unidades candidatas (caps preferido sobre atencao_basica)
      mockTxSelect.mockReturnValueOnce(
        selectList([
          { id: 'unit-ab', componentId: 'atencao_basica' },
          { id: 'unit-caps', componentId: 'caps' },
        ]),
      );
      // 3. insert do sinal
      mockTxInsert.mockReturnValueOnce(
        insertReturning([
          {
            id: 'signal-1',
            status: 'sugerida',
            destinationComponent: 'caps',
            destinationUnitId: 'unit-caps',
            priority: 'pactuada',
          },
        ]),
      );

      const service = new SignalService(authorCtx);
      const result = await service.createSignal({
        caseId: 'case-1',
        needTypeId: 'risco_reinternacao',
        priority: 'pactuada',
        abstractReason: 'Reinternações frequentes',
      });

      expect(result.status).toBe('sugerida');
      expect(result.destinationComponent).toBe('caps');
      expect(result.destinationUnitId).toBe('unit-caps');
    });
  });

  describe('FSM e gates', () => {
    function mockLoadSignal(signal: any, plans: any[] = [{ ownerId: 'rt-1', type: 'PTS' }]) {
      mockTxSelect.mockReturnValueOnce(selectReturning([signal])); // findById
      mockTxSelect.mockReturnValueOnce(selectList(plans)); // resolveRtUserId
    }

    it('confirmSignal pactuada: sugerida -> confirmada_pelo_autor pelo autor', async () => {
      mockLoadSignal({ id: 's1', status: 'sugerida', priority: 'pactuada', authorId: 'author-1', caseId: 'case-1' });
      mockTxUpdate.mockReturnValueOnce(updateReturning([{ id: 's1', status: 'confirmada_pelo_autor', priority: 'pactuada' }]));

      const service = new SignalService(authorCtx);
      const result = await service.confirmSignal('s1');
      expect(result.status).toBe('confirmada_pelo_autor');
    });

    it('confirmSignal por NÃO-autor é rejeitado pelo gate', async () => {
      mockLoadSignal({ id: 's1', status: 'sugerida', priority: 'pactuada', authorId: 'outro', caseId: 'case-1' });
      const service = new SignalService(authorCtx);
      await expect(service.confirmSignal('s1')).rejects.toThrow(UnauthorizedTransitionError);
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });

    it('confirmSignal imediata colapsa para encaminhada e enfileira notificação', async () => {
      mockLoadSignal({
        id: 's1',
        status: 'sugerida',
        priority: 'imediata',
        authorId: 'author-1',
        caseId: 'case-1',
        destinationUnitId: 'unit-caps',
      });
      // update -> confirmada_pelo_autor
      mockTxUpdate.mockReturnValueOnce(
        updateReturning([{ id: 's1', status: 'confirmada_pelo_autor', priority: 'imediata', destinationUnitId: 'unit-caps', caseId: 'case-1' }]),
      );
      // enqueue job (insert) — chain notify ocorre após encaminhada
      mockTxInsert.mockReturnValueOnce(insertReturning([{ id: 'job-1' }]));
      // update -> encaminhada
      mockTxUpdate.mockReturnValueOnce(
        updateReturning([{ id: 's1', status: 'encaminhada', priority: 'imediata', destinationUnitId: 'unit-caps', caseId: 'case-1' }]),
      );

      const service = new SignalService(authorCtx);
      const result = await service.confirmSignal('s1');
      expect(result.status).toBe('encaminhada');
      expect(mockTxInsert).toHaveBeenCalled(); // job enfileirado no outbox
    });

    it('receiveSignal: encaminhada -> recebida (sem gate de papel)', async () => {
      mockLoadSignal({ id: 's1', status: 'encaminhada', priority: 'pactuada', authorId: 'x', caseId: 'case-1' });
      mockTxUpdate.mockReturnValueOnce(updateReturning([{ id: 's1', status: 'recebida', priority: 'pactuada' }]));
      const service = new SignalService(authorCtx);
      const result = await service.receiveSignal('s1');
      expect(result.status).toBe('recebida');
    });

    it('startTreatment a partir de sugerida é estruturalmente inválido', async () => {
      mockLoadSignal({ id: 's1', status: 'sugerida', priority: 'pactuada', authorId: 'x', caseId: 'case-1' });
      const service = new SignalService(authorCtx);
      await expect(service.startTreatment('s1')).rejects.toThrow(InvalidStateTransitionError);
    });

    it('resolveSignal: em_tratamento -> resolvida grava resolvedAt', async () => {
      mockLoadSignal({ id: 's1', status: 'em_tratamento', priority: 'pactuada', authorId: 'x', caseId: 'case-1' });
      mockTxUpdate.mockReturnValueOnce(updateReturning([{ id: 's1', status: 'resolvida', priority: 'pactuada' }]));
      const service = new SignalService(authorCtx);
      const result = await service.resolveSignal('s1', 'Demanda atendida');
      expect(result.status).toBe('resolvida');
    });
  });

  describe('assignProfessional — distribuição pelo gerente', () => {
    const managerCtx: TenantContext = {
      tenantId: 'tenant-1',
      userId: 'manager-1',
      role: 'MANAGER',
      activeUnitId: 'unit-caps',
    };

    it('rejeita profissional não-gerente', async () => {
      const service = new SignalService(authorCtx); // PROFESSIONAL
      await expect(service.assignProfessional('s1', 'prof-1')).rejects.toThrow(ForbiddenError);
    });

    it('rejeita distribuição para sinalização fora da unidade ativa do gerente', async () => {
      mockTxSelect.mockReturnValueOnce(selectReturning([{ id: 's1', destinationUnitId: 'unit-outra' }]));
      const service = new SignalService(managerCtx);
      await expect(service.assignProfessional('s1', 'prof-1')).rejects.toThrow(ForbiddenError);
    });

    it('atribui profissional quando a sinalização é da unidade ativa', async () => {
      mockTxSelect.mockReturnValueOnce(selectReturning([{ id: 's1', destinationUnitId: 'unit-caps' }]));
      mockTxUpdate.mockReturnValueOnce(updateReturning([{ id: 's1', assignedProfessionalId: 'prof-1' }]));
      const service = new SignalService(managerCtx);
      const result = await service.assignProfessional('s1', 'prof-1');
      expect(result.assignedProfessionalId).toBe('prof-1');
    });
  });
});
