import { withTransactionContext } from '@/lib/db/client';
import { withAudit } from '@/lib/audit/with-audit';
import { requireAnyRole, ForbiddenError } from '@/lib/auth/authorization';
import { BaseService } from '@/services/base.service';
import type { TenantContext } from '@/lib/tenant-context';
import type { Encontro } from '@/lib/db/schema';
import { PtsEncontroRepository } from '../repositories/pts-encontro.repository';

export type CreateEncontroInput = {
  planoId: string;
  tipo: 'articulacao_rede' | 'reuniao_pts';
  data: Date | string;
  participantes: string[];
  usuarioPresente: boolean;
  ata?: string | null;
};

const createEncontroAudited = withAudit<CreateEncontroInput, Encontro>(
  {
    action: 'create',
    entityType: 'pts_encontro',
    entityId: (_, output) => output?.id,
    metadata: (input) => ({
      planoId: input.planoId,
      tipo: input.tipo,
    }),
  },
  async (ctx: TenantContext, input: CreateEncontroInput): Promise<Encontro> => {
    requireAnyRole(ctx, ['MANAGER', 'PROFESSIONAL']);

    if (!ctx.activeUnitId) {
      throw new ForbiddenError('Acesso negado: o profissional técnico precisa ter uma unidade ativa selecionada.');
    }

    if (input.tipo === 'reuniao_pts' && !input.usuarioPresente) {
      throw new Error('Reunião de PTS exige a presença do usuário.');
    }

    const repo = new PtsEncontroRepository(ctx);
    return await repo.createEncontro({
      planoId: input.planoId,
      tipo: input.tipo,
      data: typeof input.data === 'string' ? new Date(input.data) : input.data,
      participantes: input.participantes,
      usuarioPresente: input.usuarioPresente,
      ata: input.ata ?? null,
      createdBy: ctx.userId,
    });
  }
);

export class EncontroService extends BaseService {
  async createEncontro(input: CreateEncontroInput): Promise<Encontro> {
    return await withTransactionContext(this.ctx.userId, this.ctx.tenantId, async (tx) => {
      const txCtx = { ...this.ctx, tx };
      return createEncontroAudited(txCtx, input);
    });
  }
}
