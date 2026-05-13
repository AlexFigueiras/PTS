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
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
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
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

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

  const activeIdx = SECTIONS.findIndex((s) => s.id === active);

  const SECTION_FIELDS: Record<string, (keyof PtsFormData)[]> = {
    demographics: ['fullName', 'phone', 'cpf', 'birthDate', 'gender', 'fullAddress'],
    triagem: ['q1MainComplaint'],
    intervention: ['interventions'],
  };

  // Update completed steps when moving forward
  const goToStep = async (id: string) => {
    const targetIdx = SECTIONS.findIndex(s => s.id === id);
    
    // If moving forward, validate current section
    if (targetIdx > activeIdx) {
      const fieldsToValidate = SECTION_FIELDS[active] || [];
      const isValid = await methods.trigger(fieldsToValidate);
      
      if (!isValid) {
        toast.error('Verifique os campos obrigatórios', {
          description: 'Alguns campos desta etapa precisam ser preenchidos corretamente.'
        });
        return;
      }
      
      setCompletedSteps(prev => Array.from(new Set([...prev, active])));
    }
    
    setActive(id);
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <FormProvider {...methods}>
      <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50/50 font-sans text-foreground selection:bg-primary/20 animate-in fade-in duration-500">
        {/* Header - Modern Stepper */}
        <header className="shrink-0 border-b border-border bg-white/80 px-8 py-6 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-12">
            <div className="flex shrink-0 items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Activity size={24} />
              </div>
              <div>
                <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">PTS / Anamnese</h1>
                <p className="text-lg font-black tracking-tight text-slate-900">{patientName}</p>
              </div>
            </div>

            {/* Stepper Content */}
            <nav className="hidden flex-1 items-center justify-center xl:flex">
              <div className="flex w-full max-w-4xl items-center justify-between">
                {SECTIONS.map((section, idx) => {
                  const isActive = section.id === active;
                  const isDone = completedSteps.includes(section.id) || SECTIONS.findIndex(s => s.id === active) > idx;

                  return (
                    <React.Fragment key={section.id}>
                      <button
                        type="button"
                        onClick={() => goToStep(section.id)}
                        className={cn(
                          "group relative flex flex-col items-center gap-2 transition-all duration-300",
                          isActive ? "scale-105" : "hover:opacity-100",
                          !isActive && !isDone && "opacity-40"
                        )}
                      >
                        <div className={cn(
                          "flex size-10 items-center justify-center rounded-full border-2 transition-all duration-500",
                          isActive ? "bg-primary border-primary text-white shadow-lg shadow-primary/30" :
                          isDone ? "bg-emerald-500 border-emerald-500 text-white" :
                          "bg-white border-slate-200 text-slate-400"
                        )}>
                          {isDone && !isActive ? <CheckCircle size={18} /> : section.icon}
                        </div>
                        <span className={cn(
                          "absolute top-full mt-2 whitespace-nowrap text-[8px] font-black uppercase tracking-widest transition-colors",
                          isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                        )}>
                          {section.title}
                        </span>
                      </button>
                      {idx < SECTIONS.length - 1 && (
                        <div className="h-0.5 flex-1 mx-4 bg-slate-100 relative overflow-hidden">
                          <motion.div 
                            className="absolute inset-0 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                            initial={{ width: "0%" }}
                            animate={{ width: isDone ? "100%" : "0%" }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </nav>

            <div className="flex items-center gap-3">
              <button onClick={() => handleSave('draft')} disabled={saving}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-60">
                <Save size={14} /> {saving ? 'Salvando…' : 'Salvar Rascunho'}
              </button>
              <button onClick={() => router.push(`/patients/${patientId}`)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-all hover:bg-slate-200 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pt-8 pb-24">
          <div className="mx-auto w-full max-w-4xl px-8 md:max-w-5xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="rounded-[2.5rem] border border-slate-200/60 bg-white p-8 shadow-diffusion md:p-16"
              >
                <div className="mb-12 flex items-center gap-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/5 text-primary">
                    {SECTIONS.find(s => s.id === active)?.icon}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                      {SECTIONS.find((s) => s.id === active)?.title}
                    </h2>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Etapa {activeIdx + 1} de {SECTIONS.length}
                    </p>
                  </div>
                </div>
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
                  <Checkbox field="q7AggravatingFactors" label="Fatores Agravantes" options={['Conflitos Familiares', 'Desemprego', 'Saúde Física', 'Saúde Mental', 'Moradia', 'Financeiro', 'Judicial']} />
                  <Checkbox field="q8RecoveryFactors" label="Fatores de Recuperação" options={['Família', 'Religião', 'Acompanhamento', 'Trabalho', 'Grupos de Apoio', 'Esporte']} />
                </div>
              )}

              {active === 'nursing' && (
                <div className="space-y-10">
                  <div className="grid grid-cols-12 gap-6">
                    <Field field="nuWeight" label="Peso (kg)" className="col-span-6 md:col-span-3" />
                    <Field field="nuHeight" label="Altura (m)" className="col-span-6 md:col-span-3" />
                    <Field field="nuBloodPressure" label="Pressão Arterial" className="col-span-6 md:col-span-3" />
                    <Field field="nuOxygenSaturation" label="Saturação O2 (%)" className="col-span-6 md:col-span-3" />
                  </div>
                  <Radio field="nuChronicDisease" label="Possui doença crônica?" options={['Sim', 'Não']} />
                  {formData.nuChronicDisease === 'Sim' && <Field field="nuChronicDiseaseDetails" label="Quais doenças?" type="textarea" /> }
                  <Radio field="nuContinuousMedication" label="Usa medicação contínua?" options={['Sim', 'Não']} />
                  {formData.nuContinuousMedication === 'Sim' && <Field field="nuContinuousMedicationDetails" label="Quais medicações?" type="textarea" /> }
                  <Radio field="nuVaccinationStatus" label="Carteira de vacinação em dia?" options={['Sim', 'Não', 'Não sabe']} />
                </div>
              )}

              {active === 'ps' && (
                <div className="space-y-10">
                  <Radio field="psPreviousPsychAccount" label="Já teve acompanhamento psicológico/psiquiátrico?" options={['Sim', 'Não']} />
                  {formData.psPreviousPsychAccount === 'Sim' && <Field field="psPreviousPsychDetails" label="Quando e onde?" type="textarea" /> }
                  <div className="rounded-3xl border border-amber-500/10 bg-amber-500/5 p-10">
                    <Radio field="psSelfHarmThoughts" label="Já teve pensamentos de auto-extermínio recentemente?" options={['Sim', 'Não', 'No Passado']} />
                    {formData.psSelfHarmThoughts !== 'Não' && formData.psSelfHarmThoughts !== '' && <Field field="psSelfHarmDetails" label="Frequência e histórico" type="textarea" className="mt-6" /> }
                  </div>
                </div>
              )}

              {active === 'to' && (
                <div className="space-y-10">
                  <Radio field="toDailyIndependence" label="Realiza atividades diárias de forma independente?" options={['Sim', 'Não', 'Parcialmente']} />
                  <Radio field="toLaborActivity" label="Participa de atividade laboral?" options={['Sim', 'Não']} />
                  {formData.toLaborActivity === 'Sim' && <Field field="toLaborActivityDetails" label="Qual atividade?" type="textarea" /> }
                  <Radio field="toLeisureActivity" label="Participa de atividades de lazer?" options={['Sim', 'Não']} />
                </div>
              )}

              {active === 'ss' && (
                <div className="space-y-10">
                  <Radio field="ssLivesWithOthers" label="Mora com familiares ou outras pessoas?" options={['Sim', 'Não']} />
                  {formData.ssLivesWithOthers === 'Sim' && <Field field="ssLivesWithDetails" label="Com quem reside?" type="textarea" /> }
                  <Radio field="ssSocialBenefits" label="Recebe algum benefício social?" options={['Sim', 'Não']} />
                  {formData.ssSocialBenefits === 'Sim' && <Field field="ssSocialBenefitsDetails" label="Quais benefícios?" type="textarea" /> }
                </div>
              )}

              {active === 'ef' && (
                <div className="space-y-10">
                  <Radio field="efRegularPractice" label="Pratica atividades físicas regularmente?" options={['Sim', 'Não']} />
                  <Radio field="efPhysicalLimitation" label="Possui limitação física para exercícios?" options={['Sim', 'Não']} />
                  {formData.efPhysicalLimitation === 'Sim' && <Field field="efPhysicalLimitationDetails" label="Descreva a limitação" type="textarea" /> }
                </div>
              )}

              {active === 'nt' && (
                <div className="grid grid-cols-12 gap-8">
                  <Field field="ntDietType" label="Tipo de Alimentação Preponderante" className="col-span-12" />
                  <Field field="ntWaterIntake" label="Média de Ingestão Hídrica (Copo/L)" className="col-span-12" />
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

              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer - Navigation */}
        <footer className="shrink-0 border-t border-border bg-white/80 p-6 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <button
              type="button"
              disabled={activeIdx === 0}
              onClick={() => goToStep(SECTIONS[activeIdx - 1].id)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-0"
            >
              <ArrowLeft size={18} /> Anterior
            </button>

            <div className="flex items-center gap-4">
              {activeIdx < SECTIONS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => goToStep(SECTIONS[activeIdx + 1].id)}
                  className="flex items-center gap-3 rounded-2xl bg-primary px-12 py-4 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  Próximo <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSave('completed')}
                  disabled={saving}
                  className="flex items-center gap-3 rounded-2xl bg-emerald-500 px-12 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                >
                  FINALIZAR <CheckCircle size={20} />
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </FormProvider>
  );
}
