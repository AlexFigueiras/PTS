'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Activity,
  ArrowRight,
  TrendingUp,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Building,
  FileText,
  User,
  Hash
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { transitionIntersectoralTaskAction } from '@/modules/pts/actions';
import type { TaskStatus, TaskPriority } from '@/modules/pts/pts.dto';

export interface EnrichedTask {
  id: string;
  patientId: string;
  patientName: string;
  patientCpf: string;
  status: TaskStatus;
  priority: TaskPriority;
  description: string;
  sourceUnitId: string;
  sourceUnitName: string;
  sourceUnitType: string;
  targetUnitId: string;
  requesterId: string;
  ownerId: string | null;
  history: any[];
  createdAt: Date;
  updatedAt: Date;
}

interface TaskPanelProps {
  tasks: EnrichedTask[];
  totalTasks: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  activeStatusFilter: TaskStatus | 'all-active' | 'all-terminal';
}

export function TaskPanel({
  tasks,
  totalTasks,
  currentPage,
  pageSize,
  totalPages,
  activeStatusFilter,
}: TaskPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Estados dos modais de transição da máquina de estados
  const [selectedTask, setSelectedTask] = useState<EnrichedTask | null>(null);
  const [transitionType, setTransitionType] = useState<'accept' | 'start' | 'fail' | 'complete' | 'cancel' | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Mapeamento lógico de aba a partir do filtro atual da URL
  const activeTab = (() => {
    if (activeStatusFilter === 'requested') return 'acolhimento';
    if (activeStatusFilter === 'accepted' || activeStatusFilter === 'in-progress' || activeStatusFilter === 'all-active') {
      return 'acompanhamento';
    }
    return 'historico';
  })();

  // Atualiza os parâmetros na URL de forma fluida
  const updateFilters = (newParams: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    
    // Sempre reseta para a página 1 ao alterar filtros básicos de status
    if (newParams.status !== undefined) {
      params.set('page', '1');
    }

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleTabChange = (tab: 'acolhimento' | 'acompanhamento' | 'historico') => {
    if (tab === 'acolhimento') {
      updateFilters({ status: 'requested' });
    } else if (tab === 'acompanhamento') {
      // Por padrão ao clicar em acompanhamento, listamos 'in-progress' ou uma flag customizada para listar ativos
      updateFilters({ status: 'in-progress' });
    } else {
      updateFilters({ status: 'completed' });
    }
  };

  const openTransitionModal = (task: EnrichedTask, type: 'accept' | 'start' | 'fail' | 'complete' | 'cancel') => {
    setSelectedTask(task);
    setTransitionType(type);
    setNotes('');
  };

  const closeTransitionModal = () => {
    setSelectedTask(null);
    setTransitionType(null);
    setNotes('');
  };

  const handleTransitionSubmit = async () => {
    if (!selectedTask || !transitionType) return;

    // Validações obrigatórias exigidas pelas regras de negócio
    if ((transitionType === 'fail' || transitionType === 'complete' || transitionType === 'cancel') && !notes.trim()) {
      toast.error('Justificativa Obrigatória', {
        description: 'Por favor, detalhe a evolução clínica ou justificativa de encerramento.',
      });
      return;
    }

    setActionLoading(true);
    let targetStatus: TaskStatus;

    switch (transitionType) {
      case 'accept':
        targetStatus = 'accepted';
        break;
      case 'start':
        targetStatus = 'in-progress';
        break;
      case 'fail':
        targetStatus = 'failed';
        break;
      case 'complete':
        targetStatus = 'completed';
        break;
      case 'cancel':
        targetStatus = 'cancelled';
        break;
    }

    try {
      const res = await transitionIntersectoralTaskAction(selectedTask.id, targetStatus, notes);
      if (res.success) {
        toast.success('Transição Concluída!', {
          description: `Tarefa movida com sucesso para o status ${targetStatus}.`,
        });
        closeTransitionModal();
        router.refresh();
      } else {
        toast.error('Erro na Transição', {
          description: res.error,
        });
      }
    } catch (err: any) {
      toast.error('Erro de Processamento', {
        description: err?.message || 'Ocorreu um erro ao atualizar a tarefa.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Cores de prioridade baseadas na gravidade FHIR
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'asap':
      case 'stat':
        return (
          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-200 dark:border-rose-800/60 font-black uppercase tracking-wider text-xs px-3 py-1.5 shadow-sm">
            <AlertCircle size={10} className="mr-1 shrink-0" />
            CRÍTICO / IMEDIATO
          </Badge>
        );
      case 'urgent':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 font-black uppercase tracking-wider text-xs px-3 py-1.5 shadow-sm">
            <AlertTriangle size={10} className="mr-1 shrink-0" />
            URGENTE
          </Badge>
        );
      case 'routine':
      default:
        return (
          <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200 border border-sky-200 dark:border-sky-800/60 font-black uppercase tracking-wider text-xs px-3 py-1.5 shadow-sm">
            <Clock size={10} className="mr-1 shrink-0" />
            ELETIVO / ROTINA
          </Badge>
        );
    }
  };

  // Badges informativas de Status
  const getStatusBadge = (status: TaskStatus) => {
    const base = "font-black uppercase tracking-widest text-xs px-3 py-1.5 border rounded-lg shadow-xs";
    switch (status) {
      case 'requested':
        return <Badge className={`${base} bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border-blue-200/80`}>Aguardando Triagem</Badge>;
      case 'accepted':
        return <Badge className={`${base} bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 border-indigo-200/80`}>Acolhido / Aceito</Badge>;
      case 'in-progress':
        return <Badge className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-200/80`}>Acompanhamento Ativo</Badge>;
      case 'completed':
        return <Badge className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200/80`}>Concluído com Sucesso</Badge>;
      case 'failed':
        return <Badge className={`${base} bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border-rose-200/80`}>Evasão / Falha</Badge>;
      case 'cancelled':
        return <Badge className={`${base} bg-slate-100 text-slate-700 dark:bg-slate-850 dark:text-slate-300 border-slate-200/80`}>Cancelado</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Dashboard de Estatísticas Clínicas (Visual Premium) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-[1.5rem] border border-slate-200/50 bg-white p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition duration-300">
          <div className="size-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Inbox size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Demandas na Fila</p>
            <h4 className="text-2xl font-black text-slate-800 mt-0.5">{totalTasks} caso(s)</h4>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200/50 bg-white p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition duration-300">
          <div className="size-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Em Atendimento</p>
            <h4 className="text-2xl font-black text-slate-800 mt-0.5">Território Ativo</h4>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200/50 bg-slate-900 p-6 shadow-lg flex items-center gap-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5"><TrendingUp size={80} /></div>
          <div className="size-12 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0 relative z-10">
            <CheckCircle2 size={22} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-white/60">Resoluções</p>
            <h4 className="text-xl font-bold italic text-white mt-0.5">Loop Fechado</h4>
          </div>
        </div>
      </div>

      {/* 2. Menu de Abas Clínicas Flutuante */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-5">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 max-w-fit shadow-xs">
          <button
            onClick={() => handleTabChange('acolhimento')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'acolhimento'
                ? 'bg-white text-primary shadow-sm scale-102'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <Inbox size={14} />
            Acolhimento
          </button>
          
          <button
            onClick={() => handleTabChange('acompanhamento')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'acompanhamento'
                ? 'bg-white text-primary shadow-sm scale-102'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <Clock size={14} />
            Em Acompanhamento
          </button>

          <button
            onClick={() => handleTabChange('historico')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'historico'
                ? 'bg-white text-primary shadow-sm scale-102'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <CheckCircle2 size={14} />
            Histórico
          </button>
        </div>

        {/* Sub-filtros rápidos baseados no status do App Router */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'acompanhamento' && (
            <>
              <button
                onClick={() => updateFilters({ status: 'accepted' })}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  activeStatusFilter === 'accepted'
                    ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Acolhidos
              </button>
              <button
                onClick={() => updateFilters({ status: 'in-progress' })}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  activeStatusFilter === 'in-progress'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Em Progresso
              </button>
            </>
          )}

          {activeTab === 'historico' && (
            <>
              <button
                onClick={() => updateFilters({ status: 'completed' })}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  activeStatusFilter === 'completed'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Sucesso
              </button>
              <button
                onClick={() => updateFilters({ status: 'failed' })}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  activeStatusFilter === 'failed'
                    ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Evasões / Falhas
              </button>
              <button
                onClick={() => updateFilters({ status: 'cancelled' })}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  activeStatusFilter === 'cancelled'
                    ? 'bg-slate-500 text-white border-slate-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Cancelados
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3. Fila de Encaminhamentos */}
      <div className="relative">
        {isPending && (
          <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-xs z-20 flex items-center justify-center rounded-[2rem]">
            <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200/50 flex items-center gap-3 shadow-md">
              <Loader2 size={18} className="text-primary animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Recarregando Fila...</span>
            </div>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="rounded-[2.5rem] border border-slate-200/50 bg-white p-16 text-center shadow-xs flex flex-col items-center justify-center">
            <div className="size-16 rounded-[1.25rem] bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
              <Inbox size={32} />
            </div>
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-800">Fila Vazia</h3>
            <p className="text-sm font-medium text-slate-400 mt-2 max-w-sm">
              Não há nenhum encaminhamento intersetorial ativo nesta visualização para a sua unidade.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {tasks.map((task) => (
              <Card
                key={task.id}
                className="group rounded-[2rem] border border-slate-200/50 bg-white p-6 md:p-8 hover:shadow-md hover:scale-[1.005] hover:border-slate-300 transition-all duration-300"
              >
                {/* Cabeçalho do Card */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-50 pb-6 mb-6">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      {getPriorityBadge(task.priority)}
                      {getStatusBadge(task.status)}
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 group-hover:text-primary transition">
                      <User size={18} className="text-slate-400" />
                      {task.patientName}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Hash size={13} />
                        CPF: {task.patientCpf || 'Não informado'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} />
                        Criado em: {new Date(task.createdAt).toLocaleDateString('pt-BR')} às {new Date(task.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 p-3 rounded-2xl shrink-0 self-start">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400/80 flex items-center gap-1">
                      <Building size={10} /> ORIGEM DO CASO
                    </span>
                    <span className="text-slate-700 font-extrabold uppercase mt-0.5">{task.sourceUnitName}</span>
                    <span className="bg-slate-200/80 dark:bg-slate-800 px-2.5 py-1 rounded text-xs text-slate-600 dark:text-slate-300 font-black mt-1">
                      {task.sourceUnitType}
                    </span>
                  </div>
                </div>

                {/* Descrição Terapêutica / Queixa */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <FileText size={12} /> Descrição da Queixa & Objetivos do Encaminhamento
                    </h4>
                    <p className="text-sm font-medium text-slate-600 bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50 leading-relaxed italic">
                      &quot;{task.description}&quot;
                    </p>
                  </div>

                  {/* Histórico Técnico Compacto */}
                  {task.history && task.history.length > 0 && (
                    <div className="bg-slate-50/30 border border-slate-100 rounded-2xl p-5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                        <Activity size={12} /> Trilhas de Transição de Estado
                      </h4>
                      <div className="space-y-3 relative border-l border-slate-200 pl-4 ml-1">
                        {task.history.slice().reverse().map((hist, idx) => (
                          <div key={idx} className="relative">
                            <div className="absolute -left-[21px] top-1 size-2 rounded-full border border-white bg-slate-300 shadow-xs" />
                            <p className="text-xs font-bold text-slate-700">
                              Status transicionado para <span className="underline">{hist.status}</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(hist.changedAt).toLocaleDateString('pt-BR')} às {new Date(hist.changedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {hist.notes && (
                              <p className="text-xs text-slate-500 italic mt-1 bg-white p-2.5 rounded-lg border border-slate-100/50">
                                &quot;{hist.notes}&quot;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ações Dinâmicas baseadas na Máquina de Estados */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-6 border-t border-slate-100">
                    
                    {/* Botões do status 'requested' */}
                    {task.status === 'requested' && (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => openTransitionModal(task, 'fail')}
                          className="rounded-xl border border-rose-200/50 hover:bg-rose-50 text-rose-600 font-bold text-xs px-4"
                        >
                          Recusar Encaminhamento
                        </Button>
                        <Button
                          onClick={() => openTransitionModal(task, 'accept')}
                          className="rounded-xl bg-primary text-white hover:bg-primary/90 font-black text-xs px-6 shadow-md shadow-primary/10 flex items-center gap-2"
                        >
                          <UserCheck size={14} />
                          Acolher Cidadão
                        </Button>
                      </>
                    )}

                    {/* Botões do status 'accepted' */}
                    {task.status === 'accepted' && (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => openTransitionModal(task, 'fail')}
                          className="rounded-xl border border-rose-200/50 hover:bg-rose-50 text-rose-600 font-bold text-xs px-4"
                        >
                          Evasão / Falha
                        </Button>
                        <Button
                          onClick={() => openTransitionModal(task, 'start')}
                          className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 font-black text-xs px-6 shadow-md shadow-indigo-600/10 flex items-center gap-2"
                        >
                          Iniciar Acompanhamento
                          <ArrowRight size={14} />
                        </Button>
                      </>
                    )}

                    {/* Botões do status 'in-progress' */}
                    {task.status === 'in-progress' && (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => openTransitionModal(task, 'fail')}
                          className="rounded-xl border border-rose-200/50 hover:bg-rose-50 text-rose-600 font-bold text-xs px-4"
                        >
                          Registrar Evasão
                        </Button>
                        <Button
                          onClick={() => openTransitionModal(task, 'complete')}
                          className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-black text-xs px-6 shadow-md shadow-emerald-600/10 flex items-center gap-2"
                        >
                          Concluir Atendimento
                          <CheckCircle2 size={14} />
                        </Button>
                      </>
                    )}

                    {/* Botão extra para Cancelar disponível para qualquer caso não-terminal */}
                    {['requested', 'accepted', 'in-progress'].includes(task.status) && (
                      <Button
                        variant="ghost"
                        onClick={() => openTransitionModal(task, 'cancel')}
                        className="rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs px-3"
                      >
                        Cancelar
                      </Button>
                    )}

                    {/* Visualização de Casos Terminais */}
                    {['completed', 'failed', 'cancelled'].includes(task.status) && (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span>Caso Encerrado</span>
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 4. Paginação Clínica Avançada */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-slate-200/60">
          <div className="text-xs font-medium text-slate-500">
            Exibindo <span className="font-extrabold text-slate-800">{tasks.length}</span> de{' '}
            <span className="font-extrabold text-slate-800">{totalTasks}</span> encaminhamentos
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Seletor de Linhas */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mr-4">
              <span>Linhas:</span>
              <select
                value={pageSize}
                onChange={(e) => updateFilters({ pageSize: parseInt(e.target.value), page: 1 })}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 font-extrabold focus:outline-none"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
              </select>
            </div>

            <Button
              variant="outline"
              disabled={currentPage <= 1 || isPending}
              onClick={() => updateFilters({ page: currentPage - 1 })}
              className="rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold"
            >
              <ChevronLeft size={14} />
              Anterior
            </Button>

            <span className="text-xs font-black text-slate-700 bg-slate-100 border border-slate-200/50 px-3.5 py-2 rounded-xl">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              disabled={currentPage >= totalPages || isPending}
              onClick={() => updateFilters({ page: currentPage + 1 })}
              className="rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold"
            >
              Próximo
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* 5. Modais de Ação Estilizados */}
      <Dialog open={!!transitionType} onOpenChange={(open) => !open && closeTransitionModal()}>
        <DialogContent className="rounded-[2rem] border border-slate-200/50 bg-white p-8 max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-slate-800 flex items-center gap-2 mb-2">
              {transitionType === 'accept' && 'Acolher Encaminhamento'}
              {transitionType === 'start' && 'Iniciar Acompanhamento Clínico'}
              {transitionType === 'fail' && 'Registrar Falha / Evasão'}
              {transitionType === 'complete' && 'Evoluir & Concluir Atendimento'}
              {transitionType === 'cancel' && 'Cancelar Encaminhamento'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium leading-relaxed">
              {transitionType === 'accept' && 'Confirme que a unidade aceitou a demanda. Você pode registrar notas de triagem iniciais.'}
              {transitionType === 'start' && 'Confirme o início do acompanhamento terapêutico do cidadão no território.'}
              {transitionType === 'fail' && 'Exigido: Descreva em detalhes os motivos do insucesso técnico (ex: recusa de atendimento, evasão, óbito, etc.).'}
              {transitionType === 'complete' && 'Exigido: Registre a evolução terapêutica final do caso para concluir o ciclo no loop fechado.'}
              {transitionType === 'cancel' && 'Exigido: Insira os motivos de força maior para o cancelamento deste encaminhamento.'}
            </DialogDescription>
          </DialogHeader>

          {/* Área de Texto para Notas Técnicas */}
          <div className="space-y-2.5 my-4">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block">
              {['fail', 'complete', 'cancel'].includes(transitionType || '') ? 'Evolução / Notas Clínicas (Obrigatório)' : 'Evolução / Notas Clínicas (Opcional)'}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Digite aqui as anotações clínicas, de acordo com as regras de governança intersetorial..."
              rows={4}
              className="rounded-2xl border-slate-200/80 p-4 focus:ring-primary/20 text-xs font-medium leading-relaxed"
            />
          </div>

          <DialogFooter className="flex gap-2.5 pt-4 border-t border-slate-50">
            <Button
              variant="outline"
              onClick={closeTransitionModal}
              disabled={actionLoading}
              className="rounded-xl text-xs font-bold py-5"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTransitionSubmit}
              disabled={actionLoading}
              className={`rounded-xl text-xs font-black uppercase tracking-wider py-5 px-6 shadow-md flex items-center gap-2 ${
                transitionType === 'fail' || transitionType === 'cancel'
                  ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/10'
                  : transitionType === 'complete'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/10'
                  : 'bg-primary text-white hover:bg-primary/90 shadow-primary/10'
              }`}
            >
              {actionLoading && <Loader2 size={14} className="animate-spin" />}
              Confirmar Transição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
