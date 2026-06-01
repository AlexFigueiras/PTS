import React from 'react';
import { redirect } from 'next/navigation';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { getDb, withTransactionContext } from '@/lib/db/client';
import { patients, serviceUnits, ptsCases } from '@/lib/db/schema';
import { PtsRepository } from '@/modules/pts/pts.repository';
import { decrypt } from '@/lib/crypto/field-cipher';
import { TaskPanel, type EnrichedTask } from '@/components/pts/task-panel';
import type { TaskStatus } from '@/modules/pts/pts.dto';
import { initializeCaseFormAction } from '@/modules/pts/actions';
import { Inbox, AlertCircle, Building2, HelpCircle } from 'lucide-react';

interface TriagemPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
    pageSize?: string;
    tab?: string;
  }>;
}

export default async function TriagemPage({ searchParams }: TriagemPageProps) {
  // Await searchParams conforme especificação estrita do Next.js 16
  const params = await searchParams;
  
  const ctx = await getActiveTenantContext();
  if (!ctx) {
    redirect('/login');
  }

  // Se o profissional não tiver unidade ativa selecionada, exibe aviso premium
  if (!ctx.activeUnitId) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-16 text-center animate-in fade-in duration-500">
        <div className="rounded-[2.5rem] border border-amber-200 bg-amber-500/[0.02] p-12 md:p-16 shadow-diffusion flex flex-col items-center justify-center">
          <div className="size-16 rounded-[1.25rem] bg-amber-500/10 text-amber-600 flex items-center justify-center mb-6">
            <Building2 size={32} />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider text-slate-800">
            Unidade Ativa Não Selecionada
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-3 max-w-md leading-relaxed">
            Para gerenciar a fila de triagem e os fluxos de encaminhamentos intersetoriais, você precisa selecionar a sua unidade de atuação ativa no seletor de unidade localizado no cabeçalho do sistema.
          </p>
        </div>
      </div>
    );
  }

  // Sanitização dos filtros da URL
  const statusFilter = (params.status || 'requested') as TaskStatus;
  const currentPage = Math.max(1, parseInt(params.page || '1'));
  const pageSize = Math.max(5, parseInt(params.pageSize || '10'));
  const activeTab = params.tab || 'sinalizacoes';

  let activeUnit;
  let enrichedTasks: EnrichedTask[] = [];
  let total = 0;
  let totalPages = 1;
  let errorMsg = null;
  let observationCases: any[] = [];

  try {
    const result = await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
      // 1. Busca o nome da unidade ativa para exibir um cabeçalho totalmente personalizado
      const unitRow = await tx
        .select({ name: serviceUnits.name, type: serviceUnits.type })
        .from(serviceUnits)
        .where(and(eq(serviceUnits.id, ctx.activeUnitId!), eq(serviceUnits.tenantId, ctx.tenantId)))
        .limit(1)
        .then((r: any[]) => r[0]);

      // 2. Busca a fila bruta da unidade ativa usando o repositório transacional
      const repo = new PtsRepository(ctx, tx);
      const rawTasksResult = await repo.listTasksByTargetUnit(ctx.activeUnitId!, {
        status: statusFilter,
        page: currentPage,
        pageSize: pageSize,
      });

      // 3. DTO + MAPPER: Enriquece os dados brutos de tarefas buscando pacientes e unidades em lote
      let tasks: EnrichedTask[] = [];
      if (rawTasksResult.data.length > 0) {
        const patientIds = Array.from(new Set(rawTasksResult.data.map((t) => t.patientId)));
        const sourceUnitIds = Array.from(new Set(rawTasksResult.data.map((t) => t.sourceUnitId)));

        const [patientRows, unitRows] = await Promise.all([
          patientIds.length > 0
            ? tx
                .select({ id: patients.id, fullName: patients.fullName, cpf: patients.cpf })
                .from(patients)
                .where(and(eq(patients.tenantId, ctx.tenantId), inArray(patients.id, patientIds)))
            : Promise.resolve([]),
          sourceUnitIds.length > 0
            ? tx
                .select({ id: serviceUnits.id, name: serviceUnits.name, type: serviceUnits.type })
                .from(serviceUnits)
                .where(and(eq(serviceUnits.tenantId, ctx.tenantId), inArray(serviceUnits.id, sourceUnitIds)))
            : Promise.resolve([]),
        ]);

        tasks = rawTasksResult.data.map((task) => {
          const patient = patientRows.find((p: any) => p.id === task.patientId);
          const unit = unitRows.find((u: any) => u.id === task.sourceUnitId);
          return {
            id: task.id,
            patientId: task.patientId,
            patientName: patient?.fullName || 'Cidadão Desconhecido',
            patientCpf: decrypt(patient?.cpf) || 'Sem documento',
            status: task.status,
            priority: task.priority,
            description: task.description,
            sourceUnitId: task.sourceUnitId,
            sourceUnitName: unit?.name || 'Unidade não identificada',
            sourceUnitType: unit?.type || 'OUTRA',
            targetUnitId: task.targetUnitId,
            requesterId: task.requesterId,
            ownerId: task.ownerId,
            history: task.history || [],
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          };
        });
      }

      // 4. Busca os candidatos em observação (case_status = 'observacao')
      const casesInObservation = await tx
        .select({
          id: ptsCases.id,
          patientId: ptsCases.patientId,
          status: ptsCases.status,
          createdAt: ptsCases.createdAt,
          patientName: patients.fullName,
          patientCpf: patients.cpf,
        })
        .from(ptsCases)
        .innerJoin(patients, eq(patients.id, ptsCases.patientId))
        .where(and(eq(ptsCases.status, 'observacao'), eq(ptsCases.tenantId, ctx.tenantId)))
        .orderBy(desc(ptsCases.createdAt));

      return {
        activeUnit: unitRow,
        enrichedTasks: tasks,
        total: rawTasksResult.total,
        totalPages: rawTasksResult.totalPages,
        observationCases: casesInObservation,
      };
    });

    activeUnit = result.activeUnit;
    enrichedTasks = result.enrichedTasks;
    total = result.total;
    totalPages = result.totalPages;
    observationCases = result.observationCases;
  } catch (err: any) {
    errorMsg = err?.message || 'Erro ao carregar a fila de entrada da unidade.';
  }

  if (errorMsg) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-16 text-center">
        <div className="rounded-[2.5rem] border border-rose-200 bg-rose-500/[0.02] p-12 shadow-sm flex flex-col items-center justify-center">
          <div className="size-16 rounded-[1.25rem] bg-rose-500/10 text-rose-600 flex items-center justify-center mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider text-slate-800">
            Erro ao Carregar Fila
          </h2>
          <p className="text-sm font-medium text-rose-600/70 mt-3">
            {errorMsg}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 space-y-10">
      
      {/* Cabeçalho da Rota de Triagem */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/60">
            Fila de Entrada & Acolhimento
          </p>
          <h1 className="text-3xl font-black uppercase italic tracking-tight text-slate-900 mt-1">
            Triagem Intersetorial
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center gap-1.5">
            <Building2 size={13} className="text-primary/70" />
            Unidade Ativa: <span className="text-slate-600 font-extrabold">{activeUnit?.name || 'Carregando...'}</span>
            <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
              {activeUnit?.type}
            </span>
          </p>
        </div>
      </div>

      {/* Abas de Triagem */}
      <div className="flex gap-4 border-b border-slate-100 pb-4">
        <a
          href={`/triagem?tab=sinalizacoes&status=${statusFilter}`}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'sinalizacoes'
              ? 'bg-primary text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Sinalizações / Tarefas ({total})
        </a>
        <a
          href={`/triagem?tab=observacao&status=${statusFilter}`}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'observacao'
              ? 'bg-primary text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Candidatos em Observação ({observationCases.length})
        </a>
      </div>

      {/* Exibição da Aba Ativa */}
      {activeTab === 'observacao' ? (
        <div className="space-y-6">
          {observationCases.length === 0 ? (
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-12 text-center shadow-sm flex flex-col items-center justify-center">
              <div className="size-16 rounded-[1.25rem] bg-slate-50 text-slate-400 flex items-center justify-center mb-6">
                <Inbox size={32} />
              </div>
              <h2 className="text-base font-black uppercase tracking-wider text-slate-700">
                Nenhum candidato em observação
              </h2>
              <p className="text-xs font-medium text-slate-400 mt-2 max-w-sm">
                Não há cidadãos em situação de observação pendente de acolhimento nesta unidade.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {observationCases.map((c) => (
                <div key={c.id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between gap-6 hover:shadow-md transition-all">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                          Em Observação
                        </span>
                        <h3 className="text-base font-bold text-slate-800 mt-2">
                          {c.patientName}
                        </h3>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      CPF: <span className="text-slate-600">{decrypt(c.patientCpf) || 'Não informado'}</span>
                    </p>
                    <p className="text-[10px] font-medium text-slate-400">
                      Identificado em: {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center justify-end">
                    <form action={initializeCaseFormAction}>
                      <input type="hidden" name="patientId" value={c.patientId} />
                      <button
                        type="submit"
                        className="rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition hover:scale-105 active:scale-95"
                      >
                        Assumir Caso
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <TaskPanel
          tasks={enrichedTasks}
          totalTasks={total}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          activeStatusFilter={statusFilter}
        />
      )}

    </div>
  );
}
