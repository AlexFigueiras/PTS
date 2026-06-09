'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePlanParticipationAction, transitionCaseStatusAction } from '@/modules/pts/actions';
import { EncontroModal } from './encontro-modal';
import { toast } from 'sonner';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Lock,
  UserCheck,
  Plus,
  Network
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Professional = {
  id: string;
  fullName: string;
};

type EncontroRow = {
  id: string;
  tipo: 'articulacao_rede' | 'reuniao_pts';
  data: Date | string;
  participantes: string[];
  usuarioPresente: boolean;
  ata?: string | null;
  createdAt: Date | string;
};

type ParticipationAndEncontrosProps = {
  planId: string;
  caseId: string;
  caseStatus: string;
  currentParticipation: 'presente' | 'representado_familia' | 'dispensado_por_incapacidade' | null;
  currentJustificativa: string | null;
  encontros: EncontroRow[];
  professionals: Professional[];
};

const PARTICIPACAO_LABELS = {
  presente: 'Cidadão Presente',
  representado_familia: 'Representado pela Família',
  dispensado_por_incapacidade: 'Dispensado por Incapacidade Cognitiva',
};

export function ParticipationAndEncontros({
  planId,
  caseId,
  caseStatus,
  currentParticipation,
  currentJustificativa,
  encontros,
  professionals,
}: ParticipationAndEncontrosProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Estado local para a participação
  const [participacao, setParticipacao] = useState<'presente' | 'representado_familia' | 'dispensado_por_incapacidade' | ''>(
    currentParticipation || ''
  );
  const [justificativa, setJustificativa] = useState(currentJustificativa || '');
  const [savingPart, setSavingPart] = useState(false);

  const isCaseEditable = caseStatus === 'acompanhamento';
  const isPlanActive = caseStatus === 'pts_ativo' || caseStatus === 'pia_ativo';

  async function handleSaveParticipation(e: React.FormEvent) {
    e.preventDefault();
    if (!participacao) {
      toast.error('Selecione uma modalidade de participação.');
      return;
    }
    if (participacao === 'dispensado_por_incapacidade' && !justificativa.trim()) {
      toast.error('Justificativa é obrigatória para dispensa por incapacidade.');
      return;
    }

    setSavingPart(true);
    const result = await updatePlanParticipationAction({
      planId,
      participacaoUsuario: participacao,
      participacaoJustificativa: participacao === 'dispensado_por_incapacidade' ? justificativa : null,
    });
    setSavingPart(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Participação do usuário salva com sucesso!');
      router.refresh();
    }
  }

  function handleActivatePlan() {
    startTransition(async () => {
      const result = await transitionCaseStatusAction({
        caseId,
        nextStatus: 'pts_ativo',
      });

      if (result.error) {
        toast.error(result.error, {
          duration: 6000,
        });
      } else {
        toast.success('Projeto Terapêutico Singular (PTS) ativado com sucesso!');
        router.refresh();
      }
    });
  }

  // Resolve os nomes dos profissionais de participantes
  function resolveParticipantNames(ids: string[]) {
    return ids
      .map((id) => professionals.find((p) => p.id === id)?.fullName)
      .filter(Boolean)
      .join(', ');
  }

  return (
    <div className="space-y-8">
      {/* Bloco de Participação & Ativação */}
      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8 overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8 shadow-diffusion">
          <div className="mb-6 flex items-center gap-3">
            <div className="inline-flex rounded-xl bg-primary/10 p-2 text-primary">
              <UserCheck size={16} />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 italic">
              Participação do Usuário na Pactuação
            </h2>
          </div>

          {isCaseEditable ? (
            <form onSubmit={handleSaveParticipation} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Como o usuário participou? *
                  </label>
                  <select
                    value={participacao}
                    onChange={(e: any) => setParticipacao(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Selecione...</option>
                    <option value="presente">{PARTICIPACAO_LABELS.presente}</option>
                    <option value="representado_familia">{PARTICIPACAO_LABELS.representado_familia}</option>
                    <option value="dispensado_por_incapacidade">{PARTICIPACAO_LABELS.dispensado_por_incapacidade}</option>
                  </select>
                </div>

                {participacao === 'dispensado_por_incapacidade' && (
                  <div className="space-y-1 animate-in fade-in duration-200">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Justificativa técnica *
                    </label>
                    <textarea
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      rows={2}
                      placeholder="Descreva a justificativa clínica/técnica..."
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingPart}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                >
                  {savingPart ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Salvar Participação
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2 rounded-2xl bg-slate-50/50 p-4 border border-border/60">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-700">
                  {currentParticipation ? PARTICIPACAO_LABELS[currentParticipation] : 'Não registrada'}
                </span>
              </div>
              {currentParticipation === 'dispensado_por_incapacidade' && currentJustificativa && (
                <p className="text-xs italic text-slate-500 bg-white border border-border/40 p-2.5 rounded-xl">
                  &ldquo;{currentJustificativa}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>

        {/* Painel de Ativação do Plano */}
        <div className="md:col-span-4 flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8 shadow-diffusion">
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60">
              Status de Ativação do PTS
            </h3>
            {isPlanActive ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-700">
                    PTS Ativo e Pactuado
                  </span>
                  <span className="block text-[8px] text-emerald-600/80 leading-normal mt-0.5">
                    O plano está formalmente em execução com a participação do usuário registrada.
                  </span>
                </div>
              </div>
            ) : isCaseEditable ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-amber-700">
                    Pactuação Pendente
                  </span>
                  <span className="block text-[8px] text-amber-600/80 leading-normal mt-0.5">
                    O plano está em rascunho. Registre a participação do usuário para ativá-lo.
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-start gap-2.5">
                <Lock size={16} className="text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Inativo / Arquivado
                  </span>
                  <span className="block text-[8px] text-slate-500/80 leading-normal mt-0.5">
                    Caso fora de acompanhamento ativo (Ex: Radar, Alta ou Evasão).
                  </span>
                </div>
              </div>
            )}
          </div>

          {isCaseEditable && (
            <button
              onClick={handleActivatePlan}
              disabled={isPending}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 px-4 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Ativar & Pactuar PTS
            </button>
          )}
        </div>
      </div>

      {/* Seção de Encontros */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-xl bg-primary/10 p-2 text-primary">
              <Network size={16} />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 italic">
              Encontros e Reuniões de Rede
            </h2>
            {encontros.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-black text-primary">
                {encontros.length}
              </span>
            )}
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:border-primary/60 hover:bg-primary/10 active:scale-95"
          >
            <Plus size={12} /> Registrar Encontro
          </button>
        </div>

        {encontros.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center shadow-diffusion">
            <p className="text-sm text-muted-foreground mb-1">Nenhum encontro ou reunião registrada para este plano.</p>
            <p className="text-[10px] text-muted-foreground/60">
              Registre as reuniões de articulação da rede ou reuniões de pactuação do PTS.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {encontros.map((enc) => {
              const dataFormatada = new Date(enc.data).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={enc.id}
                  className={cn(
                    'rounded-2xl border p-4 bg-card transition-all hover:shadow-sm space-y-3',
                    enc.tipo === 'reuniao_pts' ? 'border-violet-100 bg-violet-50/10' : 'border-border'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'rounded-lg border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider',
                        enc.tipo === 'reuniao_pts'
                          ? 'border-violet-200 bg-violet-50 text-violet-700'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      )}
                    >
                      {enc.tipo === 'reuniao_pts' ? 'Reunião de PTS' : 'Articulação de Rede'}
                    </span>
                    <span
                      className={cn(
                        'rounded-lg px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider',
                        enc.usuarioPresente ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      )}
                    >
                      {enc.usuarioPresente ? 'Cidadão Presente' : 'Cidadão Ausente'}
                    </span>
                  </div>

                  <p className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                    <Calendar size={11} className="text-slate-400" />
                    {dataFormatada}
                  </p>

                  <div className="border-t border-slate-100 pt-2.5 space-y-1">
                    <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">
                      Participantes da Rede
                    </span>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {resolveParticipantNames(enc.participantes)}
                    </p>
                  </div>

                  {enc.ata && (
                    <div className="border-t border-slate-100 pt-2.5 space-y-1">
                      <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">
                        Ata
                      </span>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {enc.ata}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal */}
      <EncontroModal
        planId={planId}
        professionals={professionals}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          toast.success('Encontro registrado com sucesso!');
          router.refresh();
        }}
      />
    </div>
  );
}
