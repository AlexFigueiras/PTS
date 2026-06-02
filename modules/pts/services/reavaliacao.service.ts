import { withTransactionContext } from '@/lib/db/client';
import { withAudit } from '@/lib/audit/with-audit';
import { requireAnyRole, ForbiddenError } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import type { PtsReavaliacao } from '@/lib/db/schema';
import type { ReavaliacaoResultado, ReavaliacaoProximaAcao } from '@pts/domain';
import { PtsReavaliacaoRepository } from '../repositories/pts-reavaliacao.repository';
import { PtsActionRepository } from '../repositories/pts-action.repository';

export type CreateReavaliacaoInput = {
  acaoId: string;
  data: string;
  resultado: ReavaliacaoResultado;
  nota?: string | null;
  proximaAcao: ReavaliacaoProximaAcao;
  // Quando proximaAcao = 'continuar', agenda a próxima reavaliação
  novaDataReavaliacao?: string | null;
};

const createReavaliacaoAudited = withAudit<CreateReavaliacaoInput, PtsReavaliacao>(
  {
    action: 'create',
    entityType: 'pts_reavaliacao',
    entityId: (_, output) => output?.id,
    metadata: (input) => ({
      acaoId: input.acaoId,
      resultado: input.resultado,
      proximaAcao: input.proximaAcao,
    }),
  },
  async (ctx: TenantContext, input: CreateReavaliacaoInput): Promise<PtsReavaliacao> => {
    requireAnyRole(ctx, ['MANAGER', 'PROFESSIONAL']);

    if (!ctx.activeUnitId) {
      throw new ForbiddenError('Acesso negado: o profissional técnico precisa ter uma unidade ativa selecionada.');
    }

    return await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      const reavaliacaoRepo = new PtsReavaliacaoRepository(ctx, tx);
      const acaoRepo = new PtsActionRepository(ctx, tx);

      // Verifica que a ação existe no tenant
      const acao = await acaoRepo.findById(input.acaoId);
      if (!acao) {
        throw new Error('Ação não encontrada ou fora do escopo deste município.');
      }

      const reavaliacao = await reavaliacaoRepo.create({
        acaoId: input.acaoId,
        data: input.data,
        resultado: input.resultado,
        nota: input.nota,
        proximaAcao: input.proximaAcao,
        createdBy: ctx.userId,
      });

      // Se a próxima ação for continuar e houver nova data, atualiza a ação
      if (input.proximaAcao === 'continuar' && input.novaDataReavaliacao) {
        await acaoRepo.updateDataProximaReavaliacao(input.acaoId, input.novaDataReavaliacao);
      }

      return reavaliacao;
    });
  }
);

export class ReavaliacaoService extends BaseService {
  async createReavaliacao(input: CreateReavaliacaoInput): Promise<PtsReavaliacao> {
    return createReavaliacaoAudited(this.ctx, input);
  }
}
