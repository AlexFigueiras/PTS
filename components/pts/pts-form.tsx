'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Activity,
  Stethoscope,
  Briefcase,
  Brain,
  ChevronRight,
  ClipboardList,
  ArrowLeft,
  Utensils,
  Dumbbell,
  Target,
  Plus,
  Trash,
  CheckCircle,
  Clock,
  MapPin as MapIcon,
  Save,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { searchAddress, geocodeAddress } from '@/lib/geocoding';
import type { GeocodeResult } from '@/lib/geocoding';
import { PUBLIC_SERVICES, calculateDistance } from '@/lib/health-services';
import { savePtsDocument } from '@/app/(app)/patients/[id]/pts/actions';
import { useForm, FormProvider, useFormContext, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ptsSchema, type PtsSchema } from '@/validations/pts-schema';
export type PtsFormData = PtsSchema;
import { toast } from 'sonner';

const EMPTY: PtsFormData = {
  fullName: '', socialName: '', phone: '', rg: '', cpf: '',
  fatherName: '', motherName: '', responsible: '', birthDate: '', gender: '',
  cad: '', susCard: '', fullAddress: '', lat: null, lon: null,
  neighborhood: '', cep: '', streetSituation: '', nearestUbs: '',
  selfIdentification: '', profession: '', education: '', maritalStatus: '',
  mainCid: '', associatedCid: '', email: '', origin: '', destination: '',
  shortTermGoals: '', mediumTermGoals: '', longTermGoals: '', interventions: [],
  q1MainComplaint: '', q2Substances: [], q3UsageTime: '', q4TriedToStop: '',
  q5StopMethods: [], q6PreviousHospitalization: '', q6HospitalizationDetails: '',
  cCompulsion: false, cTolerance: false, cAbstinence: false, cRelief: false, cRelevance: false,
  q7AggravatingFactors: [], q8RecoveryFactors: [], q9DailyDifficulties: [], q10SkillsInterests: [],
  q11FixedHousing: '', q12FamilySupport: '', q13JusticeInvolvement: '',
  q14MentalHealthHistory: '', q15MotivationRating: '',
  nuWeight: '', nuHeight: '', nuBloodPressure: '', nuOxygenSaturation: '',
  nuChronicDisease: '', nuChronicDiseaseDetails: '', nuContinuousMedication: '',
  nuContinuousMedicationDetails: '', nuAllergy: '', nuAllergyDetails: '',
  nuVaccinationStatus: '', nuPainLevel: '', nuPainDetails: '',
  psPreviousPsychAccount: '', psPreviousPsychDetails: '', psCurrentTreatment: '',
  psSelfHarmThoughts: '', psSelfHarmDetails: '', psSleepDifficulty: '', psAnxietySadness: '',
  psDistressingMemories: '', psDistressingMemoriesDetails: '',
  toDailyIndependence: '', toCognitiveDifficulty: '', toLaborActivity: '',
  toLaborActivityDetails: '', toLeisureActivity: '', toLeisureActivityDetails: '',
  ssLivesWithOthers: '', ssLivesWithDetails: '', ssSocialBenefits: '',
  ssSocialBenefitsDetails: '', ssHealthAccess: '', ssHealthAccessDetails: '',
  efRegularPractice: '', efPhysicalLimitation: '', efPhysicalLimitationDetails: '',
  efPleasurableActivity: '', efPleasurableActivityDetails: '',
  ntDietType: '', ntWaterIntake: '',
};

const masks = {
  cpf: (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14),
  phone: (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15),
  cep: (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9),
};

const SECTIONS = [
  { id: 'demographics', title: 'Admissão', icon: <User size={18} /> },
  { id: 'triagem', title: 'PTS (Anamnese)', icon: <Activity size={18} /> },
  { id: 'nursing', title: 'Enfermagem', icon: <Stethoscope size={18} /> },
  { id: 'ps', title: 'Psicologia', icon: <Brain size={18} /> },
  { id: 'to', title: 'Terapia Ocupacional', icon: <Briefcase size={18} /> },
  { id: 'ss', title: 'Serviço Social', icon: <ClipboardList size={18} /> },
  { id: 'ef', title: 'Educação Física', icon: <Dumbbell size={18} /> },
  { id: 'nt', title: 'Nutrição', icon: <Utensils size={18} /> },
  { id: 'intervention', title: 'Plano Terapêutico', icon: <Target size={18} /> },
];

function Field({ label, field, placeholder, className = 'col-span-12 md:col-span-6', type = 'text', mask }: {
  label: string; field: keyof PtsFormData;
  placeholder?: string; className?: string; type?: string; mask?: keyof typeof masks;
}) {
  const { register, formState: { errors }, setValue } = useFormContext<PtsFormData>();
  const error = errors[field]?.message as string;

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let v = e.target.value;
    if (mask && type !== 'date') v = masks[mask](v);
    setValue(field, v as any, { shouldValidate: true, shouldDirty: true });
  };

  const fieldProps = register(field as any);

  return (
    <div className={className}>
      <label className="mb-2.5 ml-1 block text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</label>
      {type === 'textarea' ? (
        <textarea
          {...fieldProps}
          className={`min-h-[120px] w-full resize-none rounded-2xl border bg-background/30 p-5 text-sm font-medium text-foreground placeholder:text-muted-foreground/20 focus:ring-4 focus:outline-none transition-all duration-300 ${error ? 'border-destructive/50 focus:border-destructive focus:ring-destructive/10' : 'border-border focus:border-primary focus:ring-primary/10'}`}
          placeholder={placeholder || 'Digite aqui…'}
        />
      ) : (
        <input
          {...fieldProps}
          type={type}
          onChange={(e) => {
            fieldProps.onChange(e);
            handle(e);
          }}
          className={`w-full rounded-2xl border bg-background/30 px-5 py-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/20 focus:ring-4 focus:outline-none transition-all duration-300 ${error ? 'border-destructive/50 focus:border-destructive focus:ring-destructive/10' : 'border-border focus:border-primary focus:ring-primary/10'}`}
          placeholder={placeholder || '…'}
        />
      )}
      {error && <p className="mt-2 ml-1 text-[9px] font-bold text-destructive uppercase tracking-widest animate-reveal">{error}</p>}
    </div>
  );
}

function Radio({ label, field, options, className = 'col-span-12' }: {
  label: string; field: keyof PtsFormData; options: string[]; className?: string;
}) {
  const { formState: { errors }, watch, setValue } = useFormContext<PtsFormData>();
  const error = errors[field]?.message as string;
  const current = watch(field);

  return (
    <div className={className}>
      <label className="mb-4 ml-1 block text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setValue(field, opt as any, { shouldValidate: true, shouldDirty: true })}
            className={`rounded-xl border px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${current === opt ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.2)]' : 'border-border bg-background/30 text-muted-foreground hover:bg-secondary/30 hover:text-foreground'}`}
          >
            {opt}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 ml-1 text-[9px] font-bold text-destructive uppercase tracking-widest animate-reveal">{error}</p>}
    </div>
  );
}

function Checkbox({ label, field, options, className = 'col-span-12' }: {
  label: string; field: keyof PtsFormData; options: string[]; className?: string;
}) {
  const { formState: { errors }, watch, setValue } = useFormContext<PtsFormData>();
  const error = errors[field]?.message as string;
  const current = (watch(field) as string[]) || [];

  const toggle = (opt: string) => {
    const next = current.includes(opt) ? current.filter((i) => i !== opt) : [...current, opt];
    setValue(field, next as any, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className={className}>
      <label className="mb-4 ml-1 block text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-xl border px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${current.includes(opt) ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.2)]' : 'border-border bg-background/30 text-muted-foreground hover:bg-secondary/30 hover:text-foreground'}`}
          >
            {opt}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 ml-1 text-[9px] font-bold text-destructive uppercase tracking-widest animate-reveal">{error}</p>}
    </div>
  );
}

function AddressAutocomplete({ value, onChange, onSelect }: {
  value: string; onChange: (v: string) => void; onSelect: (r: GeocodeResult) => void;
}) {
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (value.length >= 3) {
        const res = await searchAddress(value);
        setSuggestions(res);
        setOpen(res.length > 0);
      } else {
        setSuggestions([]);
        setOpen(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="relative col-span-12">
      <label className="mb-2.5 ml-1 block text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Endereço Completo</label>
      <div className="relative">
        <input
          type="text"
          className="w-full rounded-2xl border border-border bg-background/30 px-5 py-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/20 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all duration-300"
          placeholder="Comece a digitar o endereço…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value.length >= 3 && setOpen(true)}
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl">
          {suggestions.map((s, i) => (
            <button key={i} type="button" className="flex w-full items-start gap-3 border-b border-border p-4 text-left transition-colors last:border-0 hover:bg-secondary/30"
              onClick={() => { onSelect(s); setOpen(false); }}>
              <MapIcon size={14} className="mt-1 shrink-0 text-muted-foreground/40" />
              <span className="text-sm font-semibold text-foreground/80">{s.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PtsForm({
  patientId,
  patientName,
  initialData,
  initialStatus,
}: {
  patientId: string;
  patientName: string;
  initialData?: Partial<PtsFormData> | null;
  initialStatus?: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState('demographics');
  const [saving, setSaving] = useState(false);

  const methods: any = useForm({
    resolver: zodResolver(ptsSchema),
    defaultValues: ({
      ...EMPTY,
      ...(initialData || {}),
      fullName: patientName,
      interventions: initialData?.interventions ?? [],
      q2Substances: initialData?.q2Substances ?? [],
      q5StopMethods: initialData?.q5StopMethods ?? [],
      q7AggravatingFactors: initialData?.q7AggravatingFactors ?? [],
      q8RecoveryFactors: initialData?.q8RecoveryFactors ?? [],
      q9DailyDifficulties: initialData?.q9DailyDifficulties ?? [],
      q10SkillsInterests: initialData?.q10SkillsInterests ?? [],
    } as any),
    mode: 'onBlur',
  });

  const { handleSubmit, setValue, watch } = methods;
  const formData: PtsFormData = watch();

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

  const sortedServices = useMemo(() => {
    if (!formData.lat || !formData.lon) return PUBLIC_SERVICES;
    return [...PUBLIC_SERVICES].sort((a, b) => calculateDistance(formData.lat!, formData.lon!, a.lat, a.lon) - calculateDistance(formData.lat!, formData.lon!, b.lat, b.lon));
  }, [formData.lat, formData.lon]);

  const onSave = async (status: 'draft' | 'completed', data: PtsFormData) => {
    setSaving(true);
    try {
      await savePtsDocument(patientId, data as unknown as Record<string, unknown>, status);
      toast.success(status === 'completed' ? 'PTS finalizado!' : 'Rascunho salvo!', {
        description: status === 'completed' ? 'O documento foi concluído com sucesso.' : 'Suas alterações foram salvas.',
      });
      if (status === 'completed') router.push(`/patients/${patientId}`);
    } catch (err) {
      toast.error('Erro ao salvar', { description: 'Ocorreu um problema ao processar sua solicitação.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = (status: 'draft' | 'completed') => {
    if (status === 'completed') {
      handleSubmit(
        (data: PtsFormData) => onSave('completed', data),
        (err: any) => {
          console.error('Validation errors:', err);
          toast.error('Campos pendentes', {
            description: 'Verifique os campos obrigatórios em vermelho.',
          });
        }
      )();
    } else {
      const currentData = watch();
      onSave('draft', currentData);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="flex min-h-[100dvh] overflow-hidden bg-background font-sans text-foreground selection:bg-primary/20">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 z-50 flex h-[100dvh] w-72 -translate-x-full flex-col overflow-hidden border-r border-border bg-card/40 backdrop-blur-2xl transition-transform lg:translate-x-0">
          <div className="flex flex-col items-center border-b border-border p-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)]">
              <Activity size={28} />
            </div>
            <h1 className="text-[11px] font-black uppercase italic tracking-[0.4em] text-primary">CAPS AD III</h1>
            <p className="mt-2 text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 italic">Presidente Prudente</p>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-6">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => setActive(s.id)}
                className={`flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-[10px] font-black uppercase italic tracking-widest transition-all duration-300 active:scale-[0.98] ${active === s.id ? 'bg-primary text-primary-foreground shadow-premium' : 'text-muted-foreground/60 hover:bg-secondary/30 hover:text-foreground'}`}>
                <span className="shrink-0">{s.icon}</span> {s.title}
              </button>
            ))}
          </nav>

          <div className="border-t border-border p-8">
            <button onClick={() => handleSave('completed')} disabled={saving}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 py-5 text-[10px] font-black uppercase italic tracking-widest text-white shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition-all hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 disabled:opacity-60">
              FINALIZAR <ChevronRight size={16} />
            </button>
            <button onClick={() => router.push(`/patients/${patientId}`)}
              className="mt-6 flex w-full items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 transition-colors hover:text-foreground">
              <ArrowLeft size={12} /> Voltar ao paciente
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-h-[100dvh] flex-1 flex-col overflow-y-auto bg-background text-foreground lg:ml-72">
          <div className="sticky top-0 z-40 border-b border-border bg-card/60 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between px-12 py-6">
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tight text-foreground animate-reveal">
                  {SECTIONS.find((s) => s.id === active)?.title}
                </h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Paciente: <span className="text-primary">{formData.fullName || 'Novo Registro'}</span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => handleSave('draft')} disabled={saving}
                  className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/30 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-foreground shadow-sm transition-all hover:bg-secondary active:scale-95 disabled:opacity-60">
                  <Save size={16} /> {saving ? 'Salvando…' : 'Salvar Rascunho'}
                </button>
              </div>
            </div>

            <div className="px-12 pb-6">
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary/20">
                <div
                  className="absolute left-0 top-0 h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all duration-700 ease-out"
                  style={{ width: `${((SECTIONS.findIndex((s) => s.id === active) + 1) / SECTIONS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-5xl p-12 pb-32 animate-reveal">
            {/* Header Card */}
            <div className="relative mb-12 flex flex-col justify-between gap-8 rounded-3xl border border-border bg-card p-12 shadow-diffusion backdrop-blur-xl md:flex-row md:items-center">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />
              <div>
                <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/40 italic">Projeto Terapêutico Singular</h1>
                <h2 className="mt-3 text-5xl font-black uppercase italic tracking-tighter text-foreground leading-none">{patientName}</h2>
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary/10 text-primary shadow-inner">
                <ShieldCheck size={40} />
              </div>
            </div>

            {/* Content Container */}
            <div className="overflow-hidden rounded-3xl border border-border bg-card/40 p-12 shadow-diffusion backdrop-blur-sm">
              {active === 'demographics' && (
                <div className="grid grid-cols-12 gap-8">
                  <Field field="fullName" label="Nome Completo" className="col-span-12" />
                  <Field field="socialName" label="Nome Social" placeholder="Como prefere ser chamado" />
                  <Field field="birthDate" label="Data de Nascimento" type="date" className="col-span-12 md:col-span-4" />
                  <Field field="cpf" label="CPF" mask="cpf" placeholder="000.000.000-00" className="col-span-12 md:col-span-4" />
                  <Field field="rg" label="RG" className="col-span-12 md:col-span-4" />
                  <Field field="susCard" label="Cartão SUS" className="col-span-12 md:col-span-6" />
                  <Field field="cad" label="CAD" className="col-span-12 md:col-span-6" />
                  <Radio field="gender" label="Gênero" options={['Masculino', 'Feminino', 'Não-Binário', 'Outros']} />
                  <AddressAutocomplete
                    value={formData.fullAddress || ''}
                    onChange={(v) => setValue('fullAddress', v)}
                    onSelect={(res) => {
                      setValue('fullAddress', res.display_name);
                      setValue('lat', parseFloat(res.lat));
                      setValue('lon', parseFloat(res.lon));
                    }}
                  />
                  <Field field="phone" label="Telefone" mask="phone" className="col-span-12 md:col-span-6" />
                  <Field field="email" label="E-mail" type="email" className="col-span-12 md:col-span-6" />
                </div>
              )}

              {active === 'triagem' && (
                <div className="space-y-12">
                  <Field field="q1MainComplaint" label="Queixa Principal / Motivo da Busca" type="textarea" className="col-span-12" />
                  <Checkbox field="q2Substances" label="Substâncias utilizadas" options={['Álcool', 'Tabaco', 'Maconha', 'Cocaína', 'Crack', 'Inalantes', 'Opioides', 'Outros']} />
                  <Field field="q3UsageTime" label="Há quanto tempo utiliza?" className="col-span-12" />
                  <Radio field="q4TriedToStop" label="Já tentou parar de usar?" options={['Sim', 'Não']} />
                  {formData.q4TriedToStop === 'Sim' && <Checkbox field="q5StopMethods" label="Quais métodos tentou?" options={['Sozinho', 'Religião', 'NA/AA', 'Clínica', 'Medicação', 'CAPS AD Anterior']} />}
                  <div className="rounded-3xl border border-destructive/10 bg-destructive/5 p-10">
                    <Radio field="q6PreviousHospitalization" label="Já teve alguma internação por dependência química?" options={['Sim', 'Não']} />
                    {formData.q6PreviousHospitalization === 'Sim' && <Field field="q6HospitalizationDetails" label="Quantas vezes e onde?" type="textarea" className="col-span-12 mt-6" />}
                  </div>
                </div>
              )}

              {active === 'intervention' && (
                <div className="space-y-16">
                  <div className="space-y-8">
                    <h3 className="flex items-center gap-3 text-lg font-black uppercase italic text-foreground/80">
                      <Target className="text-primary" size={22} /> Objetivos do Cuidado
                    </h3>
                    <div className="grid grid-cols-12 gap-8">
                      <Field field="shortTermGoals" label="Curto Prazo (Imediato)" type="textarea" className="col-span-12" />
                      <Field field="mediumTermGoals" label="Médio Prazo (Até 6 meses)" type="textarea" className="col-span-12" />
                      <Field field="longTermGoals" label="Longo Prazo (Estrutural)" type="textarea" className="col-span-12" />
                    </div>
                  </div>

                  <div className="border-t border-border pt-12">
                    <div className="mb-10 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-black uppercase italic text-foreground/80">Ações e Encaminhamentos</h3>
                        <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Vincule ações a serviços públicos de Presidente Prudente</p>
                      </div>
                      <button type="button" onClick={() => {
                        const current = formData.interventions || [];
                        setValue('interventions', [...current, { id: Date.now().toString(), description: '', service: '', status: 'pending' as const }]);
                      }}
                        className="flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95">
                        <Plus size={16} /> Adicionar Ação
                      </button>
                    </div>

                    {(!formData.interventions || formData.interventions.length === 0) ? (
                      <div className="flex flex-col items-center justify-center gap-8 rounded-3xl border border-border bg-background/20 py-20 text-muted-foreground/20">
                        <ClipboardList size={48} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhuma ação registrada</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {(formData.interventions || []).map((item: any, idx: number) => (
                          <div key={item.id} className="flex flex-col gap-6 rounded-3xl border border-border bg-card/60 p-10 md:flex-row shadow-sm">
                            <div className="flex-1 space-y-6">
                              <textarea placeholder="Descrição da ação…"
                                className="min-h-[100px] w-full resize-none rounded-2xl border border-border bg-background/30 p-6 text-sm font-medium text-foreground placeholder:text-muted-foreground/20 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all duration-300"
                                value={item.description}
                                onChange={(e) => {
                                  const l = [...(formData.interventions || [])] as any;
                                  l[idx].description = e.target.value;
                                  setValue('interventions', l);
                                }}
                              />
                              <div className="flex flex-col gap-4 md:flex-row">
                                <select className="flex-1 appearance-none rounded-2xl border border-border bg-background/30 px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground focus:border-primary focus:outline-none transition-all duration-300"
                                  value={item.service}
                                  onChange={(e) => {
                                    const l = [...(formData.interventions || [])] as any;
                                    l[idx].service = e.target.value;
                                    setValue('interventions', l);
                                  }}>
                                  <option value="">Selecione o Serviço/Unidade…</option>
                                  {sortedServices.map((s) => {
                                    const dist = formData.lat && formData.lon ? calculateDistance(formData.lat, formData.lon, s.lat, s.lon).toFixed(2) : null;
                                    return <option key={s.id} value={s.name}>{s.type} — {s.name}{dist ? ` (${dist} km)` : ''}</option>;
                                  })}
                                </select>
                                <button type="button" onClick={() => {
                                  const l = [...(formData.interventions || [])] as any;
                                  l[idx].status = l[idx].status === 'completed' ? 'pending' : 'completed';
                                  setValue('interventions', l);
                                }}
                                  className={`flex min-w-[160px] items-center justify-center gap-3 rounded-2xl px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-secondary/30 text-muted-foreground/60 border border-border'}`}>
                                  {item.status === 'completed' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                  {item.status === 'completed' ? 'Concluído' : 'Pendente'}
                                </button>
                                <button type="button" onClick={() => setValue('interventions', (formData.interventions as any[]).filter((i: any) => i.id !== item.id))}
                                  className="rounded-2xl border border-border p-5 text-muted-foreground/30 transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20">
                                  <Trash size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="mt-16 flex items-center justify-between border-t border-border pt-12">
              {active !== SECTIONS[0].id ? (
                <button
                  type="button"
                  onClick={() => {
                    const idx = SECTIONS.findIndex((s) => s.id === active);
                    setActive(SECTIONS[idx - 1].id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 px-10 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:bg-secondary active:scale-95"
                >
                  <ArrowLeft size={18} /> Anterior
                </button>
              ) : (
                <div />
              )}

              {active !== SECTIONS[SECTIONS.length - 1].id ? (
                <button
                  type="button"
                  onClick={() => {
                    const idx = SECTIONS.findIndex((s) => s.id === active);
                    setActive(SECTIONS[idx + 1].id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-3 rounded-2xl bg-primary px-12 py-5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                >
                  Próximo <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSave('completed')}
                  disabled={saving}
                  className="flex items-center gap-3 rounded-2xl bg-emerald-500 px-12 py-5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                >
                  FINALIZAR <CheckCircle size={20} />
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </FormProvider>
  );
}
