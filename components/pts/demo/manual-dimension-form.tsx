'use client';

import { useState, useTransition } from 'react';
import { Edit2, Save, AlertCircle } from 'lucide-react';
import { DIMENSIONS, DIMENSION_LABELS, type Dimension } from '@pts/domain';

type ManualDimensionInput = {
  caseId: string;
};

type DimensionValues = {
  estado: string;
  fragilidades: string;
  potencialidades: string;
  risco: 'baixo' | 'medio' | 'alto' | 'critico';
};

const EMPTY: DimensionValues = { estado: '', fragilidades: '', potencialidades: '', risco: 'baixo' };

export function ManualDimensionForm({ caseId }: ManualDimensionInput) {
  const [selectedDim, setSelectedDim] = useState<Dimension>('social');
  const [values, setValues] = useState<DimensionValues>(EMPTY);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const { saveDimensionManuallyAction } = await import('@/modules/pts/actions/dimension.action');
      const result = await saveDimensionManuallyAction({
        caseId,
        dimension: selectedDim,
        estado: values.estado,
        fragilidades: values.fragilidades.split('\n').filter(Boolean),
        potencialidades: values.potencialidades.split('\n').filter(Boolean),
        risco: values.risco,
      });
      if (result.ok) {
        setSaved(true);
        setValues(EMPTY);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {/* Banner de transição */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-bold text-amber-700">Recurso de transição</p>
          <p className="text-xs text-amber-700/80">
            Ingestão automática entra assim que o contrato e a integração com o sistema municipal forem concluídos.
            Este formulário permite preenchimento manual das Dimensões durante o período de implantação.
          </p>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <Edit2 size={14} className="text-primary" />
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
          Entrada Manual de Dimensão
        </h3>
      </div>

      {/* Seleção de dimensão */}
      <div className="mb-4">
        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          Dimensão
        </label>
        <div className="flex flex-wrap gap-2">
          {DIMENSIONS.map((dim) => (
            <button
              key={dim}
              onClick={() => setSelectedDim(dim)}
              className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${selectedDim === dim ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {DIMENSION_LABELS[dim]}
            </button>
          ))}
        </div>
      </div>

      {/* Estado */}
      <div className="mb-4">
        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          Estado Atual
        </label>
        <textarea
          value={values.estado}
          onChange={(e) => setValues((v) => ({ ...v, estado: e.target.value }))}
          rows={3}
          placeholder="Descreva o estado atual nesta dimensão..."
          className="w-full resize-none rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/30 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Fragilidades */}
        <div>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Fragilidades (uma por linha)
          </label>
          <textarea
            value={values.fragilidades}
            onChange={(e) => setValues((v) => ({ ...v, fragilidades: e.target.value }))}
            rows={4}
            placeholder="Fator de risco 1&#10;Fator de risco 2"
            className="w-full resize-none rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/30 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
        </div>

        {/* Potencialidades */}
        <div>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            Potencialidades (uma por linha)
          </label>
          <textarea
            value={values.potencialidades}
            onChange={(e) => setValues((v) => ({ ...v, potencialidades: e.target.value }))}
            rows={4}
            placeholder="Fator protetivo 1&#10;Fator protetivo 2"
            className="w-full resize-none rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/30 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </div>

      {/* Risco */}
      <div className="mb-6">
        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          Nível de Risco
        </label>
        <div className="flex flex-wrap gap-2">
          {(['baixo', 'medio', 'alto', 'critico'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setValues((v) => ({ ...v, risco: r }))}
              className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${values.risco === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isPending || !values.estado}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90 active:scale-95 disabled:opacity-50"
      >
        <Save size={12} />
        {isPending ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Dimensão'}
      </button>
    </div>
  );
}
