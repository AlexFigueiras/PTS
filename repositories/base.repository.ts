import { type Database } from '@/lib/db/client';
import { type TenantContext, assertTenantContext } from '@/lib/tenant-context';

/**
 * Base obrigatória para todo repository com dados multi-tenant.
 * Subclasses devem usar `this.ctx.tenantId` em todos os WHERE — nunca confiar
 * em parâmetros vindos da UI ou de fora.
 *
 * Repositories NÃO contêm regras de negócio nem validação — apenas queries.
 */
export abstract class BaseTenantRepository {
  protected get db(): Database {
    throw new Error(
      'Direct database access outside an explicit transaction context (tx) is disabled for this repository. ' +
      'Please instantiate the repository passing a tx transaction context inside withTransactionContext.'
    );
  }
  protected readonly ctx: TenantContext;

  constructor(ctx: TenantContext) {
    assertTenantContext(ctx);
    this.ctx = ctx;
  }

  protected get tenantId(): string {
    return this.ctx.tenantId;
  }
}

