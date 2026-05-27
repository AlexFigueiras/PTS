import { BaseService } from '@/services/base.service';
import { BackgroundJobsRepository } from '../repositories/background-jobs.repository';
import { type BackgroundJob } from '@/lib/db/schema/background-jobs';

export class EnqueueJobService extends BaseService {
  private readonly repo: BackgroundJobsRepository;

  constructor(ctx: any) {
    super(ctx);
    this.repo = new BackgroundJobsRepository(ctx);
  }

  /**
   * Enfileira um job na fila em segundo plano associado ao tenant do contexto atual.
   * Suporta opcionalmente uma instância de transação do Drizzle (tx) para atomicidade transacional (Transactional Outbox).
   *
   * @param queueName Nome da fila do job (ex: 'rnds', 'cadunico')
   * @param payload Payload JSON com os dados do job
   * @param options Configurações adicionais como limite de retentativas, agendamento futuro e transação ativa (tx)
   */
  async execute(
    queueName: string,
    payload: Record<string, unknown>,
    options?: { maxRetries?: number; runAt?: Date; tx?: any }
  ): Promise<BackgroundJob> {
    if (!queueName || typeof queueName !== 'string') {
      throw new Error('O nome da fila (queueName) é obrigatório e deve ser uma string.');
    }

    if (!payload || typeof payload !== 'object') {
      throw new Error('O payload do job é obrigatório e deve ser um objeto.');
    }

    return await this.repo.enqueueJob(queueName, payload, options);
  }
}
