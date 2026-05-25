'use client';

import { useFormContext } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  Brain,
  Target,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Plus,
  Trash,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { calculateDistance, type HealthService } from '@/lib/health-services';
import type { PredefinedAction } from '@/lib/db/schema/predefined-actions';
import type { PtsSchema } from '@/validations/pts-schema';

export function DashboardSection({
  loadingAi,
  catalog,
  sortedServices,
}: {
  loadingAi: boolean;
  catalog: PredefinedAction[];
  sortedServices: HealthService[];
}) {
  const methods = useFormContext<PtsSchema>();
  const { watch, setValue, register } = methods;
  const formData = watch();

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. DIAGNÓSTICO E VULNERABILIDADE */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 rounded-[2.5rem] bg-slate-900 p-10 text-white shadow-2xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
          <div className="relative z-10 flex items-center gap-6">
            <div
              className={cn(
                'flex h-24 w-24 items-center justify-center rounded-[2rem] text-5xl font-black shadow-2xl transition-transform duration-500 hover:scale-105',
                formData.vulnerabilityIndex === 'A'
                  ? 'bg-emerald-500 shadow-emerald-500/20'
                  : formData.vulnerabilityIndex === 'B'
                    ? 'bg-blue-500 shadow-blue-500/20'
                    : formData.vulnerabilityIndex === 'C'
                      ? 'bg-amber-500 shadow-amber-500/20'
                      : formData.vulnerabilityIndex === 'D'
                        ? 'bg-orange-500 shadow-orange-500/20'
                        : formData.vulnerabilityIndex === 'E'
                          ? 'bg-rose-500 shadow-rose-500/20'
                          : 'bg-slate-700',
              )}
            >
              {loadingAi ? (
                <div className="size-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
              ) : (
                formData.vulnerabilityIndex || '?'
              )}
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Índice de Vulnerabilidade</h3>
              <p className="text-2xl font-black tracking-tight">Classificação de Risco Clínico</p>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="border-white/10 text-white/60 bg-white/5 uppercase text-[8px] font-black tracking-widest">
                  <Brain size={10} className="mr-1" /> Inteligência Assistida
                </Badge>
              </div>
            </div>
          </div>
          <div className="relative z-10 flex flex-col items-end gap-3 text-right">
            <p className="max-w-[280px] text-[10px] font-medium leading-relaxed text-white/50">
              O sistema processou os escores de saúde, riscos sociais e relatos textuais para determinar a prioridade de atendimento.
            </p>
            <div className="h-1 w-24 rounded-full bg-primary/20" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Potentialities */}
          <div className="rounded-[2.5rem] border border-emerald-500/10 bg-emerald-500/[0.03] p-10 backdrop-blur-sm">
            <div className="mb-8 flex items-center gap-3 text-emerald-600">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Potencialidades Identificadas</h3>
            </div>
            {loadingAi ? (
              <div className="flex flex-wrap gap-2.5">
                <Skeleton className="h-9 w-32 rounded-xl opacity-40" />
                <Skeleton className="h-9 w-24 rounded-xl opacity-40" />
                <Skeleton className="h-9 w-28 rounded-xl opacity-40" />
              </div>
            ) : (formData.aiPotentialities || []).length === 0 ? (
              <p className="text-xs text-muted-foreground/40 italic font-medium px-2">Nenhum fator protetivo mapeado pela IA.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {(formData.aiPotentialities || []).map((p, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 border border-emerald-500/10 text-emerald-700 shadow-sm transition-all hover:border-emerald-500/30">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{p}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Improvement Suggestions */}
          <div className="rounded-[2.5rem] border border-rose-500/10 bg-rose-500/[0.03] p-10 backdrop-blur-sm">
            <div className="mb-8 flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-500/10">
                <AlertCircle size={20} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Alertas de Fragilidade / Risco</h3>
            </div>
            {loadingAi ? (
              <div className="flex flex-wrap gap-2.5">
                <Skeleton className="h-9 w-28 rounded-xl opacity-40" />
                <Skeleton className="h-9 w-36 rounded-xl opacity-40" />
                <Skeleton className="h-9 w-24 rounded-xl opacity-40" />
              </div>
            ) : (formData.aiFragilities || []).length === 0 ? (
              <p className="text-xs text-muted-foreground/40 italic font-medium px-2">Nenhum risco crítico detectado pela IA.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {(formData.aiFragilities || []).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 border border-rose-500/10 text-rose-700 shadow-sm transition-all hover:border-rose-500/30">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <Separator className="bg-slate-100" />

      {/* 2. OBJETIVOS ESTRATÉGICOS (METAS GLOBAIS) */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary">
            <Target size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-900">Objetivos do Cuidado</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Definição estratégica do Plano Terapêutico Singular</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="col-span-1 space-y-3">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Curto Prazo (Imediato)</label>
            <textarea
              className="w-full min-h-[140px] rounded-3xl border border-slate-200 bg-slate-50/50 p-6 text-sm font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none placeholder:text-slate-300"
              placeholder="Ações para os próximos dias…"
              {...register('shortTermGoals')}
            />
          </div>
          <div className="col-span-1 space-y-3">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Médio Prazo (Até 6 meses)</label>
            <textarea
              className="w-full min-h-[140px] rounded-3xl border border-slate-200 bg-slate-50/50 p-6 text-sm font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none placeholder:text-slate-300"
              placeholder="Metas de estabilização…"
              {...register('mediumTermGoals')}
            />
          </div>
          <div className="col-span-1 space-y-3">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Longo Prazo (Estrutural)</label>
            <textarea
              className="w-full min-h-[140px] rounded-3xl border border-slate-200 bg-slate-50/50 p-6 text-sm font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none placeholder:text-slate-300"
              placeholder="Reinserção e autonomia…"
              {...register('longTermGoals')}
            />
          </div>
        </div>
      </section>

      <Separator className="bg-slate-100" />

      {/* 3. RECOMENDAÇÕES CLÍNICAS DA IA */}
      <section className="space-y-10 rounded-[3rem] bg-slate-50/80 p-10 md:p-12 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/10">
              <Brain size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase italic">Motor de Decisão Clínica</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sugestões baseadas no catálogo de ações da unidade</p>
            </div>
          </div>
          {loadingAi && (
            <div className="flex items-center gap-3 rounded-full bg-white px-6 py-3 shadow-sm border border-slate-100 animate-pulse">
              <div className="size-2 rounded-full bg-primary animate-bounce" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">IA Analisando Evidências...</span>
            </div>
          )}
        </div>

        <div className="grid gap-6">
          {loadingAi ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-[2.5rem] border border-slate-200 bg-white p-10 space-y-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-6 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-48 rounded-lg" />
                </div>
                <Skeleton className="h-12 w-full rounded-2xl" />
                <div className="rounded-2xl bg-slate-50 p-6 border border-slate-100 space-y-3">
                  <Skeleton className="h-3 w-32 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                </div>
              </div>
            ))
          ) : (formData.aiSuggestions || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 rounded-[2.5rem] border border-dashed border-slate-200 bg-white/40">
              <div className="p-6 rounded-full bg-slate-100 text-slate-300">
                <ClipboardList size={40} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nenhuma recomendação disponível para este perfil.</p>
            </div>
          ) : (
            (formData.aiSuggestions || []).map((suggestion: any, sIdx: number) => {
              const action = catalog.find((a) => a.id === suggestion.actionId);
              return (
                <motion.div
                  key={sIdx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: sIdx * 0.1 }}
                  className={cn(
                    'relative overflow-hidden rounded-[2.5rem] border transition-all duration-500 group',
                    suggestion.approved
                      ? 'border-emerald-500/30 bg-emerald-500/[0.02] shadow-lg shadow-emerald-500/5'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50',
                  )}
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-1 p-10">
                      <div className="mb-6 flex items-center gap-4">
                        <span className="rounded-xl bg-slate-100 px-4 py-2 text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                          {action?.category || 'Geral'}
                        </span>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight">{action?.title || 'Ação do Catálogo'}</h4>
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-slate-500 mb-8 max-w-[60ch]">{action?.description}</p>

                      <div className="rounded-3xl bg-slate-50/50 p-8 border border-slate-100 transition-colors group-hover:bg-white group-hover:border-primary/10">
                        <div className="flex items-center gap-2 mb-3">
                          <Brain size={12} className="text-primary/40" />
                          <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary italic">Justificativa Clínica</h5>
                        </div>
                        <p className="text-sm font-bold italic leading-relaxed text-slate-600">"{suggestion.clinicalJustification}"</p>
                      </div>
                    </div>

                    <div className="flex flex-col border-t border-slate-100 md:w-72 md:border-t-0 md:border-l bg-slate-50/30 transition-colors group-hover:bg-slate-50/50">
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...(formData.aiSuggestions || [])] as any[];
                          next[sIdx].approved = !next[sIdx].approved;
                          setValue('aiSuggestions', next as any);

                          if (next[sIdx].approved && action) {
                            const currentInt = (formData.interventions || []) as any[];
                            if (!currentInt.find((i: any) => i.description.includes(action.title))) {
                              setValue('interventions', [
                                ...currentInt,
                                {
                                  id: `ai-${Date.now()}`,
                                  description: `${action.title}: ${action.description}`,
                                  service: 'A definir',
                                  status: 'pending',
                                },
                              ] as any);
                              toast.success('Ação adicionada ao Plano!');
                            }
                          }
                        }}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-4 p-8 text-[11px] font-black uppercase tracking-[0.3em] transition-all active:scale-[0.98]',
                          suggestion.approved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-slate-900 hover:bg-slate-50',
                        )}
                      >
                        {suggestion.approved ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                        {suggestion.approved ? 'Aprovado' : 'Aprovar'}
                      </button>

                      <div className="relative flex flex-1 p-6 flex-col justify-center gap-3">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-2 italic">Substituir Ação:</label>
                        <div className="relative">
                          <select
                            className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 focus:border-primary focus:outline-none transition-all cursor-pointer pr-10"
                            onChange={(e) => {
                              const next = [...(formData.aiSuggestions || [])] as any[];
                              next[sIdx].actionId = e.target.value;
                              setValue('aiSuggestions', next as any);
                            }}
                            value={suggestion.actionId}
                          >
                            {catalog.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.title}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <ChevronRight size={14} className="rotate-90" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </section>

      <Separator className="bg-slate-100" />

      {/* 4. PLANO DE AÇÃO FINAL (AÇÕES E ENCAMINHAMENTOS) */}
      <section className="space-y-10">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/5 text-emerald-600">
              <ClipboardList size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900">Ações e Encaminhamentos</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Detalhamento prático da rede de cuidados</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const current = (formData.interventions || []) as any[];
              setValue('interventions', [
                ...current,
                { id: Date.now().toString(), description: '', service: '', status: 'pending' as const },
              ] as any);
            }}
            className="flex items-center gap-3 rounded-2xl bg-slate-900 px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={18} /> Adicionar Ação Manual
          </button>
        </div>

        <div className="grid gap-6">
          {!formData.interventions || formData.interventions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 rounded-[3rem] border border-dashed border-slate-200 bg-slate-50/30">
              <div className="p-8 rounded-full bg-white text-slate-200 shadow-sm">
                <ClipboardList size={48} />
              </div>
              <div className="max-w-xs space-y-2">
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">Plano de ação vazio</p>
                <p className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase tracking-widest">Adicione ações manuais ou aprove as recomendações da IA acima.</p>
              </div>
            </div>
          ) : (
            (formData.interventions || []).map((item: any, idx: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-8 rounded-[2.5rem] border border-slate-200 bg-white p-10 md:flex-row shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex-1 space-y-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Descrição da Intervenção</label>
                    <textarea
                      placeholder="Ex: Encaminhar para acompanhamento na UBS de referência…"
                      className="min-h-[120px] w-full resize-none rounded-3xl border border-slate-100 bg-slate-50/50 p-6 text-sm font-bold text-slate-700 outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5"
                      value={item.description}
                      onChange={(e) => {
                        const l = [...(formData.interventions || [])] as any;
                        l[idx].description = e.target.value;
                        setValue('interventions', l);
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Serviço/Unidade Responsável</label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none transition-all focus:border-primary focus:bg-white"
                          value={item.service}
                          onChange={(e) => {
                            const l = [...(formData.interventions || [])] as any;
                            l[idx].service = e.target.value;
                            setValue('interventions', l);
                          }}
                        >
                          <option value="">Selecione o Serviço…</option>
                          {sortedServices.map((s) => {
                            const dist =
                              formData.lat && formData.lon ? calculateDistance(formData.lat, formData.lon, s.lat, s.lon).toFixed(2) : null;
                            return (
                              <option key={s.id} value={s.name}>
                                {s.type} — {s.name}
                                {dist ? ` (${dist} km)` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Status da Ação</label>
                      <button
                        type="button"
                        onClick={() => {
                          const l = [...(formData.interventions || [])] as any;
                          l[idx].status = l[idx].status === 'completed' ? 'pending' : 'completed';
                          setValue('interventions', l);
                        }}
                        className={cn(
                          'flex w-full items-center justify-center gap-4 rounded-2xl px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95',
                          item.status === 'completed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-400',
                        )}
                      >
                        {item.status === 'completed' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                        {item.status === 'completed' ? 'Finalizada' : 'Em Aberto'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Prazo Esperado</label>
                      <input
                        type="text"
                        placeholder="Ex: Imediato, 15 dias, semanal…"
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none transition-all focus:border-primary focus:bg-white"
                        value={item.deadline || ''}
                        onChange={(e) => {
                          const l = [...(formData.interventions || [])] as any;
                          l[idx].deadline = e.target.value;
                          setValue('interventions', l);
                        }}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Responsável / Profissional</label>
                      <input
                        type="text"
                        placeholder="Ex: Psicólogo, Assistente Social, Família…"
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none transition-all focus:border-primary focus:bg-white"
                        value={item.responsible || ''}
                        onChange={(e) => {
                          const l = [...(formData.interventions || [])] as any;
                          l[idx].responsible = e.target.value;
                          setValue('interventions', l);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center border-t border-slate-100 pt-6 md:border-t-0 md:border-l md:pl-8 md:pt-0">
                  <button
                    type="button"
                    onClick={() =>
                      setValue(
                        'interventions',
                        ((formData.interventions || []) as any[]).filter((i: any) => i.id !== item.id) as any,
                      )
                    }
                    className="rounded-full bg-rose-50 p-4 text-rose-400 transition-all hover:bg-rose-500 hover:text-white"
                  >
                    <Trash size={20} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* 5. AVISO LEGAL E RESPONSABILIDADE */}
      <footer className="rounded-3xl bg-slate-900 p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
          <Brain size={120} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 shadow-inner backdrop-blur-md">
            <Brain size={32} className="text-primary" />
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-black uppercase tracking-tight italic">Protocolo de Segurança Clínica</h4>
            <p className="text-[10px] font-bold leading-relaxed uppercase tracking-[0.2em] text-white/40">
              Este Plano Terapêutico Singular foi construído com auxílio de modelos preditivos de IA. A validação das metas, prazos e condutas é de responsabilidade técnica exclusiva do profissional de saúde assinante.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
