import { type TenantContext } from '@/lib/tenant-context';
import { RndsService } from '../services/rnds.service';
import { RacDto } from '../dto/rac.dto';

export class RndsQueueHandler {
  /**
   * Processa o envio de um Registro de Atendimento Clínico (RAC) para a RNDS.
   *
   * @param payload Os dados brutos do job enfileirado, compatíveis com RacDto
   * @param ctx O contexto transacional do tenant ativo sob o qual o job deve executar
   */
  static async handle(payload: Record<string, unknown>, ctx: TenantContext): Promise<void> {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload inválido para o envio de RAC na fila RNDS.');
    }

    // Instancia o RndsService passando o contexto do tenant do job
    const rndsService = new RndsService(ctx);

    // O payload do job é exatamente o RacDto mapeado para envio
    await rndsService.sendRac(payload as unknown as RacDto);
  }
}
