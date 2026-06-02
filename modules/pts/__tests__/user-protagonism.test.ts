import { describe, it, expect, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, sql } from 'drizzle-orm';
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
  encontros,
} from '@/lib/db/schema';
import * as schema from '@/lib/db/schema';
import crypto from 'crypto';
import { CaseStatusService } from '../services/case-status.service';
import { EncontroService } from '../services/encontro.service';
import { RecordActionService } from '../services/record-action.service';
import type { TenantContext } from '@/lib/tenant-context';

let activeTestTx: any = null;

// Mock do módulo de cliente do DB para direcionar tudo para a transação ativa do teste
vi.mock('@/lib/db/client', () => {
  return {
    getDb: () => {
      return activeTestTx;
    },
    withTransactionContext: async (userId: string, tenantId: string, callback: (tx: any) => Promise<any>) => {
      if (activeTestTx) {
        await activeTestTx.execute(
          sql`SELECT set_config('request.jwt.claims', json_build_object('sub', ${userId}::text)::text, true)`
        );
        await activeTestTx.execute(
          sql`SELECT set_config('request.current_tenant_id', ${tenantId}::text, true)`
        );
        return callback(activeTestTx);
      }
      throw new Error('activeTestTx not initialized in mock');
    }
  };
});

// Mock do AuditService para evitar falhas de RLS/transação fora do escopo do teste
vi.mock('@/modules/audit', () => {
  return {
    AuditService: class {
      record = vi.fn().mockResolvedValue(undefined);
    }
  };
});

describe('User Protagonism Integration Tests (Block 4)', () => {
  it('deve validar regras do Gate de Ativação do Plano, presenca do usuario em encontros e restrições de aceite do usuario em acoes', async () => {
    const pgClient = postgres(process.env.DATABASE_URL!, { max: 1 });
    const testDb = drizzle(pgClient, { schema });

    try {
      await testDb.transaction(async (globalTx) => {
        activeTestTx = globalTx;

        // Setup base data
        const tenantId = crypto.randomUUID();
        const patientId = crypto.randomUUID();
        const professionalId = crypto.randomUUID();
        const unitId = crypto.randomUUID();
        const caseId = crypto.randomUUID();
        const planId = crypto.randomUUID();

        // Insere tenant
        await globalTx.insert(tenants).values({
          id: tenantId,
          name: 'Município Bloco 4',
          slug: `municipio-bloco4-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        });

        // Insere profile
        await globalTx.insert(profiles).values({
          id: professionalId,
          email: `prof-${Date.now()}@test.com`,
          fullName: 'Prof Técnico Bloco 4',
          role: 'PROFESSIONAL',
          status: 'ACTIVE',
        });

        // Insere unidade
        await globalTx.insert(serviceUnits).values({
          id: unitId,
          tenantId,
          name: 'CAPS Bloco 4',
          type: 'HEALTH',
        });

        // Vínculos
        await globalTx.insert(tenantMembers).values({
          tenantId,
          userId: professionalId,
          role: 'professional',
        });

        await globalTx.insert(professionalsToUnits).values({
          professionalId,
          unitId,
          isPrimary: true,
        });

        // Paciente
        await globalTx.insert(patients).values({
          id: patientId,
          tenantId,
          fullName: 'Usuário Bloco 4',
          status: 'active',
        });

        // Caso inicial em acompanhamento
        await globalTx.insert(ptsCases).values({
          id: caseId,
          tenantId,
          patientId,
          status: 'acompanhamento',
        });

        // Plano inicial sem participacao registrada
        await globalTx.insert(ptsPlans).values({
          id: planId,
          tenantId,
          caseId,
          type: 'PTS',
          ownerId: professionalId,
        });

        // Ativa a sessão RLS do profissional
        await globalTx.execute(sql`SET LOCAL ROLE authenticated`);
        await globalTx.execute(
          sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: professionalId })}, true)`
        );
        await globalTx.execute(
          sql`SELECT set_config('request.current_tenant_id', ${tenantId}, true)`
        );

        const ctx: TenantContext = {
          tenantId,
          userId: professionalId,
          role: 'PROFESSIONAL',
          activeUnitId: unitId,
        };

        const caseStatusService = new CaseStatusService(ctx);
        const encontroService = new EncontroService(ctx);
        const recordActionService = new RecordActionService(ctx);

        // --- 1. Testes do Gate de Ativação do Plano ---
        // A. Tenta ativar sem participação preenchida -> Deve falhar com erro específico
        await expect(
          caseStatusService.transitionCaseStatus({ caseId, nextStatus: 'pts_ativo' })
        ).rejects.toThrow('PTS não existe sem o usuário. Registre a participação antes de ativar.');

        // B. Registra como dispensado sem justificativa -> Deve falhar
        await globalTx.execute(sql`RESET ROLE`);
        await globalTx.execute(sql`SELECT set_config('request.jwt.claims', NULL, true)`);
        await globalTx.execute(sql`SELECT set_config('request.current_tenant_id', NULL, true)`);

        await globalTx
          .update(ptsPlans)
          .set({ participacaoUsuario: 'dispensado_por_incapacidade', participacaoJustificativa: null })
          .where(eq(ptsPlans.id, planId));

        // Reativa RLS
        await globalTx.execute(sql`SET LOCAL ROLE authenticated`);
        await globalTx.execute(
          sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: professionalId })}, true)`
        );
        await globalTx.execute(
          sql`SELECT set_config('request.current_tenant_id', ${tenantId}, true)`
        );

        await expect(
          caseStatusService.transitionCaseStatus({ caseId, nextStatus: 'pts_ativo' })
        ).rejects.toThrow('PTS não existe sem o usuário. Registre a participação antes de ativar.');

        // C. Ativa com participação regular preenchida -> Deve funcionar
        await globalTx.execute(sql`RESET ROLE`);
        await globalTx.execute(sql`SELECT set_config('request.jwt.claims', NULL, true)`);
        await globalTx.execute(sql`SELECT set_config('request.current_tenant_id', NULL, true)`);

        await globalTx
          .update(ptsPlans)
          .set({ participacaoUsuario: 'presente', participacaoJustificativa: null })
          .where(eq(ptsPlans.id, planId));

        // Reativa RLS
        await globalTx.execute(sql`SET LOCAL ROLE authenticated`);
        await globalTx.execute(
          sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: professionalId })}, true)`
        );
        await globalTx.execute(
          sql`SELECT set_config('request.current_tenant_id', ${tenantId}, true)`
        );

        const activeCaseRow = await caseStatusService.transitionCaseStatus({ caseId, nextStatus: 'pts_ativo' });
        expect(activeCaseRow.status).toBe('pts_ativo');

        // Volta status para acompanhamento para continuar outros testes do plano
        await globalTx.execute(sql`RESET ROLE`);
        await globalTx.execute(sql`SELECT set_config('request.jwt.claims', NULL, true)`);
        await globalTx.execute(sql`SELECT set_config('request.current_tenant_id', NULL, true)`);
        await globalTx.update(ptsCases).set({ status: 'acompanhamento' }).where(eq(ptsCases.id, caseId));

        // Reativa RLS
        await globalTx.execute(sql`SET LOCAL ROLE authenticated`);
        await globalTx.execute(
          sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: professionalId })}, true)`
        );
        await globalTx.execute(
          sql`SELECT set_config('request.current_tenant_id', ${tenantId}, true)`
        );

        // --- 2. Testes de Encontros ---
        // A. Reunião de PTS sem usuário presente -> Deve falhar
        await expect(
          encontroService.createEncontro({
            planoId: planId,
            tipo: 'reuniao_pts',
            data: new Date(),
            participantes: [professionalId],
            usuarioPresente: false,
          })
        ).rejects.toThrow('Reunião de PTS exige a presença do usuário.');

        // B. Reunião de PTS com usuário presente -> Deve funcionar
        const encontroPTS = await encontroService.createEncontro({
          planoId: planId,
          tipo: 'reuniao_pts',
          data: new Date(),
          participantes: [professionalId],
          usuarioPresente: true,
        });
        expect(encontroPTS.id).toBeDefined();
        expect(encontroPTS.tipo).toBe('reuniao_pts');
        expect(encontroPTS.usuarioPresente).toBe(true);

        // C. Articulação de rede com cidadão ausente -> Deve funcionar
        const encontroRede = await encontroService.createEncontro({
          planoId: planId,
          tipo: 'articulacao_rede',
          data: new Date(),
          participantes: [professionalId],
          usuarioPresente: false,
        });
        expect(encontroRede.id).toBeDefined();
        expect(encontroRede.tipo).toBe('articulacao_rede');
        expect(encontroRede.usuarioPresente).toBe(false);

        // --- 3. Testes de Aceite do Usuário nas Ações ---
        // A. Cria ação com aceiteUsuario = 'recusa' ou 'repactuar' -> Deve ir para 'bloqueada' e conter 'Repactuação pendente' nas notas
        const actionRefused = await recordActionService.createAction({
          planId,
          responsibleUnitId: unitId,
          assignedProfessionalId: professionalId,
          deadline: new Date(Date.now() + 86400000),
          description: 'Ação com recusa do usuário',
          dataInicio: '2026-06-02',
          prazofim: '2026-07-02',
          frequenciaTipo: 'semanal',
          dataProximaReavaliacao: '2026-07-02',
          aceiteUsuario: 'recusa',
        });
        expect(actionRefused.status).toBe('bloqueada');
        expect(actionRefused.evolutionNotes).toContain('Repactuação pendente');

        // B. Tenta transicionar ação bloqueada com recusa para 'pactuada' ou 'em_andamento' -> Deve falhar
        await expect(
          recordActionService.transitionAction({
            actionId: actionRefused.id,
            nextStatus: 'em_andamento',
          })
        ).rejects.toThrow('Ação bloqueada: o aceite do usuário é recusa ou pendente de repactuação.');

        await expect(
          recordActionService.transitionAction({
            actionId: actionRefused.id,
            nextStatus: 'pactuada',
          })
        ).rejects.toThrow('Ação bloqueada: o aceite do usuário é recusa ou pendente de repactuação.');

        // Força rollback para manter banco limpo
        throw new Error('ROLLBACK_INTEGRATION_TESTS');
      });
    } catch (err: any) {
      if (err.message !== 'ROLLBACK_INTEGRATION_TESTS') {
        throw err;
      }
    } finally {
      await pgClient.end();
    }
  });
});
