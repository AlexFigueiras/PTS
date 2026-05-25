'use client';

import { useFormContext } from 'react-hook-form';
import type { PtsSchema } from '@/validations/pts-schema';
import { Field, Radio, DomainIntro } from '../form-primitives';

export function SocialSection() {
  const { watch, setValue } = useFormContext<PtsSchema>();
  const formData = watch();

  return (
    <div className="space-y-10">
      <DomainIntro
        domainKey="social"
        label="Domínio Social / Renda"
        description="Convivência, moradia, renda e acesso a benefícios e proteção social."
      />
      <Radio field="ssLivesWithOthers" label="Mora com familiares ou outras pessoas?" options={['Sim', 'Não']} />
      {formData.ssLivesWithOthers === 'Sim' && (
        <Field field="ssLivesWithDetails" label="Com quem reside?" type="textarea" />
      )}
      
      {/* CUIDADOR OU REFERÊNCIA AFETIVA */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6">
          <label className="mb-4 block text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-snug">
            Possui Cuidador ou Referência Afetiva de Apoio?
          </label>
          <div className="flex gap-2">
            {[
              { value: true, label: 'Sim' },
              { value: false, label: 'Não' }
            ].map((opt) => {
              const isSelected = formData.ssHasCaregiver === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setValue('ssHasCaregiver', opt.value, { shouldValidate: true, shouldDirty: true })}
                  className={`rounded-xl border px-6 py-3.5 min-h-[48px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.2)]' : 'border-border bg-background/30 text-muted-foreground hover:bg-secondary/30 hover:text-foreground'}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ACESSO A SANEAMENTO BÁSICO */}
        <div className="col-span-12 md:col-span-6">
          <label className="mb-4 block text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-snug">
            Possui acesso a Saneamento Básico adequado?
          </label>
          <div className="flex gap-2">
            {[
              { value: true, label: 'Sim' },
              { value: false, label: 'Não' }
            ].map((opt) => {
              const isSelected = formData.ssSaneamentoAcesso === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setValue('ssSaneamentoAcesso', opt.value, { shouldValidate: true, shouldDirty: true })}
                  className={`rounded-xl border px-6 py-3.5 min-h-[48px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.2)]' : 'border-border bg-background/30 text-muted-foreground hover:bg-secondary/30 hover:text-foreground'}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Radio field="ssSocialBenefits" label="Recebe algum benefício social?" options={['Sim', 'Não']} />
      {formData.ssSocialBenefits === 'Sim' && (
        <Field field="ssSocialBenefitsDetails" label="Quais benefícios?" type="textarea" />
      )}

      {/* RENDA FAMILIAR PER CAPITA E REDE DE APOIO */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6">
          <label className="mb-2.5 ml-1 block text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-snug">
            Renda Familiar Per Capita (R$)
          </label>
          <input
            type="number"
            placeholder="Ex: 150"
            value={formData.ssIncomePerCapita ?? ''}
            onChange={(e) => setValue('ssIncomePerCapita', e.target.value ? Number(e.target.value) : null, { shouldValidate: true, shouldDirty: true })}
            className="w-full rounded-2xl border border-border bg-background/30 px-5 py-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/20 focus:ring-4 focus:outline-none focus:border-primary focus:ring-primary/10 transition-all duration-300 min-h-[48px]"
          />
          <p className="mt-2 ml-1 text-[9px] font-medium text-muted-foreground/50 leading-relaxed">
            * Valores ≤ R$ 218 enquadram-se na linha nacional de extrema pobreza (CadÚnico).
          </p>
        </div>

        {/* ECOMAPA / VÍNCULOS COMUNITÁRIOS */}
        <div className="col-span-12 md:col-span-6 p-5 rounded-2xl border border-border/60 bg-background/10 space-y-3">
          <label className="block text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 leading-snug">
            Vínculos Comunitários / Ecomapa
          </label>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setValue('ssCommunityVinc', Math.max(0, (formData.ssCommunityVinc || 0) - 1), { shouldValidate: true, shouldDirty: true })}
              className="w-12 h-12 flex items-center justify-center rounded-xl border border-border bg-background/40 hover:bg-secondary/40 active:scale-95 text-lg font-black transition-all"
              aria-label="Diminuir vínculos"
            >
              -
            </button>
            <span className="text-sm font-black text-foreground tabular-nums">{formData.ssCommunityVinc ?? 3} contatos</span>
            <button
              type="button"
              onClick={() => setValue('ssCommunityVinc', Math.min(20, (formData.ssCommunityVinc || 0) + 1), { shouldValidate: true, shouldDirty: true })}
              className="w-12 h-12 flex items-center justify-center rounded-xl border border-border bg-background/40 hover:bg-secondary/40 active:scale-95 text-lg font-black transition-all"
              aria-label="Aumentar vínculos"
            >
              +
            </button>
          </div>
          <p className="text-[9px] font-medium text-muted-foreground/50 leading-relaxed">
            * Contatos ativos mapeados no Ecomapa. ≤ 1 contato sinaliza isolamento severo.
          </p>
        </div>
      </div>

      {/* ESCALA BRASILEIRA DE INSEGURANÇA ALIMENTAR (EBIA) */}
      <div className="space-y-4">
        <label className="block text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 leading-snug">
          Escala Brasileira de Insegurança Alimentar (EBIA)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { value: 'segurança', label: 'Segurança Alimentar', desc: 'Acesso regular e permanente a alimentos de qualidade e em quantidade suficiente.' },
            { value: 'insegurança_leve', label: 'Insegurança Leve', desc: 'Preocupação ou incerteza quanto ao acesso regular aos alimentos no futuro.' },
            { value: 'insegurança_moderada', label: 'Insegurança Moderada', desc: 'Redução quantitativa de alimentos ou ruptura nos padrões de alimentação dos adultos.' },
            { value: 'insegurança_grave', label: 'Insegurança Grave', desc: 'Fome ativa (adultos e/ou crianças ficam sem comer por falta de dinheiro).' }
          ].map((item) => {
            const isSelected = formData.ssEbiaStatus === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setValue('ssEbiaStatus', item.value as 'segurança' | 'insegurança_leve' | 'insegurança_moderada' | 'insegurança_grave', { shouldValidate: true, shouldDirty: true })}
                className={`rounded-2xl border p-5 min-h-[72px] text-left transition-all duration-300 active:scale-98 flex flex-col justify-center space-y-1.5 ${isSelected ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--primary),0.05)]' : 'border-border bg-background/30 text-muted-foreground hover:bg-secondary/30'}`}
              >
                <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                  {item.label}
                </span>
                <span className="text-[9px] font-medium text-muted-foreground/50 leading-relaxed">
                  {item.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
