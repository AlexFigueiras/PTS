'use client';

import { useFormContext } from 'react-hook-form';
import type { PtsSchema } from '@/validations/pts-schema';
import { Field, Radio, DomainIntro } from '../form-primitives';

export function JuridicoSection() {
  const { watch, setValue } = useFormContext<PtsSchema>();
  const formData = watch();

  return (
    <div className="space-y-10">
      <DomainIntro
        domainKey="juridico"
        label="Domínio Jurídico / Direitos"
        description="Garantia de direitos, situação de justiça e acompanhamento jurídico."
      />
      <Field field="q13JusticeInvolvement" label="Envolvimento com o sistema de justiça" type="textarea" className="col-span-12" />
      <div className="rounded-3xl border border-destructive/10 bg-destructive/5 p-10">
        <Radio
          field="lgRightsViolation"
          label="Há indícios de violação de direitos?"
          options={['Sim', 'Não', 'Em apuração']}
          onChange={(val) => {
            if (val === 'Não' || val === '') {
              setValue('lgRightsViolationDetails', undefined, { shouldValidate: true, shouldDirty: true });
            }
          }}
        />
        {formData.lgRightsViolation !== 'Não' && formData.lgRightsViolation !== '' && (
          <Field field="lgRightsViolationDetails" label="Descreva a situação" type="textarea" className="col-span-12 mt-6" />
        )}
      </div>
      <Radio
        field="lgLegalFollowUp"
        label="Possui acompanhamento jurídico (Defensoria, MP, Conselho)?"
        options={['Sim', 'Não']}
        onChange={(val) => {
          if (val !== 'Sim') {
            setValue('lgLegalFollowUpDetails', undefined, { shouldValidate: true, shouldDirty: true });
          }
        }}
      />
      {formData.lgLegalFollowUp === 'Sim' && (
        <Field field="lgLegalFollowUpDetails" label="Qual órgão e situação?" type="textarea" />
      )}
    </div>
  );
}
