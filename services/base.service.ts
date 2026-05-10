import { type TenantContext, assertTenantContext } from '@/lib/tenant-context';

/**
 * Base de serviços de domínio.
 * Serviços orquestram repositories, aplicam regras de negócio e disparam
 * auditoria. Nunca conhecem detalhes de UI nem fazem SQL direto.
 */
export abstract class BaseService {
  protected readonly ctx: TenantContext;

  constructor(ctx: TenantContext) {
    assertTenantContext(ctx);
    this.ctx = ctx;
  }
}
