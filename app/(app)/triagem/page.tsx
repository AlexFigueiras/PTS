import React from 'react';
import { redirect } from 'next/navigation';
import { eq, and, inArray } from 'drizzle-orm';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { getDb } from '@/lib/db/client';
import { patients, serviceUnits } from '@/lib/db/schema';
import { getTargetUnitQueueAction } from '@/modules/pts/actions';
import { TaskPanel, type EnrichedTask } from '@/components/pts/task-panel';
import type { TaskStatus } from '@/modules/pts/pts.dto';
import { Inbox, AlertCircle, Building2, HelpCircle } from 'lucide-react';

interface TriagemPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
    pageSize?: string;
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

  // Busca o nome da unidade ativa para exibir um cabeçalho totalmente personalizado
  const activeUnit = await getDb()
    .select({ name: serviceUnits.name, type: serviceUnits.type })
    .from(serviceUnits)
    .where(and(eq(serviceUnits.id, ctx.activeUnitId), eq(serviceUnits.tenantId, ctx.tenantId)))
    .limit(1)
    .then((r) => r[0]);

  // Sanitização dos filtros da URL
  const statusFilter = (params.status || 'requested') as TaskStatus;
  const currentPage = Math.max(1, parseInt(params.page || '1'));
  const pageSize = Math.max(5, parseInt(params.pageSize || '10'));

  // Dispara a Server Action para obter a fila bruta da unidade ativa
  const queueResult = await getTargetUnitQueueAction({
    status: statusFilter,
    page: currentPage,
    pageSize: pageSize,
  });

  if (!queueResult.success || !queueResult.data) {
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
            {queueResult.error || 'Não foi possível carregar a fila de encaminhamentos da unidade.'}
          </p>
        </div>
      </div>
    );
  }

  const { items: rawTasks, total, totalPages } = queueResult.data;

  // DTO + MAPPER: Enriquece os dados brutos de tarefas buscando pacientes e unidades em lote
  let enrichedTasks: EnrichedTask[] = [];

  if (rawTasks.length > 0) {
    const patientIds = Array.from(new Set(rawTasks.map((t) => t.patientId)));
    const sourceUnitIds = Array.from(new Set(rawTasks.map((t) => t.sourceUnitId)));

    const [patientRows, unitRows] = await Promise.all([
      patientIds.length > 0
        ? getDb()
            .select({ id: patients.id, fullName: patients.fullName, cpf: patients.cpf })
            .from(patients)
            .where(and(eq(patients.tenantId, ctx.tenantId), inArray(patients.id, patientIds)))
        : Promise.resolve([]),
      sourceUnitIds.length > 0
        ? getDb()
            .select({ id: serviceUnits.id, name: serviceUnits.name, type: serviceUnits.type })
            .from(serviceUnits)
            .where(and(eq(serviceUnits.tenantId, ctx.tenantId), inArray(serviceUnits.id, sourceUnitIds)))
        : Promise.resolve([]),
    ]);

    enrichedTasks = rawTasks.map((task) => {
      const patient = patientRows.find((p) => p.id === task.patientId);
      const unit = unitRows.find((u) => u.id === task.sourceUnitId);
      return {
        id: task.id,
        patientId: task.patientId,
        patientName: patient?.fullName || 'Cidadão Desconhecido',
        patientCpf: patient?.cpf || 'Sem documento',
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

      {/* Painel do Acolhimento & Máquina de Estados */}
      <TaskPanel
        tasks={enrichedTasks}
        totalTasks={total}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        activeStatusFilter={statusFilter}
      />

    </div>
  );
}
