import { and, lt, isNotNull, eq } from 'drizzle-orm';
import { ptsResponses, ptsEvolutions, intersectoralTasks } from '@/lib/db/schema';

export class ExpurgoJobService {
  constructor(private readonly tx: any) {}

  async runExpurgo(tenantId: string): Promise<{
    expungedResponses: number;
    expungedEvolutions: number;
    expungedTasks: number;
  }> {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 30); // 30 dias de corte

    // 1. Expurgo em pts_responses
    const deletedResponses = await this.tx
      .delete(ptsResponses)
      .where(
        and(
          eq(ptsResponses.tenantId, tenantId),
          isNotNull(ptsResponses.deletedAt),
          lt(ptsResponses.deletedAt, limitDate)
        )
      )
      .returning({ id: ptsResponses.id });

    // 2. Expurgo em pts_evolutions
    const deletedEvolutions = await this.tx
      .delete(ptsEvolutions)
      .where(
        and(
          eq(ptsEvolutions.tenantId, tenantId),
          isNotNull(ptsEvolutions.deletedAt),
          lt(ptsEvolutions.deletedAt, limitDate)
        )
      )
      .returning({ id: ptsEvolutions.id });

    // 3. Expurgo em intersectoral_tasks
    const deletedTasks = await this.tx
      .delete(intersectoralTasks)
      .where(
        and(
          eq(intersectoralTasks.tenantId, tenantId),
          isNotNull(intersectoralTasks.deletedAt),
          lt(intersectoralTasks.deletedAt, limitDate)
        )
      )
      .returning({ id: intersectoralTasks.id });

    return {
      expungedResponses: deletedResponses.length,
      expungedEvolutions: deletedEvolutions.length,
      expungedTasks: deletedTasks.length,
    };
  }
}
