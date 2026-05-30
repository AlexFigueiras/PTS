// @ts-nocheck
// FROZEN: fora de escopo Fase 0 (payload CadÚnico não tipado) — reavaliar na Fase 2/3
'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  RefreshCcw,
  User,
  Fingerprint,
  Calendar,
  Database,
  ArrowRight,
  Terminal,
  ChevronDown,
  ChevronUp,
  Inbox,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { PaginatedResult } from '@/lib/pagination';
import type { BackgroundJob } from '@/lib/db/schema/background-jobs';
import { requeueFailedJobAction } from '../actions';
import { parseJobErrorLog } from '../utils/error-parser';

interface DlqPanelProps {
  initialResult: PaginatedResult<BackgroundJob>;
  currentQueue?: string;
  currentPage: number;
}

export function DlqPanel({ initialResult, currentQueue, currentPage }: DlqPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'rnds' | 'cadunico' | 'all'>(
    currentQueue === 'rnds' ? 'rnds' : currentQueue === 'cadunico' ? 'cadunico' : 'all'
  );

  const { data: jobs, total, totalPages } = initialResult;

  const toggleExpand = (jobId: string) => {
    setExpandedJobs(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  const handleQueueFilter = (queue: 'rnds' | 'cadunico' | 'all') => {
    setActiveTab(queue);
    const params = new URLSearchParams();
    if (queue !== 'all') {
      params.set('queue', queue);
    }
    params.set('page', '1');
    startTransition(() => {
      router.push(`/admin/dlq?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (activeTab !== 'all') {
      params.set('queue', activeTab);
    }
    params.set('page', String(page));
    startTransition(() => {
      router.push(`/admin/dlq?${params.toString()}`);
    });
  };

  const handleRequeue = async (jobId: string) => {
    startTransition(async () => {
      try {
        const result = await requeueFailedJobAction(jobId);
        if (result.success) {
          toast.success('Tarefa Re-enfileirada!', {
            description: 'Os dados foram liberados para processamento imediato pelo motor de background.',
          });
          router.refresh();
        } else {
          toast.error('Erro ao Re-enfileirar', {
            description: result.error || 'Não foi possível mover a tarefa.',
          });
        }
      } catch (err: any) {
        toast.error('Falha de Rede/Servidor', {
          description: err?.message || 'Erro inesperado.',
        });
      }
    });
  };

  // Extracts human-readable patient information from background job payloads
  const getPatientInfo = (job: BackgroundJob) => {
    const payload = job.payload || {};
    
    // Check RNDS nested payload format
    if (payload.patient && typeof payload.patient === 'object') {
      const p = payload.patient as Record<string, any>;
      return {
        name: p.fullName || 'Cidadão Não Identificado',
        cpf: p.cpf || null,
        cns: p.cns || null,
        id: p.id || null
      };
    }
    
    // General fallback mapping for CadÚnico and other queues
    const name = 
      String(payload.patientName || payload.name || payload.fullName || 
      (payload.cidadao && typeof payload.cidadao === 'object' && (payload.cidadao as any).nome) || 
      'Paciente Sem Nome');
    const cpf = 
      String(payload.patientCpf || payload.cpf || 
      (payload.cidadao && typeof payload.cidadao === 'object' && (payload.cidadao as any).cpf) || 
      '');
    const id = String(payload.patientId || payload.id || '');

    return {
      name,
      cpf: cpf || null,
      cns: null,
      id: id || null
    };
  };

  return (
    <div className="min-h-full bg-background/50 text-foreground selection:bg-primary/20">
      <div className="mx-auto max-w-6xl space-y-10 p-16 animate-reveal">
        
        {/* Header Section */}
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="space-y-1">
            <h1 className="text-6xl font-medium tracking-tight text-foreground flex items-center gap-4">
              DLQ Humana
            </h1>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-muted-foreground/70">
              Fila de Erros e Tratamento de Rejeições FHIR & CadÚnico
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge className="bg-rose-500/10 text-rose-600 border border-rose-200/50 font-black uppercase tracking-widest text-[9px] px-3.5 py-1.5 shadow-sm">
              <AlertTriangle size={10} className="mr-1.5 shrink-0" />
              SISTEMA CRÍTICO
            </Badge>
          </div>
        </div>

        {/* Informative Banner */}
        <div className="rounded-[2rem] border border-amber-200/40 bg-amber-50/30 p-8 shadow-diffusion premium-bevel backdrop-blur-sm flex items-start gap-5">
          <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black uppercase tracking-wider text-amber-800">
              O que é a DLQ Humana?
            </h4>
            <p className="text-xs text-amber-700/80 leading-relaxed font-medium">
              Tarefas rejeitadas de forma definitiva por regras clínicas/semânticas (ex: erros 400/422 da RNDS) 
              ou que esgotaram todas as retentativas de infraestrutura estacionam aqui. Os profissionais devem corrigir os dados do cidadão e, em seguida, clicar em <strong>"Corrigir e Re-enfileirar"</strong> para reprocessamento imediato.
            </p>
          </div>
        </div>

        {/* Filter Navigation */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-5">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 max-w-fit shadow-xs">
            <button
              onClick={() => handleQueueFilter('all')}
              disabled={isPending}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'all'
                  ? 'bg-white text-primary shadow-sm scale-102'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              <Database size={14} />
              Todas as Filas
            </button>
            
            <button
              onClick={() => handleQueueFilter('rnds')}
              disabled={isPending}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'rnds'
                  ? 'bg-white text-primary shadow-sm scale-102'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              <Database size={14} className="text-blue-500" />
              Barramento RNDS (FHIR)
            </button>

            <button
              onClick={() => handleQueueFilter('cadunico')}
              disabled={isPending}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'cadunico'
                  ? 'bg-white text-primary shadow-sm scale-102'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              <Database size={14} className="text-emerald-500" />
              Integração CadÚnico
            </button>
          </div>

          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Total na DLQ: <span className="text-slate-700 font-extrabold">{total} tarefa(s)</span>
          </div>
        </div>

        <div className="relative space-y-6">
          {isPending && (
            <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-xs z-20 flex items-center justify-center rounded-[2.5rem]">
              <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200/50 flex items-center gap-3 shadow-md">
                <RefreshCcw size={18} className="text-primary animate-spin" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Recarregando DLQ...</span>
              </div>
            </div>
          )}

          {jobs.length === 0 ? (
            <div className="rounded-[2.5rem] border border-slate-200/50 bg-white p-16 text-center shadow-xs flex flex-col items-center justify-center">
              <div className="size-16 rounded-[1.25rem] bg-emerald-50 flex items-center justify-center text-emerald-500 mb-6 border border-emerald-100">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider text-slate-800">Fila Limpa</h3>
              <p className="text-sm font-medium text-slate-400 mt-2 max-w-sm">
                Excelente! Não há nenhum job rejeitado ou travado com falha crítica no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {jobs.map((job) => {
                const patient = getPatientInfo(job);
                const parsedError = parseJobErrorLog(job.errorLog);

                return (
                  <Card
                    key={job.id}
                    className="group rounded-[2rem] border border-slate-200/50 bg-white p-6 md:p-8 hover:shadow-md hover:border-slate-300 transition-all duration-300"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-50 pb-6 mb-6">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge className="bg-rose-500/10 text-rose-600 border border-rose-200/50 font-black uppercase tracking-wider text-[8px] px-2.5 py-1 rounded-lg">
                            Esgotado ({job.retryCount}/{job.maxRetries} tentativas)
                          </Badge>
                          <Badge className={`font-black uppercase tracking-widest text-[8px] px-2.5 py-1 border rounded-lg shadow-xs ${
                            job.queueName === 'rnds'
                              ? 'bg-blue-50/70 text-blue-600 border-blue-200/50'
                              : 'bg-emerald-50/70 text-emerald-600 border-emerald-200/50'
                          }`}>
                            Fila: {job.queueName === 'rnds' ? 'RNDS (FHIR)' : job.queueName.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 group-hover:text-primary transition">
                          <User size={18} className="text-slate-400" />
                          {patient.name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
                          {patient.cpf && (
                            <span className="flex items-center gap-1.5">
                              <Fingerprint size={13} />
                              CPF: {patient.cpf}
                            </span>
                          )}
                          {patient.cns && (
                            <span className="flex items-center gap-1.5">
                              <Fingerprint size={13} />
                              CNS: {patient.cns}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} />
                            Rejeição: {new Date(job.updatedAt).toLocaleDateString('pt-BR')} às {new Date(job.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 p-3 rounded-2xl shrink-0 self-start">
                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400/80">ID DA TAREFA</span>
                        <span className="font-mono text-slate-600 font-extrabold uppercase mt-0.5">{job.id.slice(0, 8)}...</span>
                      </div>
                    </div>

                    {job.queueName === 'cadunico' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-emerald-50/20 border border-emerald-100/50 p-6 rounded-2xl mb-6">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">NIS (Código Social)</span>
                          <p className="text-xs font-mono font-extrabold text-slate-700">
                            {job.payload?.nis || job.payload?.cidadao?.nis || 'Não informado'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Renda Per Capita Familiar</span>
                          <p className="text-xs font-extrabold text-slate-700">
                            {job.payload?.rendaPerCapita != null 
                              ? `R$ ${Number(job.payload.rendaPerCapita).toFixed(2)}`
                              : job.payload?.cidadao?.rendaPerCapita != null
                              ? `R$ ${Number(job.payload.cidadao.rendaPerCapita).toFixed(2)}`
                              : 'Não informada'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Membros da Família</span>
                          <p className="text-xs font-extrabold text-slate-700">
                            {job.payload?.familyMembers || job.payload?.cidadao?.familyMembers || 'Não informado'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Beneficiário Bolsa Família</span>
                          <div className="text-xs font-extrabold mt-0.5">
                            {job.payload?.hasBolsaFamilia === true || job.payload?.cidadao?.hasBolsaFamilia === true ? (
                              <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">Sim</span>
                            ) : job.payload?.hasBolsaFamilia === false || job.payload?.cidadao?.hasBolsaFamilia === false ? (
                              <span className="text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">Não</span>
                            ) : (
                              <span className="text-slate-400 font-medium">Não informado</span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Beneficiário BPC</span>
                          <div className="text-xs font-extrabold mt-0.5">
                            {job.payload?.hasBpc === true || job.payload?.cidadao?.hasBpc === true ? (
                              <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">Sim</span>
                            ) : job.payload?.hasBpc === false || job.payload?.cidadao?.hasBpc === false ? (
                              <span className="text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">Não</span>
                            ) : (
                              <span className="text-slate-400 font-medium">Não informado</span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Chefe da Família / Mãe</span>
                          <p className="text-xs font-extrabold text-slate-700">
                            {job.payload?.motherName || job.payload?.cidadao?.nomeMae || 'Não informado'}
                          </p>
                        </div>
                      </div>
                    ) : job.queueName === 'rnds' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-blue-50/20 border border-blue-100/50 p-6 rounded-2xl mb-6">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">CNS (Identificador SUS)</span>
                          <p className="text-xs font-mono font-extrabold text-slate-700">
                            {job.payload?.patient?.cns || 'Não informado'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">CNES da Unidade</span>
                          <p className="text-xs font-mono font-extrabold text-slate-700">
                            {job.payload?.encounter?.cnes || 'Não informado'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Profissional / CBO</span>
                          <p className="text-xs font-extrabold text-slate-700">
                            {job.payload?.encounter?.participant?.fullName || 'Não informado'}
                            {job.payload?.encounter?.participant?.cbo && (
                              <span className="text-[10px] font-medium text-slate-400 ml-1">
                                ({job.payload.encounter.participant.cbo})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-3 flex items-center gap-1.5">
                          <AlertTriangle size={14} /> Diagnóstico de Erro (OperationOutcome Parser)
                        </h4>

                        {/* If it's a FHIR clinical validation error, show structured issues */}
                        {parsedError.isFhirValidationError && parsedError.issues.length > 0 ? (
                          <div className="space-y-4">
                            {parsedError.issues.map((issue) => (
                              <div key={issue.index} className="flex gap-4 items-start bg-white p-4 rounded-xl border border-rose-100/50 shadow-xs">
                                <Badge className="bg-rose-500 text-white font-black text-[9px] px-2 py-0.5 mt-0.5 shrink-0">
                                  Cod: {issue.code}
                                </Badge>
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-slate-800 leading-snug">
                                    {issue.friendlyExplanation || issue.details}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    <strong>Detalhes Técnicos:</strong> {issue.details}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Fallback for general errors
                          <p className="text-sm font-bold text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-rose-100/30 shadow-xs">
                            {parsedError.summary}
                          </p>
                        )}
                      </div>

                      {/* Technical Stack Trace Collapse */}
                      {parsedError.stackTrace && (
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/20">
                          <button
                            onClick={() => toggleExpand(job.id)}
                            className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition text-slate-500 text-xs font-black uppercase tracking-wider"
                          >
                            <span className="flex items-center gap-2">
                              <Terminal size={14} />
                              Log Técnico / Stack Trace
                            </span>
                            {expandedJobs[job.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          {expandedJobs[job.id] && (
                            <pre className="border-t border-slate-100 p-5 font-mono text-[10px] text-slate-600 bg-slate-900/5 overflow-x-auto max-h-60 leading-relaxed">
                              {parsedError.rawMessage}
                              {"\n\n"}
                              {parsedError.stackTrace}
                            </pre>
                          )}
                        </div>
                      )}

                      {/* Action buttons footer */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100">
                        <div className="text-[10px] font-medium text-slate-400">
                          Fila ativa: <strong>{job.queueName}</strong> | Tentativa máxima: {job.maxRetries}
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            onClick={() => handleRequeue(job.id)}
                            disabled={isPending}
                            className="rounded-xl bg-primary text-white hover:bg-primary/95 font-black text-xs px-6 py-5.5 shadow-md shadow-primary/10 flex items-center gap-2 transition hover:-translate-y-0.5 active:translate-y-0"
                          >
                            <RefreshCcw size={14} className={isPending ? "animate-spin" : ""} />
                            Corrigir e Re-enfileirar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Advanced Pagination controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-slate-200/60">
            <div className="text-xs font-medium text-slate-500">
              Exibindo <span className="font-extrabold text-slate-800">{jobs.length}</span> de{' '}
              <span className="font-extrabold text-slate-800">{total}</span> tarefas rejeitadas
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <Button
                variant="outline"
                disabled={currentPage <= 1 || isPending}
                onClick={() => handlePageChange(currentPage - 1)}
                className="rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold"
              >
                Anterior
              </Button>

              <span className="text-xs font-black text-slate-700 bg-slate-100 border border-slate-200/50 px-3.5 py-2 rounded-xl">
                {currentPage} / {totalPages}
              </span>

              <Button
                variant="outline"
                disabled={currentPage >= totalPages || isPending}
                onClick={() => handlePageChange(currentPage + 1)}
                className="rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold"
              >
                Próximo
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
