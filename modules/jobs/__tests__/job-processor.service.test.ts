import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobProcessorService } from '../services/job-processor.service';
import { BackgroundJobsRepository } from '../repositories/background-jobs.repository';
import { getDb } from '@/lib/db/client';
import { RndsQueueHandler } from '@/modules/rnds/handlers/rnds-queue.handler';
import { RndsClinicalValidationError } from '@/modules/rnds/services/rnds.service';
import { RndsInfrastructureError } from '@/modules/rnds/infra/rnds-client';

vi.mock('@/lib/db/client', () => ({
  getDb: vi.fn(),
}));

vi.mock('../repositories/background-jobs.repository', () => ({
  BackgroundJobsRepository: {
    pollNextJobForExecution: vi.fn(),
    updateJobStatusGlobal: vi.fn(),
  },
}));

vi.mock('@/modules/rnds/handlers/rnds-queue.handler', () => ({
  RndsQueueHandler: {
    handle: vi.fn(),
  },
}));

describe('JobProcessorService - Engine de Fila e Retentativas', () => {
  let processor: JobProcessorService;
  const mockDb = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockReturnValue(mockDb);
    processor = new JobProcessorService();
  });

  it('deve retornar processed: false se não houver jobs pendentes na fila', async () => {
    vi.mocked(BackgroundJobsRepository.pollNextJobForExecution).mockResolvedValueOnce(null);

    const result = await processor.processNextJob();

    expect(result.processed).toBe(false);
    expect(BackgroundJobsRepository.pollNextJobForExecution).toHaveBeenCalledTimes(1);
    expect(RndsQueueHandler.handle).not.toHaveBeenCalled();
  });

  it('deve processar um job com sucesso e marcá-lo como completed', async () => {
    const mockJob = {
      id: 'job-123',
      tenantId: 'tenant-abc',
      queueName: 'rnds',
      payload: { test: 'data' },
      status: 'queued',
      retryCount: 0,
      maxRetries: 5,
      runAt: new Date(),
      errorLog: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(BackgroundJobsRepository.pollNextJobForExecution).mockResolvedValueOnce(mockJob);
    vi.mocked(RndsQueueHandler.handle).mockResolvedValueOnce();

    const result = await processor.processNextJob();

    expect(result).toEqual({
      processed: true,
      jobId: 'job-123',
      queueName: 'rnds',
      status: 'completed',
    });

    expect(RndsQueueHandler.handle).toHaveBeenCalledWith({ test: 'data' }, { tenantId: 'tenant-abc' });
    expect(BackgroundJobsRepository.updateJobStatusGlobal).toHaveBeenCalledWith(
      mockDb,
      'job-123',
      'completed',
      expect.objectContaining({ errorLog: null, processedAt: expect.any(Date) })
    );
  });

  it('deve tratar RndsClinicalValidationError como fatal e enviar o job diretamente para dead_letter', async () => {
    const mockJob = {
      id: 'job-fatal',
      tenantId: 'tenant-abc',
      queueName: 'rnds',
      payload: { test: 'clinical-data' },
      status: 'queued',
      retryCount: 0,
      maxRetries: 5,
      runAt: new Date(),
      errorLog: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const clinicalError = new RndsClinicalValidationError(
      'Erro de validação clínica na RNDS: CPF do participante diverge',
      { resourceType: 'OperationOutcome' }
    );

    vi.mocked(BackgroundJobsRepository.pollNextJobForExecution).mockResolvedValueOnce(mockJob);
    vi.mocked(RndsQueueHandler.handle).mockRejectedValueOnce(clinicalError);

    const result = await processor.processNextJob();

    expect(result).toEqual({
      processed: true,
      jobId: 'job-fatal',
      queueName: 'rnds',
      status: 'dead_letter',
      error: 'Erro de validação clínica na RNDS: CPF do participante diverge',
    });

    expect(BackgroundJobsRepository.updateJobStatusGlobal).toHaveBeenCalledWith(
      mockDb,
      'job-fatal',
      'dead_letter',
      expect.objectContaining({
        errorLog: expect.stringContaining('RndsClinicalValidationError'),
        processedAt: expect.any(Date),
      })
    );
  });

  it('deve tratar RndsInfrastructureError como retentável, incrementando o retryCount e reagendando com backoff', async () => {
    const mockJob = {
      id: 'job-infra',
      tenantId: 'tenant-abc',
      queueName: 'rnds',
      payload: { test: 'network-data' },
      status: 'queued',
      retryCount: 1, // Já falhou uma vez
      maxRetries: 5,
      runAt: new Date(),
      errorLog: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const infraError = new RndsInfrastructureError('Erro de handshake TLS ou timeout de rede');

    vi.mocked(BackgroundJobsRepository.pollNextJobForExecution).mockResolvedValueOnce(mockJob);
    vi.mocked(RndsQueueHandler.handle).mockRejectedValueOnce(infraError);

    const result = await processor.processNextJob();

    expect(result.processed).toBe(true);
    expect(result.status).toBe('queued');
    expect(result.error).toContain('Erro de handshake TLS ou timeout de rede');

    expect(BackgroundJobsRepository.updateJobStatusGlobal).toHaveBeenCalledWith(
      mockDb,
      'job-infra',
      'queued',
      expect.objectContaining({
        retryCount: 2,
        runAt: expect.any(Date),
        errorLog: expect.stringContaining('RndsInfrastructureError'),
      })
    );

    // Valida que o próximo agendamento (runAt) foi calculado para o futuro
    const updateArgs = vi.mocked(BackgroundJobsRepository.updateJobStatusGlobal).mock.calls[0][3] as any;
    expect(updateArgs.runAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('deve mover o job para dead_letter caso o limite de retentativas maxRetries seja esgotado', async () => {
    const mockJob = {
      id: 'job-exhausted',
      tenantId: 'tenant-abc',
      queueName: 'rnds',
      payload: { test: 'exhausted-data' },
      status: 'queued',
      retryCount: 4, // Quarta falha (indo para a 5ª tentativa, que é o maxRetries)
      maxRetries: 5,
      runAt: new Date(),
      errorLog: 'Previous errors',
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const infraError = new RndsInfrastructureError('Instabilidade persistente de rede');

    vi.mocked(BackgroundJobsRepository.pollNextJobForExecution).mockResolvedValueOnce(mockJob);
    vi.mocked(RndsQueueHandler.handle).mockRejectedValueOnce(infraError);

    const result = await processor.processNextJob();

    expect(result.processed).toBe(true);
    expect(result.status).toBe('dead_letter');
    expect(result.error).toContain('Esgotado limite de retentativas');

    expect(BackgroundJobsRepository.updateJobStatusGlobal).toHaveBeenCalledWith(
      mockDb,
      'job-exhausted',
      'dead_letter',
      expect.objectContaining({
        retryCount: 5,
        errorLog: expect.stringContaining('[FATAL] Esgotado o limite máximo de 5 retentativas.'),
        processedAt: expect.any(Date),
      })
    );
  });
});
