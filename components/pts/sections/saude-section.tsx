'use client';

import { useFormContext } from 'react-hook-form';
import type { PtsSchema } from '@/validations/pts-schema';
import { Field, Radio, DomainIntro } from '../form-primitives';
import { ScoreSelector } from '../score-selector';

export function SaudeSection() {
  const { watch, setValue } = useFormContext<PtsSchema>();
  const formData = watch();

  return (
    <div className="space-y-10">
      <DomainIntro
        domainKey="saude"
        label="Domínio Saúde"
        description="Acesso à saúde, hábitos e autonomia no cotidiano — sem prontuário clínico."
      />
      <Radio field="ssHealthAccess" label="Possui acesso aos serviços de saúde do território?" options={['Sim', 'Não', 'Parcialmente']} />
      {formData.ssHealthAccess === 'Não' && (
        <Field field="ssHealthAccessDetails" label="Quais barreiras de acesso?" type="textarea" />
      )}
      <Radio field="efRegularPractice" label="Pratica atividades físicas regularmente?" options={['Sim', 'Não']} />
      
      {/* AVALIAÇÃO FUNCIONAL DE KATZ */}
      <div className="rounded-3xl border border-primary/10 bg-primary/[0.02] p-8 space-y-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-snug">Avaliação Funcional (Índice de Katz)</p>
          <p className="text-[9px] font-medium text-muted-foreground/60 leading-relaxed">
            Mede a independência nas 6 atividades básicas da vida diária (Banho, Vestir, Banheiro, Transferência, Continência e Alimentação).
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((score) => {
            const labelMap: Record<number, string> = {
              0: '0 - Dependência Total',
              1: '1 - Muito Dependente',
              2: '2 - Dependência Moderada',
              3: '3 - Dependência Leve',
              4: '4 - Independência Parcial',
              5: '5 - Independente em Quase Tudo',
              6: '6 - Independência Total',
            };
            const isSelected = formData.efKatzIndex === score;
            return (
              <button
                key={score}
                type="button"
                onClick={() => setValue('efKatzIndex', score, { shouldValidate: true, shouldDirty: true })}
                className={`rounded-xl border px-5 py-3.5 min-h-[48px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.2)]' : 'border-border bg-background/30 text-muted-foreground hover:bg-secondary/30 hover:text-foreground'}`}
              >
                {labelMap[score]}
              </button>
            );
          })}
        </div>
      </div>

      <Radio field="efPhysicalLimitation" label="Possui limitação física?" options={['Sim', 'Não']} />
      {formData.efPhysicalLimitation === 'Sim' && (
        <Field field="efPhysicalLimitationDetails" label="Descreva a limitação" type="textarea" />
      )}
      
      {/* ADESÃO À FARMACOTERAPIA */}
      <div className="rounded-3xl border border-primary/10 bg-primary/[0.02] p-8 space-y-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-snug">Adesão à Farmacoterapia</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'total', label: 'Adesão Total' },
            { value: 'parcial', label: 'Adesão Parcial / Irregular' },
            { value: 'nula', label: 'Adesão Nula / Recusa' }
          ].map((item) => {
            const isSelected = formData.psMedicationCompliance === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setValue('psMedicationCompliance', item.value as 'total' | 'parcial' | 'nula', { shouldValidate: true, shouldDirty: true })}
                className={`rounded-xl border px-6 py-3.5 min-h-[48px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.2)]' : 'border-border bg-background/30 text-muted-foreground hover:bg-secondary/30 hover:text-foreground'}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <Field field="ntDietType" label="Tipo de alimentação preponderante" className="col-span-12" />
      
      <div className="rounded-3xl border border-primary/10 bg-primary/[0.02] p-8 space-y-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-snug">Autonomia no cotidiano</p>
        <Radio field="toDailyIndependence" label="Realiza atividades diárias de forma independente?" options={['Sim', 'Não', 'Parcialmente']} />
        <Radio field="toLeisureActivity" label="Participa de atividades de lazer?" options={['Sim', 'Não']} />
        <ScoreSelector field="autonomia" label="Pontuação de autonomia (0-4)" className="col-span-12" />
      </div>
    </div>
  );
}
