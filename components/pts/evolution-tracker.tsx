'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock, Target, Trash, History } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { createPtsEvolution } from '@/app/(app)/patients/[id]/pts/actions';
import { calculateDomainAverages, FIELD_LABELS, type PtsDomain } from '@/lib/pts/intelligence-engine';

export function EvolutionTracker({ patientId, patientName, baseline, evolutions }: { patientId: string, patientName: string, baseline: any, evolutions: any[] }) {
  const router = useRouter();
  const currentEvo = evolutions.length > 0 ? evolutions[0] : baseline;
  
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(currentEvo.data || {});
  const [scores, setScores] = useState(currentEvo.scores || {});

  const baselineAvgs = calculateDomainAverages(baseline.scores || {});
  const currentAvgs = calculateDomainAverages(scores);

  const radarData = (['Clínico', 'Psíquico', 'Social', 'Autonomia', 'Familiar'] as PtsDomain[]).map(domain => ({
    subject: domain,
    Baseline: baselineAvgs[domain] || 0,
    Atual: currentAvgs[domain] || 0,
    fullMark: 4,
  }));

  const [manualFields, setManualFields] = useState<string[]>([]);
  const baselineCriticals = Object.entries(baseline.scores || {}).filter(([_, s]) => (s as number) < 2).map(([k]) => k);
  const activeKeys = Array.from(new Set([...baselineCriticals, ...manualFields]));
  
  const availableFields = Object.entries(FIELD_LABELS).filter(([k]) => !activeKeys.includes(k));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        scores,
      };
      await createPtsEvolution(baseline.id, patientId, payload, 'completed');
      toast.success('Evolução registrada com sucesso!');
      router.push(`/patients/${patientId}`);
    } catch (err) {
      toast.error('Erro ao registrar evolução');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">Evolução Clínica</h1>
          <p className="text-sm font-medium text-muted-foreground">{patientName} — PTS v{evolutions.length + 2}.0</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:scale-105">
          {saving ? 'Salvando...' : 'Finalizar Ciclo'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-[2rem] border border-slate-200/50 bg-white p-8 shadow-sm">
          <h2 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
            <Activity size={18} /> Análise de Progresso (Radar)
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                <PolarRadiusAxis angle={30} domain={[0, 4]} />
                <Radar name="Baseline (v1.0)" dataKey="Baseline" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.4} />
                <Radar name="Evolução Atual" dataKey="Atual" stroke="#0ea5e9" fill="#38bdf8" fillOpacity={0.6} />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[2rem] border border-rose-500/10 bg-rose-500/[0.02] p-8 flex flex-col max-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-rose-500">
              <AlertTriangle size={18} /> Re-scoring Dinâmico
            </h2>
            <select 
              className="rounded-lg bg-white border border-rose-100 text-[10px] font-bold text-slate-500 px-3 py-1.5 focus:outline-none"
              value=""
              onChange={(e) => {
                if (e.target.value) setManualFields([...manualFields, e.target.value]);
              }}
            >
              <option value="">+ Adicionar Ponto Manual</option>
              {availableFields.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <p className="mb-6 text-xs font-medium text-rose-600/70">Acompanhamento das fragilidades mapeadas no baseline.</p>
          
          <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-rose-200">
            {activeKeys.length === 0 ? (
               <div className="text-center p-6 text-emerald-500 font-bold bg-emerald-500/10 rounded-2xl">
                 Nenhum fator crítico detectado na IA. Parabéns! Adicione pontos acima se necessário.
               </div>
            ) : activeKeys.length > 8 ? (
              // Lollipop Chart / Progress List Layout
              <div className="space-y-5">
                {activeKeys.map(key => (
                  <div key={key} className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-700">
                      <span>{FIELD_LABELS[key] || key}</span>
                      <span className="text-primary">{scores[key] ?? 0}</span>
                    </div>
                    <div className="relative h-2 bg-slate-100 rounded-full">
                      <input 
                        type="range" min="0" max="4" step="1"
                        value={scores[key] ?? 0}
                        onChange={(e) => setScores((s: any) => ({ ...s, [key]: parseInt(e.target.value) }))}
                        className="absolute w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all" style={{ width: `${((scores[key] ?? 0) / 4) * 100}%` }} />
                      <div className="absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-white border-2 border-primary rounded-full transition-all shadow-sm" style={{ left: `calc(${((scores[key] ?? 0) / 4) * 100}% - 8px)` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Card Layout
              activeKeys.map(key => (
                <div key={key} className="flex items-center justify-between rounded-xl bg-white p-4 border border-rose-100 shadow-sm">
                  <span className="text-xs font-bold uppercase text-slate-700">{FIELD_LABELS[key] || key}</span>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map(val => (
                      <button
                        key={val}
                        onClick={() => setScores((s: any) => ({ ...s, [key]: val }))}
                        className={`size-8 rounded-lg text-xs font-black transition ${val === scores[key] ? 'bg-primary text-white scale-110' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200/50 bg-white p-8 shadow-sm">
        <h2 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-800">
          <CheckCircle size={18} className="text-emerald-500" /> Checkpoint de Ações
        </h2>
        <div className="space-y-4">
          {(formData.interventions || []).map((item: any, idx: number) => (
            <div key={item.id} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{item.description}</p>
                <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{item.service}</p>
              </div>
              <select 
                className="rounded-xl border-none bg-white px-4 py-2 text-xs font-bold shadow-sm focus:ring-2 focus:ring-primary/20"
                value={item.status}
                onChange={(e) => {
                  const newInterventions = [...formData.interventions];
                  newInterventions[idx].status = e.target.value;
                  setFormData({ ...formData, interventions: newInterventions });
                }}
              >
                <option value="pending">Em Andamento</option>
                <option value="completed">Concluída</option>
                <option value="cancelled">Não Realizada</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200/50 bg-slate-900 p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><History size={120} /></div>
        <h2 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-300 relative z-10">
          <Target size={18} className="text-primary" /> Painel de Plano Ativo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h3 className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-3">Curto Prazo</h3>
            <p className="text-sm font-medium">{formData.shortTermGoals || 'Não definido'}</p>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h3 className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-3">Médio Prazo</h3>
            <p className="text-sm font-medium">{formData.mediumTermGoals || 'Não definido'}</p>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h3 className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-3">Longo Prazo</h3>
            <p className="text-sm font-medium">{formData.longTermGoals || 'Não definido'}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-[2rem] border border-slate-200/50 bg-white p-8 shadow-sm">
        <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-800">
          <History size={18} className="text-primary" /> Histórico de Evolução
        </h2>
        <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
          <div className="relative pl-8">
            <div className="absolute -left-[11px] top-1 h-5 w-5 rounded-full border-4 border-white bg-primary shadow-sm" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">PTS v{evolutions.length + 2}.0 (Em Andamento)</h3>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Ciclo de reavaliação atual.</p>
          </div>
          {evolutions.map((e, idx) => (
            <div key={e.id} className="relative pl-8">
              <div className="absolute -left-[11px] top-1 h-5 w-5 rounded-full border-4 border-white bg-emerald-500 shadow-sm" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">PTS v{e.version}.0</h3>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                {new Date(e.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ))}
          <div className="relative pl-8">
            <div className="absolute -left-[11px] top-1 h-5 w-5 rounded-full border-4 border-white bg-slate-300 shadow-sm" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">PTS v1.0 (Baseline)</h3>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">
              {new Date(baseline.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
