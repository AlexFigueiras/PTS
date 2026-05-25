'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { PtsSchema } from '@/validations/pts-schema';
import { Field, Radio, Checkbox } from '../form-primitives';
import { ScoreSelector } from '../score-selector';
import { analyzeClinicalText } from '@/lib/nlp/nlp-engine';
import { Sparkles, BrainCircuit, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function NumberStepper({
  field,
  label,
  description,
  max = 50,
}: {
  field: keyof PtsSchema;
  label: string;
  description?: string;
  max?: number;
}) {
  const { watch, setValue } = useFormContext<PtsSchema>();
  const value = (watch(field) as number) || 0;

  return (
    <div className="col-span-12 md:col-span-4 p-5 rounded-2xl border border-border/60 bg-background/10 space-y-3">
      <label className="block text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/80 leading-snug">
        {label}
      </label>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setValue(field, Math.max(0, value - 1), { shouldValidate: true, shouldDirty: true })}
          className="w-12 h-12 flex items-center justify-center rounded-xl border border-border bg-background/40 hover:bg-secondary/40 active:scale-95 text-lg font-black transition-all"
          aria-label={`Diminuir ${label}`}
        >
          -
        </button>
        <span className="text-xl font-black text-foreground tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => setValue(field, Math.min(max, value + 1), { shouldValidate: true, shouldDirty: true })}
          className="w-12 h-12 flex items-center justify-center rounded-xl border border-border bg-background/40 hover:bg-secondary/40 active:scale-95 text-lg font-black transition-all"
          aria-label={`Aumentar ${label}`}
        >
          +
        </button>
      </div>
      {description && (
        <p className="text-[9px] font-medium text-muted-foreground/60 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

export function TriagemSection() {
  const { watch, setValue, getValues } = useFormContext<PtsSchema>();
  const formData = watch();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const q1MainComplaint = formData.q1MainComplaint || '';

  // Deriva entidades detectadas reativamente via useMemo para evitar setState no effect
  const entities = useMemo(() => analyzeClinicalText(q1MainComplaint), [q1MainComplaint]);

  // Efeito para preenchimento inteligente usando getValues (evita loops e renders cascata)
  useEffect(() => {
    if (entities.length > 0) {
      const currentAggravating = getValues('q7AggravatingFactors') || [];
      const nextAggravating = [...currentAggravating];
      let changed = false;

      entities.forEach((e) => {
        if (e.tag === 'B-SDOH_HOUSING' && !nextAggravating.includes('Moradia')) {
          nextAggravating.push('Moradia');
          changed = true;
        }
        if (e.tag === 'B-MENTAL_HEALTH' && !nextAggravating.includes('Saúde Mental')) {
          nextAggravating.push('Saúde Mental');
          changed = true;
        }
        if (e.tag === 'B-LEGAL_VIOLENCE' && !nextAggravating.includes('Judicial')) {
          nextAggravating.push('Judicial');
          changed = true;
        }
        if (e.tag === 'B-SDOH_FOOD' && !nextAggravating.includes('Financeiro')) {
          nextAggravating.push('Financeiro');
          changed = true;
        }
        if (e.tag === 'B-SUBSTANCE_USE' && !nextAggravating.includes('Saúde Mental')) {
          nextAggravating.push('Saúde Mental');
          changed = true;
        }
      });

      if (changed) {
        setValue('q7AggravatingFactors', nextAggravating, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [entities, setValue, getValues]);

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Field 
          field="q1MainComplaint" 
          label="Queixa Principal / Motivo da Busca" 
          type="textarea" 
          className="col-span-12" 
        />
        
        {/* Assistente de PLN Clínico em Tempo Real */}
        <AnimatePresence>
          {entities.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl border border-primary/20 bg-primary/[0.02] p-6 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-4 text-primary">
                <BrainCircuit size={18} className="animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Detecções do Assistente Clínico</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {entities.map((e, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary shadow-sm hover:bg-primary/10 transition-colors cursor-default"
                  >
                    <Sparkles size={10} />
                    {e.label} (&quot;{e.matchedText}&quot;)
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Checkbox
        field="q2Substances"
        label="Substâncias utilizadas"
        options={['Álcool', 'Tabaco', 'Maconha', 'Cocaína', 'Crack', 'Inalantes', 'Opioides', 'Outros']}
      />
      <Field field="q3UsageTime" label="Há quanto tempo utiliza?" className="col-span-12" />
      <Radio field="q4TriedToStop" label="Já tentou parar de usar?" options={['Sim', 'Não']} />
      {formData.q4TriedToStop === 'Sim' && (
        <Checkbox
          field="q5StopMethods"
          label="Quais métodos tentou?"
          options={['Sozinho', 'Religião', 'NA/AA', 'Clínica', 'Medicação', 'CAPS AD Anterior']}
        />
      )}
      <div className="rounded-3xl border border-destructive/10 bg-destructive/5 p-10">
        <Radio field="q6PreviousHospitalization" label="Já teve alguma internação por dependência química?" options={['Sim', 'Não']} />
        {formData.q6PreviousHospitalization === 'Sim' && (
          <Field field="q6HospitalizationDetails" label="Quantas vezes e onde?" type="textarea" className="col-span-12 mt-6" />
        )}
      </div>

      {/* REVELAÇÃO PROGRESSIVA: Escalas de Triagem Clínicas e de Sofrimento Mental */}
      <div className="rounded-3xl border border-primary/10 bg-primary/[0.01] overflow-hidden transition-all duration-300">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-8 hover:bg-primary/[0.02] transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-expanded={showAdvanced}
        >
          <div className="flex items-center gap-3 text-left">
            <Activity className="text-primary animate-pulse" size={20} />
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Triagem e Escalas Clínicas Estendidas</h4>
              <p className="text-[10px] font-medium text-muted-foreground mt-1">Escore SRQ-20, crises CAPS e contadores para cálculo de alta fidelidade do IVC</p>
            </div>
          </div>
          {showAdvanced ? <ChevronUp className="text-muted-foreground" size={20} /> : <ChevronDown className="text-muted-foreground" size={20} />}
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-primary/10 p-8 space-y-8 bg-background/20"
            >
              {/* Contadores Clínicos de Triage */}
              <div>
                <h5 className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-4">Eixo Clínico: Complexidade e Histórico Recente</h5>
                <div className="grid grid-cols-12 gap-4">
                  <NumberStepper
                    field="efChronicDiseasesCount"
                    label="Doenças Crônicas"
                    description="Quantidade de comorbidades crônicas diagnosticadas"
                  />
                  <NumberStepper
                    field="efContinuousMedsCount"
                    label="Medicamentos Contínuos"
                    description="Medicamentos sob prescrição de uso diário/contínuo"
                  />
                  <NumberStepper
                    field="efEmergencyAdmissionsCount"
                    label="Admissões de Emergência"
                    description="Atendimentos em UPA ou pronto-socorro nos últimos 12 meses"
                  />
                </div>
              </div>

              {/* Sofrimento Mental e CAPS */}
              <div className="border-t border-border/50 pt-8 space-y-6">
                <h5 className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Eixo Psicológico: Sofrimento Mental e Crises</h5>
                
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 md:col-span-8 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 leading-snug">
                        Escore de Sofrimento Mental (SRQ-20)
                      </label>
                      <span className="text-[10px] font-black text-primary px-3 py-1 bg-primary/10 rounded-full tabular-nums">
                        {formData.srq20Score !== undefined && formData.srq20Score !== null ? `${formData.srq20Score} / 20` : 'Não avaliado'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={formData.srq20Score ?? 0}
                        onChange={(e) => setValue('srq20Score', parseInt(e.target.value), { shouldValidate: true, shouldDirty: true })}
                        className="w-full h-2 rounded-lg bg-border/60 accent-primary cursor-pointer transition-all focus:outline-none min-h-[48px]"
                        aria-label="Escore SRQ-20"
                      />
                    </div>
                    <p className="text-[9px] font-medium text-muted-foreground/60 leading-relaxed">
                      * O escore SRQ-20 (Self-Reporting Questionnaire) rastreia transtornos mentais comuns. Pontuações ≥ 7 (mulheres) ou ≥ 6 (homens) indicam sofrimento mental clinicamente relevante.
                    </p>
                  </div>

                  <NumberStepper
                    field="psCrisisCount"
                    label="Crises Graves CAPS"
                    description="Crises psiquiátricas agudas no CAPS no último ano"
                    max={20}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Checkbox
        field="q7AggravatingFactors"
        label="Fatores Agravantes"
        options={['Conflitos Familiares', 'Desemprego', 'Saúde Física', 'Saúde Mental', 'Moradia', 'Financeiro', 'Judicial']}
      />
      <Checkbox
        field="q8RecoveryFactors"
        label="Fatores de Recuperação"
        options={['Família', 'Religião', 'Acompanhamento', 'Trabalho', 'Grupos de Apoio', 'Esporte']}
      />
      <ScoreSelector field="q15MotivationRating" label="Grau de Motivação para o Tratamento (0-4)" className="col-span-12 mt-8" />
    </div>
  );
}

