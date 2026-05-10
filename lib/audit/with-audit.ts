import { AuditService } from '@/modules/audit';
import type { AuditAction } from '@/modules/audit';
import type { TenantContext } from '@/lib/tenant-context';
import { getLogger } from '@/lib/logger';

/**
 * Auditoria DECLARATIVA — sem event bus, sem hooks de banco.
 *
 * Envelopa uma função de domínio (Service method ou Server Action) e grava
 * um `AuditLog` automaticamente em sucesso. Em erro, registra o evento como
 * `<action>.failed` e re-lança para o caller.
 *
 * Quando usar:
 *   - operações que MUDAM estado clínico (create/update/delete em pacientes,
 *     prontuários, profissionais, PTS).
 *   - operações sensíveis (export, troca de role, login/logout).
 *
 * Quando NÃO usar:
 *   - leituras simples (use audit manual no service só se necessário).
 *   - utilitários internos sem efeito de domínio.
 *
 * Anti event-bus: a auditoria fica na borda do service/action, sem desacoplar
 * via fila. Se um dia houver volume que justifique fila, troca-se a impl deste
 * arquivo — a API pública (`withAudit`) permanece igual.
 */

export type AuditDescriptor<TInput, TOutput> = {
  action: AuditAction;
  entityType: string;
  /** Como extrair o entityId do input/output. */
  entityId?: (input: TInput, output: TOutput | undefined) => string | undefined;
  /** Metadados extra a registrar (campos sensíveis devem ser sanitizados aqui). */
  metadata?: (input: TInput, output: TOutput | undefined) => Record<string, unknown> | undefined;
  /** Se true, também registra falhas com action `<action>.failed`. Default: true. */
  auditFailures?: boolean;
};

export function withAudit<TInput, TOutput>(
  descriptor: AuditDescriptor<TInput, TOutput>,
  fn: (ctx: TenantContext, input: TInput) => Promise<TOutput>,
): (ctx: TenantContext, input: TInput) => Promise<TOutput> {
  const { auditFailures = true } = descriptor;

  return async (ctx, input) => {
    let output: TOutput | undefined;
    try {
      output = await fn(ctx, input);
      const audit = new AuditService(ctx);
      await audit.record({
        action: descriptor.action,
        entityType: descriptor.entityType,
        entityId: descriptor.entityId?.(input, output),
        metadata: descriptor.metadata?.(input, output),
      });
      return output;
    } catch (err) {
      if (auditFailures) {
        try {
          const audit = new AuditService(ctx);
          await audit.record({
            action: descriptor.action,
            entityType: descriptor.entityType,
            entityId: descriptor.entityId?.(input, output),
            metadata: {
              ...(descriptor.metadata?.(input, output) ?? {}),
              failed: true,
              error: err instanceof Error ? err.message : String(err),
            },
          });
        } catch (auditErr) {
          getLogger().error({ err: auditErr }, 'falha ao registrar audit de falha');
        }
      }
      throw err;
    }
  };
}
