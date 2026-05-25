'use client';

import { useFormContext } from 'react-hook-form';
import type { PtsSchema } from '@/validations/pts-schema';
import { Field, Radio, DomainIntro } from '../form-primitives';

export function PsiquicoSection() {
  const { watch } = useFormContext<PtsSchema>();
  const formData = watch();

  return (
    <div className="space-y-10">
      <DomainIntro
        domainKey="psiquico"
        label="Domínio Psíquico"
        description="Saúde mental, sofrimento psíquico e vínculos de cuidado."
      />
      <Radio field="psPreviousPsychAccount" label="Já teve acompanhamento em saúde mental?" options={['Sim', 'Não']} />
      {formData.psPreviousPsychAccount === 'Sim' && (
        <Field field="psPreviousPsychDetails" label="Quando e onde?" type="textarea" />
      )}
      <Radio field="psCurrentTreatment" label="Está em algum acompanhamento atualmente?" options={['Sim', 'Não']} />
      <Radio field="psSleepDifficulty" label="Apresenta dificuldades de sono?" options={['Sim', 'Não', 'Às vezes']} />
      <Radio field="psAnxietySadness" label="Relata ansiedade ou tristeza frequentes?" options={['Sim', 'Não', 'Às vezes']} />
      <div className="rounded-3xl border border-amber-500/10 bg-amber-500/5 p-10">
        <Radio field="psSelfHarmThoughts" label="Pensamentos de auto-extermínio recentemente?" options={['Sim', 'Não', 'No Passado']} />
        {formData.psSelfHarmThoughts !== 'Não' && formData.psSelfHarmThoughts !== '' && (
          <Field field="psSelfHarmDetails" label="Frequência e histórico" type="textarea" className="mt-6" />
        )}
      </div>
    </div>
  );
}
