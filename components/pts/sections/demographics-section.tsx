'use client';

import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import type { PtsSchema } from '@/validations/pts-schema';
import { Field, Radio } from '../form-primitives';
import { AddressAutocomplete } from '../address-autocomplete';
import { geocodeAddress } from '@/lib/geocoding';

export function DemographicsSection() {
  const { watch, setValue } = useFormContext<PtsSchema>();
  const formData = watch();

  useEffect(() => {
    const t = setTimeout(async () => {
      if (formData.fullAddress && formData.fullAddress.length > 10 && !formData.lat && !formData.lon) {
        const coords = await geocodeAddress(formData.fullAddress);
        if (coords) {
          setValue('lat', coords.lat);
          setValue('lon', coords.lon);
        }
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [formData.fullAddress, formData.lat, formData.lon, setValue]);

  return (
    <div className="grid grid-cols-12 gap-8">
      <Field field="fullName" label="Nome Completo" className="col-span-12" />
      <Field field="socialName" label="Nome Social" placeholder="Como prefere ser chamado" />
      <Field field="birthDate" label="Data de Nascimento" type="date" className="col-span-12 md:col-span-4" />
      <Field field="cpf" label="CPF" mask="cpf" placeholder="000.000.000-00" className="col-span-12 md:col-span-4" />
      <Field field="rg" label="RG" className="col-span-12 md:col-span-4" />
      <Field field="susCard" label="Cartão SUS" className="col-span-12 md:col-span-6" />
      <Field field="cad" label="CAD" className="col-span-12 md:col-span-6" />
      <Radio field="gender" label="Gênero" options={['Masculino', 'Feminino', 'Não-Binário', 'Outros']} />
      <Field field="fatherName" label="Nome do Pai" className="col-span-12 md:col-span-6" />
      <Field field="motherName" label="Nome da Mãe" className="col-span-12 md:col-span-6" />
      <Field field="responsible" label="Responsável Legal" className="col-span-12" />
      <AddressAutocomplete
        value={formData.fullAddress || ''}
        onChange={(v) => setValue('fullAddress', v)}
        onSelect={(res) => {
          setValue('fullAddress', res.display_name);
          setValue('lat', parseFloat(res.lat));
          setValue('lon', parseFloat(res.lon));
        }}
      />
      <div className="col-span-12 grid grid-cols-2 gap-4">
        <Field field="neighborhood" label="Bairro" className="col-span-1" />
        <Field field="cep" label="CEP" mask="cep" className="col-span-1" />
      </div>
      <Field field="phone" label="Telefone" mask="phone" className="col-span-12 md:col-span-6" />
      <Field field="email" label="E-mail" type="email" className="col-span-12 md:col-span-6" />
      <Field field="profession" label="Profissão" className="col-span-12 md:col-span-4" />
      <Field field="education" label="Escolaridade" className="col-span-12 md:col-span-4" />
      <Field field="maritalStatus" label="Estado Civil" className="col-span-12 md:col-span-4" />
    </div>
  );
}
