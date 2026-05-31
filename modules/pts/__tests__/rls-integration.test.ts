import { describe, it, expect } from 'vitest';
import { getDb } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import {
  tenants,
  profiles,
  tenantMembers,
  serviceUnits,
  professionalsToUnits,
  patients,
  ptsCases,
  ptsPlans,
  ptsActions,
  ptsSignals,
} from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

describe('RLS Integration - Cross-Unit Access', () => {
  it('deve permitir acesso a caso de outra unidade quando há sinalização ativa', async () => {
    const db = getDb();

    // Executa tudo dentro de uma transação global para garantir limpeza por rollback
    try {
      await db.transaction(async (globalTx) => {
        // 1. Gerar UUIDs únicos e limpos
        const tenantId = crypto.randomUUID();
        const patientId = crypto.randomUUID();
        
        const profAId = crypto.randomUUID();
        const profBId = crypto.randomUUID();
        
        const unitAId = crypto.randomUUID();
        const unitBId = crypto.randomUUID();

        const caseId = crypto.randomUUID();
        const planId = crypto.randomUUID();
        const actionId = crypto.randomUUID();
        const signalId = crypto.randomUUID();

        // 2. Setup dos dados no banco (bypassing RLS via globalTx de superusuário)
        // Criar Tenant
        await globalTx.insert(tenants).values({
          id: tenantId,
          name: 'Município de Teste RLS',
          slug: `municipio-teste-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        });

        // Criar Profissionais
        await globalTx.insert(profiles).values([
          { id: profAId, email: `profa-${Date.now()}@test.com`, fullName: 'Profissional A', role: 'PROFESSIONAL', status: 'ACTIVE' },
          { id: profBId, email: `profb-${Date.now()}@test.com`, fullName: 'Profissional B', role: 'PROFESSIONAL', status: 'ACTIVE' },
        ]);

        // Criar Unidades
        await globalTx.insert(serviceUnits).values([
          { id: unitAId, tenantId, name: 'CAPS Unidade A', type: 'HEALTH' },
          { id: unitBId, tenantId, name: 'CRAS Unidade B', type: 'SOCIAL' },
        ]);

        // Associar Profissionais aos Tenants
        await globalTx.insert(tenantMembers).values([
          { tenantId, userId: profAId, role: 'professional' },
          { tenantId, userId: profBId, role: 'professional' },
        ]);

        // Associar Profissionais às Unidades
        await globalTx.insert(professionalsToUnits).values([
          { professionalId: profAId, unitId: unitAId, isPrimary: true },
          { professionalId: profBId, unitId: unitBId, isPrimary: true },
        ]);

        // Criar Cidadão
        await globalTx.insert(patients).values({
          id: patientId,
          tenantId,
          fullName: 'Cidadão de Teste RLS',
          status: 'active',
        });

        // Criar Caso
        await globalTx.insert(ptsCases).values({
          id: caseId,
          tenantId,
          patientId,
          status: 'radar',
        });

        // Criar Plano pertencente ao Profissional A (RT do CAPS A)
        await globalTx.insert(ptsPlans).values({
          id: planId,
          tenantId,
          caseId,
          type: 'PTS',
          ownerId: profAId,
        });

        // Criar Ação pactuada no CAPS A
        await globalTx.insert(ptsActions).values({
          id: actionId,
          tenantId,
          planId,
          responsibleUnitId: unitAId,
          assignedProfessionalId: profAId,
          deadline: new Date(Date.now() + 86400000),
          status: 'pactuada',
          description: 'Ação crítica da Unidade A',
        });

        // 3. Teste RLS Sem Sinalização: Profissional B não deve conseguir ler o caso
        // Usamos set_config manual na transação local para simular a sessão do Profissional B
        await globalTx.execute(sql`SET LOCAL ROLE authenticated`);
        await globalTx.execute(
          sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: profBId })}, true)`
        );
        await globalTx.execute(
          sql`SELECT set_config('request.current_tenant_id', ${tenantId}, true)`
        );

        const casesBeforeSignal = await globalTx
          .select()
          .from(ptsCases)
          .where(eq(ptsCases.id, caseId));
        
        expect(casesBeforeSignal.length).toBe(0); // RLS Bloqueou!

        // 4. Criar Sinalização Ativa direcionada à Unidade B (como superusuário)
        // Para isso, limpamos a sessão RLS temporariamente
        await globalTx.execute(sql`RESET ROLE`);
        await globalTx.execute(sql`SELECT set_config('request.jwt.claims', NULL, true)`);
        await globalTx.execute(sql`SELECT set_config('request.current_tenant_id', NULL, true)`);

        await globalTx.insert(ptsSignals).values({
          id: signalId,
          tenantId,
          caseId,
          destinationComponent: 'SOCIAL',
          destinationUnitId: unitBId,
          priority: 'imediata',
          status: 'recebida', // Sinalização ativa!
          abstractReason: 'Trâmite intersetorial para CRAS B',
        });

        // 5. Teste RLS Com Sinalização: Profissional B agora DEVE conseguir ler o caso!
        await globalTx.execute(sql`SET LOCAL ROLE authenticated`);
        await globalTx.execute(
          sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: profBId })}, true)`
        );
        await globalTx.execute(
          sql`SELECT set_config('request.current_tenant_id', ${tenantId}, true)`
        );

        const casesAfterSignalResult = await globalTx
          .select()
          .from(ptsCases)
          .where(eq(ptsCases.id, caseId));
        
        expect(casesAfterSignalResult.length).toBe(1); // RLS Liberou com trâmite ativo!
        expect(casesAfterSignalResult[0].id).toBe(caseId);

        // Força rollback intencional para manter o banco 100% limpo
        throw new Error('ROLLBACK_INTENCIONAL');
      });
    } catch (err: any) {
      if (err.message !== 'ROLLBACK_INTENCIONAL') {
        throw err;
      }
    }
  });
});
