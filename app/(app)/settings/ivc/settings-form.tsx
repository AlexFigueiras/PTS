'use client';

import { useState } from 'react';
import { saveIvcWeightsAction } from './actions';
import { toast } from 'sonner';
import { Scale, HeartPulse, ShieldAlert, BadgeHelp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Weights {
  alpha: number; // Clínico
  beta: number;  // Social
  gamma: number; // Psicológico
}

export function IvcSettingsForm({ initialWeights }: { initialWeights: Weights }) {
  const [alpha, setAlpha] = useState(initialWeights.alpha);
  const [beta, setBeta] = useState(initialWeights.beta);
  const [gamma, setGamma] = useState(initialWeights.gamma);
  const [saving, setSaving] = useState(false);

  const total = Number((alpha + beta + gamma).toFixed(2));
  const isValid = Math.abs(total - 1.0) < 0.001;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast.error('Pesos inválidos', {
        description: `A soma total deve ser exatamente 1.00 (100%). O valor atual é ${(total * 100).toFixed(0)}%.`
      });
      return;
    }

    setSaving(true);
    try {
      await saveIvcWeightsAction(alpha, beta, gamma);
      toast.success('Pesos atualizados com sucesso!', {
        description: 'As novas ponderações do IVC municipal já estão em vigor.'
      });
    } catch (err: any) {
      toast.error('Erro ao atualizar pesos', {
        description: err.message || 'Ocorreu um problema ao salvar as alterações.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200/60 bg-white p-8 shadow-diffusion space-y-8">
        
        {/* Clínico (Alpha) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <HeartPulse size={16} className="text-emerald-500" />
              Ponderação Clínica (α - Alpha)
            </label>
            <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
              {(alpha * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={alpha}
            onChange={(e) => setAlpha(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
            Mede a gravidade de condições de saúde física e uso abusivo de substâncias do paciente.
          </p>
        </div>

        {/* Social (Beta) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Scale size={16} className="text-blue-500" />
              Ponderação Social (β - Beta)
            </label>
            <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
              {(beta * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={beta}
            onChange={(e) => setBeta(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
            Mede vulnerabilidade socioeconômica, como situação de rua, ausência de moradia fixa e falta de benefícios sociais.
          </p>
        </div>

        {/* Psicológico (Gamma) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-500" />
              Ponderação Psíquica (γ - Gamma)
            </label>
            <span className="text-sm font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
              {(gamma * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={gamma}
            onChange={(e) => setGamma(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
            Mede o grau de sofrimento mental, crises graves do CAPS, ideação de automutilação e transtornos de ansiedade e sono.
          </p>
        </div>

        {/* Dynamic Interactive Totalizer */}
        <div className={cn(
          "rounded-2xl p-6 border flex flex-col md:flex-row justify-between items-center gap-4 transition-all duration-300",
          isValid
            ? "bg-slate-50 border-slate-200"
            : "bg-rose-50 border-rose-200"
        )}>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Soma das Ponderações</p>
            <h3 className={cn(
              "text-3xl font-black italic tracking-tight uppercase leading-none",
              isValid ? "text-slate-900" : "text-rose-600"
            )}>
              {(total * 100).toFixed(0)}%
            </h3>
          </div>

          <div className="text-right">
            {isValid ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-[10px] font-bold text-emerald-600 shadow-sm animate-in fade-in">
                ✓ Configuração Equilibrada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3.5 py-1.5 text-[10px] font-bold text-rose-600 shadow-sm animate-pulse">
                ⚠ Ajuste Necessário (A soma deve ser 100%)
              </span>
            )}
          </div>
        </div>

      </div>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={saving || !isValid}
          className={cn(
            "rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg",
            isValid
              ? "bg-primary shadow-primary/20 hover:scale-[1.02]"
              : "bg-slate-200 text-slate-400 shadow-none cursor-not-allowed"
          )}
        >
          {saving ? 'Gravando...' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  );
}
