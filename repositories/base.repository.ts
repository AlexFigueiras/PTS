import { getDb, type Database } from '@/lib/db/client';
import { type TenantContext, assertTenantContext } from '@/lib/tenant-context';

/**
 * Base obrigatória para todo repository com dados multi-tenant.
 * Subclasses devem usar `this.ctx.tenantId` em todos os WHERE — nunca confiar
 * em parâmetros vindos da UI ou de fora.
 *
 * Repositories NÃO contêm regras de negócio nem validação — apenas queries.
 */
export abstract class BaseTenantRepository {
  protected get db(): Database { return getDb(); }
  protected readonly ctx: TenantContext;

  constructor(ctx: TenantContext) {
    assertTenantContext(ctx);
    this.ctx = ctx;
  }

  protected get tenantId(): string {
    return this.ctx.tenantId;
  }
}
