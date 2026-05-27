'use client';

import { useFormContext } from 'react-hook-form';
import type { PtsSchema } from '@/validations/pts-schema';
import { Field, Radio, DomainIntro } from '../form-primitives';

export function EducacaoSection() {
  const { watch, setValue } = useFormContext<PtsSchema>();
  const formData = watch();

  return (
    <div className="space-y-10">
      <DomainIntro
        domainKey="educacao"
        label="Domínio Educação / Trabalho"
        description="Vínculo escolar, escolaridade e inserção produtiva."
      />
      <Radio
        field="edSchoolEnrollment"
        label="Está matriculado(a) ou vinculado(a) à educação?"
        options={['Sim', 'Não', 'Não se aplica']}
        onChange={(val) => {
          if (val !== 'Sim') {
            setValue('edSchoolEnrollmentDetails', undefined, { shouldValidate: true, shouldDirty: true });
          }
        }}
      />
      {formData.edSchoolEnrollment === 'Sim' && (
        <Field field="edSchoolEnrollmentDetails" label="Qual unidade de ensino?" type="textarea" />
      )}
      <Radio
        field="edLaborActivity"
        label="Participa de atividade laboral ou de geração de renda?"
        options={['Sim', 'Não']}
        onChange={(val) => {
          if (val !== 'Sim') {
            setValue('edLaborActivityDetails', undefined, { shouldValidate: true, shouldDirty: true });
          }
        }}
      />
      {formData.edLaborActivity === 'Sim' && (
        <Field field="edLaborActivityDetails" label="Qual atividade?" type="textarea" />
      )}
    </div>
  );
}
