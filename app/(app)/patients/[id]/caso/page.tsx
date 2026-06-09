import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { ArrowLeft, AlertTriangle, Activity, ClipboardList, Radio, BarChart2, FileText } from 'lucide-react';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { hasTier, hasRole } from '@/lib/auth/authorization';
import { withTransactionContext } from '@/lib/db/client';
import { ptsResponses, serviceUnits, tenantMembers, profiles } from '@/lib/db/schema';
import { GetPatientService } from '@/modules/patients';
import { PtsCaseRepository } from '@/modules/pts/repositories/pts-case.repository';
import { PtsPlanRepository } from '@/modules/pts/repositories/pts-plan.repository';
import { PtsActionRepository } from '@/modules/pts/repositories/pts-action.repository';
import { PtsSignalRepository } from '@/modules/pts/repositories/pts-signal.repository';
import { PtsEncontroRepository } from '@/modules/pts/repositories/pts-encontro.repository';
import { DimensionCards } from '@/components/pts/dimension-cards';
import { DerivedDimensionCards } from '@/components/pts/derived-dimension-cards';
import { ActionList } from '@/components/pts/action-list';
import { SignalList } from '@/components/pts/signal-list';
import { ManualDimensionForm } from '@/components/pts/demo/manual-dimension-form';
import { IntensityPanel } from '@/components/pts/intensity-panel';
import { ParticipationAndEncontros } from '@/components/pts/participation-and-encontros';
import { ReassignRtControl } from '@/components/pts/reassign-rt-control';
import { PtsDimensionRepository } from '@/modules/pts/repositories/pts-dimension.repository';
import { cn } from '@/lib/utils';
import {
  CASE_STATUS_LABELS,
  calculateDomainAverages,
  DIMENSIONS,
  type CaseStatus,
  type Dimension,
  type NivelIntensidade,
} from '@pts/domain';

type Props = { params: Promise<{ id: string }> };

/* ------------------------------------------------------------------ */
/*  Status badge visual                                                */
/* ------------------------------------------------------------------ */

const CASE_STATUS_COLORS: Partial<Record<CaseStatus, string>> = {
  radar: 'bg-slate-100 text-slate-700 border-slate-200',
  observacao: 'bg-amber-100 text-amber-700 border-amber-200',
  acompanhamento: 'bg-sky-100 text-sky-700 border-sky-200',
  pts_ativo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pia_ativo: 'bg-violet-100 text-violet-700 border-violet-200',
  alta: 'bg-teal-100 text-teal-700 border-teal-200',
  evasao: 'bg-rose-100 text-rose-700 border-rose-200',
  transferencia: 'bg-orange-100 text-orange-700 border-orange-200',
  obito: 'bg-neutral-200 text-neutral-600 border-neutral-300',
  recusa: 'bg-red-100 text-red-700 border-red-200',
};

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!ctx) return { title: 'Caso Intersetorial' };

  const service = new GetPatientService(ctx);
  const patient = await service.execute(id);
  return {
    title: patient ? `Caso — ${patient.socialName ?? patient.fullName}` : 'Caso não encontrado',
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function CasoIntersetorialPage({ params }: Props) {
  const { id: patientId } = await params;

  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  // --- Dados do paciente ---
  const patientService = new GetPatientService(ctx);
  const patient = await patientService.execute(patientId);
  if (!patient) notFound();

  // --- Caso ativo ---
  const activeCase = await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
    const caseRepo = new PtsCaseRepository(ctx, tx);
    return caseRepo.findActiveByPatientId(patientId);
  });

  if (!activeCase) {
    return (
      <div className="min-h-full bg-background/50 text-foreground">
        <div className="mx-auto max-w-5xl space-y-8 p-16 animate-reveal">
          <Link
            href={`/patients/${patientId}`}
            className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-blue-400"
          >
            <ArrowLeft size={14} /> Voltar para {patient.socialName ?? patient.fullName}
          </Link>

          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-diffusion">
            <AlertTriangle size={40} className="mx-auto mb-4 text-amber-400" />
            <h2 className="mb-2 text-lg font-bold text-foreground">
              Nenhum caso ativo encontrado
            </h2>
            <p className="text-sm text-muted-foreground">
              Este cidadão não possui um caso intersetorial ativo no momento.
              Inicie pela triagem ou sinalize pela fila de observação.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Plano e Ações e Scores e Sinalizações (tudo em uma transação RLS) ---
  const { plans, actions, scores, units, signals, derivedDims, encontros, professionals } = await withTransactionContext(
    ctx.userId,
    ctx.tenantId,
    async (tx) => {
      const planRepo = new PtsPlanRepository(ctx, tx);
      const actionRepo = new PtsActionRepository(ctx, tx);
      const signalRepo = new PtsSignalRepository(ctx, tx);
      const dimRepo = new PtsDimensionRepository(ctx, tx);
      const encontroRepo = new PtsEncontroRepository(ctx, tx);

      // Planos do caso (geralmente 1 PTS, pode ter PIA no futuro)
      const foundPlans = await planRepo.findByCaseId(activeCase.id);
      const activePlan = foundPlans.find((p) => p.type === 'PTS') ?? foundPlans[0];

      // Ações do plano ativo
      const foundActions = activePlan
        ? await actionRepo.findByPlanId(activePlan.id)
        : [];

      // Encontros do plano ativo
      const foundEncontros = activePlan
        ? await encontroRepo.findByPlanId(activePlan.id)
        : [];

      // Scores de dimensão do PTS baseline
      const [ptsDoc] = await tx
        .select({ scores: ptsResponses.scores })
        .from(ptsResponses)
        .where(
          and(
            eq(ptsResponses.patientId, patientId),
            eq(ptsResponses.tenantId, ctx.tenantId),
          ),
        )
        .limit(1);

      // Unidades do tenant para select da nova ação
      const tenantUnits = await tx
        .select({ id: serviceUnits.id, name: serviceUnits.name })
        .from(serviceUnits)
        .where(eq(serviceUnits.tenantId, ctx.tenantId));

      // Profissionais do tenant para seleção em encontros
      const professionalsList = await tx
        .select({
          id: tenantMembers.userId,
          fullName: profiles.fullName,
        })
        .from(tenantMembers)
        .innerJoin(profiles, eq(tenantMembers.userId, profiles.id))
        .where(eq(tenantMembers.tenantId, ctx.tenantId));

      // Sinalizações cruzadas do caso (Fase 2)
      const foundSignals = await signalRepo.findByCaseId(activeCase.id);

      // Dimensões derivadas (Fase 3) — mais recente por dimensão
      const allDims = await dimRepo.findByCaseId(activeCase.id);
      const latestDims = DIMENSIONS.map((dim) => {
        const row = allDims.find((d) => d.dimension === dim);
        return {
          dimension: dim as Dimension,
          payload: row ? (row.payload as any) : null,
          sensitivity: row?.sensitivity ?? 'normal',
          derivedAt: row ? row.createdAt.toISOString() : null,
        };
      });

      return {
        plans: foundPlans,
        actions: foundActions,
        scores: (ptsDoc?.scores as Record<string, number>) ?? {},
        units: tenantUnits,
        signals: foundSignals,
        derivedDims: latestDims,
        encontros: foundEncontros,
        professionals: professionalsList,
      };
    },
  );

  const activePlan = plans.find((p) => p.type === 'PTS') ?? plans[0];
  const dimensionAverages = calculateDomainAverages(scores) as Record<Dimension, number>;

  const statusLabel = CASE_STATUS_LABELS[activeCase.status as CaseStatus] ?? activeCase.status;
  const statusColor = CASE_STATUS_COLORS[activeCase.status as CaseStatus] ?? 'bg-slate-100 text-slate-700 border-slate-200';

  const isRt = activePlan?.ownerId === ctx.userId;
  // Gating de produto: o ciclo PTS/PIA (intensidade, participação/encontros, metas pactuadas)
  // é desbloqueado no plano Premium do município. Básico mantém monitoramento + sinalizações.
  const isPremium = hasTier(ctx, 'PREMIUM');

  return (
    <div className="min-h-full bg-background/50 text-foreground selection:bg-primary/20">
      <div className="mx-auto max-w-5xl space-y-8 p-8 md:p-16 animate-reveal">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 md:p-12 shadow-diffusion backdrop-blur-xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />

          <Link
            href={`/patients/${patientId}`}
            className="mb-8 inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-blue-400"
          >
            <ArrowLeft size={14} /> Voltar para {patient.socialName ?? patient.fullName}
          </Link>

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground md:text-4xl">
                  Caso Intersetorial
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusColor}`}
                >
                  {statusLabel}
                </span>
                {activePlan && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-widest',
                      activePlan.participacaoUsuario
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse'
                    )}
                  >
                    {activePlan.participacaoUsuario
                      ? `Participação: ${
                          activePlan.participacaoUsuario === 'presente'
                            ? 'Presente'
                            : activePlan.participacaoUsuario === 'representado_familia'
                            ? 'Família'
                            : 'Disp. Justificada'
                        }`
                      : 'Participação Pendente'}
                  </span>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">
                  {patient.socialName ?? patient.fullName}
                </span>
                {' · '}
                Criado em{' '}
                {new Date(activeCase.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href={`/patients/${patientId}/documento`}
                className="flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-background px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground transition-all hover:border-primary/40 hover:text-primary active:scale-95"
              >
                <FileText size={14} /> Documento Legal
              </Link>
              <Link
                href={`/patients/${patientId}/pts`}
                className="flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-background px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground transition-all hover:border-primary/40 hover:text-primary active:scale-95"
              >
                <ClipboardList size={14} /> Ver PTS Baseline
              </Link>
              <Link
                href={`/patients/${patientId}/pts/evolution`}
                className="flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-background px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground transition-all hover:border-primary/40 hover:text-primary active:scale-95"
              >
                <Activity size={14} /> Evolução (Radar)
              </Link>
            </div>
          </div>
        </div>

        {/* Ciclo PTS/PIA é recurso do plano Premium do município */}
        {!isPremium && (
          <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center shadow-diffusion">
            <h2 className="mb-2 text-sm font-black uppercase tracking-widest text-amber-700">
              Ciclo PTS/PIA — recurso Premium
            </h2>
            <p className="text-sm text-amber-800/80">
              Este município opera no plano Básico: monitoramento, dimensões e sinalizações
              intersetoriais. A ativação de PTS/PIA (técnico de referência, encontros, metas
              pactuadas e reavaliações) é habilitada no plano Premium.
            </p>
          </div>
        )}

        {/* Nível de Intensidade do Cuidado (Bloco 3 / §5.8) — Premium */}
        {isPremium && activePlan && (
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="inline-flex rounded-xl bg-primary/10 p-2">
                <BarChart2 size={16} className="text-primary" />
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 italic">
                Intensidade do Cuidado
              </h2>
            </div>
            <IntensityPanel
              planId={activePlan.id}
              currentNivel={(activePlan.nivelIntensidade as NivelIntensidade) ?? 'intensivo'}
              isRt={isRt}
              arquivado={activeCase.arquivado ?? false}
            />
          </section>
        )}

        {/* Participação do Usuário e Reuniões de Rede (Bloco 4) — Premium */}
        {isPremium && activePlan && (
          <ParticipationAndEncontros
            planId={activePlan.id}
            caseId={activeCase.id}
            caseStatus={activeCase.status}
            currentParticipation={activePlan.participacaoUsuario}
            currentJustificativa={activePlan.participacaoJustificativa}
            encontros={encontros}
            professionals={professionals}
          />
        )}

        {/* Reatribuição de Técnico de Referência (Ajuste D) — Premium, gestores */}
        {isPremium && activePlan && hasRole(ctx.role, 'MANAGER') && (
          <ReassignRtControl
            planId={activePlan.id}
            currentOwnerId={activePlan.ownerId}
            professionals={professionals}
          />
        )}

        {/* Dimensões Derivadas (Fase 3 — IA) */}
        {derivedDims.some((d) => d.payload !== null) && (
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="inline-flex rounded-xl bg-primary/10 p-2">
                <Activity size={16} className="text-primary" />
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 italic">
                Dimensões Derivadas (IA)
              </h2>
            </div>
            <DerivedDimensionCards dimensions={derivedDims} />
          </section>
        )}

        {/* Dimensões Baseline (PTS numérico) */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="inline-flex rounded-xl bg-primary/10 p-2">
              <Activity size={16} className="text-primary" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 italic">
              Dimensões Baseline (PTS)
            </h2>
          </div>
          <DimensionCards scores={dimensionAverages} />
        </section>

        {/* Entrada Manual de Dimensão (transição Fase 3) */}
        <section>
          <ManualDimensionForm caseId={activeCase.id} />
        </section>

        {/* Ações Pactuadas (Premium) */}
        {isPremium && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="inline-flex rounded-xl bg-primary/10 p-2">
              <ClipboardList size={16} className="text-primary" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 italic">
              Ações Pactuadas
            </h2>
            {actions.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-black text-primary">
                {actions.length}
              </span>
            )}
          </div>

          <ActionList
            actions={actions.map((a) => ({
              ...a,
              status: a.status as any,
            }))}
            planId={activePlan?.id ?? ''}
            units={units}
            activeUnitId={ctx.activeUnitId}
          />
        </section>
        )}

        {/* Sinalizações Cruzadas */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="inline-flex rounded-xl bg-primary/10 p-2">
              <Radio size={16} className="text-primary" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 italic">
              Sinalizações Cruzadas
            </h2>
            {signals.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-black text-primary">
                {signals.length}
              </span>
            )}
          </div>

          <SignalList
            signals={signals.map((s) => ({
              ...s,
              status: s.status as any,
              priority: s.priority as any,
            }))}
            caseId={activeCase.id}
            units={units}
          />
        </section>
      </div>
    </div>
  );
}
