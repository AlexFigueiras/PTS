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
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { searchAddress, geocodeAddress } from '@/lib/geocoding';
import type { GeocodeResult } from '@/lib/geocoding';
import { PUBLIC_SERVICES, calculateDistance } from '@/lib/health-services';
import { savePtsDocument, generateAiSuggestions, getPredefinedActions } from '@/app/(app)/patients/[id]/pts/actions';
import type { PredefinedAction } from '@/lib/db/schema/predefined-actions';
import { useForm, FormProvider, useFormContext, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ptsSchema, type PtsSchema } from '@/validations/pts-schema';
export type PtsFormData = PtsSchema;
import { toast } from 'sonner';
import { ScoreSelector } from './score-selector';
import { analyzePtsState, type PtsAnalysis } from '@/lib/pts/intelligence-engine';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

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
  scores: {}, risks: {}, suggestedActions: [],
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
  { id: 'dashboard', title: 'Plano Terapêutico', icon: <CheckCircle size={18} /> },
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
  const [loadingAi, setLoadingAi] = useState(false);
  const [catalog, setCatalog] = useState<PredefinedAction[]>([]);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    getPredefinedActions().then(setCatalog);
  }, []);

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
    
    if (id === 'dashboard') {
      const currentData = watch();
      const currentActions = currentData.suggestedActions || [];
      if (currentActions.length === 0) {
        const analysis = analyzePtsState(currentData);
        setValue('suggestedActions', analysis.suggestedActions);
      }

      // Trigger AI Decision Support if not already generated
      if (!currentData.vulnerabilityIndex || !currentData.aiSuggestions?.length) {
        console.log('[Frontend] Requesting AI Suggestions...');
        setLoadingAi(true);
        generateAiSuggestions(currentData)
          .then(res => {
            console.log('[Frontend] AI Suggestions received:', res);
            setValue('vulnerabilityIndex', res.vulnerability_index);
            setValue('aiSuggestions', res.suggested_actions.map((s: any) => ({
              actionId: s.action_id,
              clinicalJustification: s.clinical_justification,
              approved: false
            })));
            setValue('aiPotentialities', res.potentialities);
            setValue('aiFragilities', res.fragilities);
            
            // Auto-fill goals if they are empty
            if (!currentData.shortTermGoals) setValue('shortTermGoals', res.strategic_goals.short_term);
            if (!currentData.mediumTermGoals) setValue('mediumTermGoals', res.strategic_goals.medium_term);
            if (!currentData.longTermGoals) setValue('longTermGoals', res.strategic_goals.long_term);
          })
          .catch((err) => {
            console.error('[Frontend] AI Suggestion error:', err);
            toast.error('Falha ao gerar sugestões de IA');
          })
          .finally(() => setLoadingAi(false));
      }
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
                  <ScoreSelector field="q15MotivationRating" label="Grau de Motivação para o Tratamento (0-4)" className="col-span-12 mt-8" />
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
                    {formData.psSelfHarmThoughts !== 'Não' && formData.psSelfHarmThoughts !== '' && <Field field="psSelfHarmDetails" label="Frequência e histórico" type="textarea" className="mt-6" />}
                  </div>
                </div>
              )}

              {active === 'to' && (
                <div className="space-y-10">
                  <Radio field="toDailyIndependence" label="Realiza atividades diárias de forma independente?" options={['Sim', 'Não', 'Parcialmente']} />
                  <ScoreSelector field="toDailyIndependence" className="col-span-12" />
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
                            {active === 'dashboard' && (
                 <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                   {(() => {
                     const analysis = analyzePtsState(formData);
                     return (
                       <>
                         {/* 1. DIAGNÓSTICO E VULNERABILIDADE */}
                         <section className="space-y-8">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 rounded-[2.5rem] bg-slate-900 p-10 text-white shadow-2xl overflow-hidden relative group">
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
                              <div className="relative z-10 flex items-center gap-6">
                                <div className={cn(
                                  "flex h-24 w-24 items-center justify-center rounded-[2rem] text-5xl font-black shadow-2xl transition-transform duration-500 hover:scale-105",
                                  formData.vulnerabilityIndex === 'A' ? "bg-emerald-500 shadow-emerald-500/20" :
                                  formData.vulnerabilityIndex === 'B' ? "bg-blue-500 shadow-blue-500/20" :
                                  formData.vulnerabilityIndex === 'C' ? "bg-amber-500 shadow-amber-500/20" :
                                  formData.vulnerabilityIndex === 'D' ? "bg-orange-500 shadow-orange-500/20" :
                                  formData.vulnerabilityIndex === 'E' ? "bg-rose-500 shadow-rose-500/20" : "bg-slate-700"
                                )}>
                                  {loadingAi ? <div className="size-10 animate-spin rounded-full border-4 border-white/20 border-t-white" /> : formData.vulnerabilityIndex || '?'}
                                </div>
                                <div>
                                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Índice de Vulnerabilidade</h3>
                                  <p className="text-2xl font-black tracking-tight">Classificação de Risco Clínico</p>
                                  <div className="mt-3 flex items-center gap-2">
                                    <Badge variant="outline" className="border-white/10 text-white/60 bg-white/5 uppercase text-[8px] font-black tracking-widest">
                                      <Brain size={10} className="mr-1" /> Inteligência Assistida
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="relative z-10 flex flex-col items-end gap-3 text-right">
                                 <p className="max-w-[280px] text-[10px] font-medium leading-relaxed text-white/50">
                                   O sistema processou os escores de saúde, riscos sociais e relatos textuais para determinar a prioridade de atendimento.
                                 </p>
                                 <div className="h-1 w-24 rounded-full bg-primary/20" />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* Potentialities */}
                              <div className="rounded-[2.5rem] border border-emerald-500/10 bg-emerald-500/[0.03] p-10 backdrop-blur-sm">
                                <div className="mb-8 flex items-center gap-3 text-emerald-600">
                                  <div className="p-2 rounded-xl bg-emerald-500/10">
                                    <ShieldCheck size={20} />
                                  </div>
                                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Potencialidades Identificadas</h3>
                                </div>
                                 {loadingAi ? (
                                  <div className="flex flex-wrap gap-2.5">
                                    <Skeleton className="h-9 w-32 rounded-xl opacity-40" />
                                    <Skeleton className="h-9 w-24 rounded-xl opacity-40" />
                                    <Skeleton className="h-9 w-28 rounded-xl opacity-40" />
                                  </div>
                                ) : (formData.aiPotentialities || []).length === 0 ? (
                                  <p className="text-xs text-muted-foreground/40 italic font-medium px-2">Nenhum fator protetivo mapeado pela IA.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2.5">
                                    {(formData.aiPotentialities || []).map((p, i) => (
                                      <div key={i} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 border border-emerald-500/10 text-emerald-700 shadow-sm transition-all hover:border-emerald-500/30">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{p}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Improvement Suggestions */}
                              <div className="rounded-[2.5rem] border border-rose-500/10 bg-rose-500/[0.03] p-10 backdrop-blur-sm">
                                <div className="mb-8 flex items-center gap-3 text-rose-600">
                                  <div className="p-2 rounded-xl bg-rose-500/10">
                                    <AlertCircle size={20} />
                                  </div>
                                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Alertas de Fragilidade / Risco</h3>
                                </div>
                                {loadingAi ? (
                                  <div className="flex flex-wrap gap-2.5">
                                    <Skeleton className="h-9 w-28 rounded-xl opacity-40" />
                                    <Skeleton className="h-9 w-36 rounded-xl opacity-40" />
                                    <Skeleton className="h-9 w-24 rounded-xl opacity-40" />
                                  </div>
                                ) : (formData.aiFragilities || []).length === 0 ? (
                                  <p className="text-xs text-muted-foreground/40 italic font-medium px-2">Nenhum risco crítico detectado pela IA.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2.5">
                                    {(formData.aiFragilities || []).map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 border border-rose-500/10 text-rose-700 shadow-sm transition-all hover:border-rose-500/30">
                                          <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                          <span className="text-[10px] font-black uppercase tracking-widest">{f}</span>
                                        </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                         </section>

                         <Separator className="bg-slate-100" />

                         {/* 2. OBJETIVOS ESTRATÉGICOS (METAS GLOBAIS) */}
                         <section className="space-y-10">
                            <div className="flex items-center gap-4">
                               <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                                 <Target size={24} />
                               </div>
                               <div>
                                 <h3 className="text-xl font-black tracking-tight text-slate-900">Objetivos do Cuidado</h3>
                                 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Definição estratégica do Plano Terapêutico Singular</p>
                               </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                               <div className="col-span-1 space-y-3">
                                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Curto Prazo (Imediato)</label>
                                  <textarea 
                                    className="w-full min-h-[140px] rounded-3xl border border-slate-200 bg-slate-50/50 p-6 text-sm font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none placeholder:text-slate-300"
                                    placeholder="Ações para os próximos dias…"
                                    {...methods.register('shortTermGoals')}
                                  />
                               </div>
                               <div className="col-span-1 space-y-3">
                                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Médio Prazo (Até 6 meses)</label>
                                  <textarea 
                                    className="w-full min-h-[140px] rounded-3xl border border-slate-200 bg-slate-50/50 p-6 text-sm font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none placeholder:text-slate-300"
                                    placeholder="Metas de estabilização…"
                                    {...methods.register('mediumTermGoals')}
                                  />
                               </div>
                               <div className="col-span-1 space-y-3">
                                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Longo Prazo (Estrutural)</label>
                                  <textarea 
                                    className="w-full min-h-[140px] rounded-3xl border border-slate-200 bg-slate-50/50 p-6 text-sm font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none placeholder:text-slate-300"
                                    placeholder="Reinserção e autonomia…"
                                    {...methods.register('longTermGoals')}
                                  />
                               </div>
                            </div>
                         </section>

                         <Separator className="bg-slate-100" />

                         {/* 3. RECOMENDAÇÕES CLÍNICAS DA IA */}
                         <section className="space-y-10 rounded-[3rem] bg-slate-50/80 p-10 md:p-12 border border-slate-100">
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                             <div className="flex items-center gap-4">
                               <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/10">
                                 <Brain size={24} />
                               </div>
                               <div>
                                 <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase italic">Motor de Decisão Clínica</h3>
                                 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sugestões baseadas no catálogo de ações da unidade</p>
                               </div>
                             </div>
                             {loadingAi && (
                               <div className="flex items-center gap-3 rounded-full bg-white px-6 py-3 shadow-sm border border-slate-100 animate-pulse">
                                 <div className="size-2 rounded-full bg-primary animate-bounce" />
                                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">IA Analisando Evidências...</span>
                               </div>
                             )}
                           </div>

                           <div className="grid gap-6">
                             {loadingAi ? (
                               Array.from({ length: 3 }).map((_, i) => (
                                 <div key={i} className="rounded-[2.5rem] border border-slate-200 bg-white p-10 space-y-6">
                                    <div className="flex items-center gap-4">
                                      <Skeleton className="h-6 w-24 rounded-lg" />
                                      <Skeleton className="h-8 w-48 rounded-lg" />
                                    </div>
                                    <Skeleton className="h-12 w-full rounded-2xl" />
                                    <div className="rounded-2xl bg-slate-50 p-6 border border-slate-100 space-y-3">
                                      <Skeleton className="h-3 w-32 rounded" />
                                      <Skeleton className="h-4 w-full rounded" />
                                    </div>
                                 </div>
                               ))
                             ) : (
                               (formData.aiSuggestions || []).length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 rounded-[2.5rem] border border-dashed border-slate-200 bg-white/40">
                                    <div className="p-6 rounded-full bg-slate-100 text-slate-300">
                                      <ClipboardList size={40} />
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nenhuma recomendação disponível para este perfil.</p>
                                  </div>
                               ) : (
                                (formData.aiSuggestions || []).map((suggestion, sIdx) => {
                                  const action = catalog.find(a => a.id === suggestion.actionId);
                                  return (
                                    <motion.div 
                                      key={sIdx} 
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: sIdx * 0.1 }}
                                      className={cn(
                                        "relative overflow-hidden rounded-[2.5rem] border transition-all duration-500 group",
                                        suggestion.approved ? "border-emerald-500/30 bg-emerald-500/[0.02] shadow-lg shadow-emerald-500/5" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50"
                                      )}
                                    >
                                      <div className="flex flex-col md:flex-row">
                                        <div className="flex-1 p-10">
                                           <div className="mb-6 flex items-center gap-4">
                                             <span className="rounded-xl bg-slate-100 px-4 py-2 text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 transition-colors group-hover:bg-primary/10 group-hover:text-primary">{action?.category || 'Geral'}</span>
                                             <h4 className="text-xl font-black text-slate-900 tracking-tight">{action?.title || 'Ação do Catálogo'}</h4>
                                           </div>
                                           <p className="text-sm font-medium leading-relaxed text-slate-500 mb-8 max-w-[60ch]">{action?.description}</p>
                                           
                                           <div className="rounded-3xl bg-slate-50/50 p-8 border border-slate-100 transition-colors group-hover:bg-white group-hover:border-primary/10">
                                             <div className="flex items-center gap-2 mb-3">
                                                <Brain size={12} className="text-primary/40" />
                                                <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary italic">Justificativa Clínica</h5>
                                             </div>
                                             <p className="text-sm font-bold italic leading-relaxed text-slate-600">"{suggestion.clinicalJustification}"</p>
                                           </div>
                                        </div>
                                        
                                        <div className="flex flex-col border-t border-slate-100 md:w-72 md:border-t-0 md:border-l bg-slate-50/30 transition-colors group-hover:bg-slate-50/50">
                                           <button 
                                             type="button"
                                             onClick={() => {
                                               const next = [...(formData.aiSuggestions || [])];
                                               next[sIdx].approved = !next[sIdx].approved;
                                               setValue('aiSuggestions', next);
                                               
                                               if (next[sIdx].approved && action) {
                                                 const currentInt = formData.interventions || [];
                                                 if (!currentInt.find(i => i.description.includes(action.title))) {
                                                   setValue('interventions', [
                                                     ...currentInt,
                                                     { id: `ai-${Date.now()}`, description: `${action.title}: ${action.description}`, service: 'A definir', status: 'pending' }
                                                   ]);
                                                   toast.success('Ação adicionada ao Plano!');
                                                 }
                                               }
                                             }}
                                             className={cn(
                                               "flex flex-1 items-center justify-center gap-4 p-8 text-[11px] font-black uppercase tracking-[0.3em] transition-all active:scale-[0.98]",
                                               suggestion.approved ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-white text-slate-900 hover:bg-slate-50"
                                             )}
                                           >
                                             {suggestion.approved ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                                             {suggestion.approved ? 'Aprovado' : 'Aprovar'}
                                           </button>
                                           
                                           <div className="relative flex flex-1 p-6 flex-col justify-center gap-3">
                                             <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-2 italic">Substituir Ação:</label>
                                             <div className="relative">
                                               <select 
                                                 className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 focus:border-primary focus:outline-none transition-all cursor-pointer pr-10"
                                                 onChange={(e) => {
                                                   const next = [...(formData.aiSuggestions || [])];
                                                   next[sIdx].actionId = e.target.value;
                                                   setValue('aiSuggestions', next);
                                                 }}
                                                 value={suggestion.actionId}
                                               >
                                                 {catalog.map(a => (
                                                   <option key={a.id} value={a.id}>{a.title}</option>
                                                 ))}
                                               </select>
                                               <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                  <ChevronRight size={14} className="rotate-90" />
                                               </div>
                                             </div>
                                           </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                })
                               )
                             )}
                           </div>
                         </section>

                         <Separator className="bg-slate-100" />

                         {/* 4. PLANO DE AÇÃO FINAL (AÇÕES E ENCAMINHAMENTOS) */}
                         <section className="space-y-10">
                            <div className="flex items-center justify-between gap-6">
                              <div className="flex items-center gap-4">
                                 <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/5 text-emerald-600">
                                   <ClipboardList size={24} />
                                 </div>
                                 <div>
                                   <h3 className="text-xl font-black tracking-tight text-slate-900">Ações e Encaminhamentos</h3>
                                   <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Detalhamento prático da rede de cuidados</p>
                                 </div>
                              </div>
                              <button type="button" onClick={() => {
                                const current = formData.interventions || [];
                                setValue('interventions', [...current, { id: Date.now().toString(), description: '', service: '', status: 'pending' as const }]);
                              }}
                                className="flex items-center gap-3 rounded-2xl bg-slate-900 px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95">
                                <Plus size={18} /> Adicionar Ação Manual
                              </button>
                            </div>

                            <div className="grid gap-6">
                              {(!formData.interventions || formData.interventions.length === 0) ? (
                                <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 rounded-[3rem] border border-dashed border-slate-200 bg-slate-50/30">
                                  <div className="p-8 rounded-full bg-white text-slate-200 shadow-sm">
                                    <ClipboardList size={48} />
                                  </div>
                                  <div className="max-w-xs space-y-2">
                                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">Plano de ação vazio</p>
                                    <p className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase tracking-widest">Adicione ações manuais ou aprove as recomendações da IA acima.</p>
                                  </div>
                                </div>
                              ) : (
                                (formData.interventions || []).map((item: any, idx: number) => (
                                  <motion.div 
                                    key={item.id} 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col gap-8 rounded-[2.5rem] border border-slate-200 bg-white p-10 md:flex-row shadow-sm hover:shadow-md transition-shadow"
                                  >
                                    <div className="flex-1 space-y-8">
                                      <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Descrição da Intervenção</label>
                                        <textarea 
                                          placeholder="Ex: Encaminhar para acompanhamento na UBS de referência…"
                                          className="min-h-[120px] w-full resize-none rounded-3xl border border-slate-100 bg-slate-50/50 p-6 text-sm font-bold text-slate-700 outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5"
                                          value={item.description}
                                          onChange={(e) => {
                                            const l = [...(formData.interventions || [])] as any;
                                            l[idx].description = e.target.value;
                                            setValue('interventions', l);
                                          }}
                                        />
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Serviço/Unidade Responsável</label>
                                          <div className="relative">
                                            <select 
                                              className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none transition-all focus:border-primary focus:bg-white"
                                              value={item.service}
                                              onChange={(e) => {
                                                const l = [...(formData.interventions || [])] as any;
                                                l[idx].service = e.target.value;
                                                setValue('interventions', l);
                                              }}>
                                              <option value="">Selecione o Serviço…</option>
                                              {sortedServices.map((s) => {
                                                const dist = formData.lat && formData.lon ? calculateDistance(formData.lat, formData.lon, s.lat, s.lon).toFixed(2) : null;
                                                return <option key={s.id} value={s.name}>{s.type} — {s.name}{dist ? ` (${dist} km)` : ''}</option>;
                                              })}
                                            </select>
                                          </div>
                                        </div>
                                        <div className="space-y-3">
                                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Status da Ação</label>
                                          <button 
                                            type="button" 
                                            onClick={() => {
                                              const l = [...(formData.interventions || [])] as any;
                                              l[idx].status = l[idx].status === 'completed' ? 'pending' : 'completed';
                                              setValue('interventions', l);
                                            }}
                                            className={cn(
                                              "flex w-full items-center justify-center gap-4 rounded-2xl px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                                              item.status === 'completed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'
                                            )}>
                                            {item.status === 'completed' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                            {item.status === 'completed' ? 'Finalizada' : 'Em Aberto'}
                                          </button>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Prazo Esperado</label>
                                          <input 
                                            type="text"
                                            placeholder="Ex: Imediato, 15 dias, semanal…"
                                            className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none transition-all focus:border-primary focus:bg-white"
                                            value={item.deadline || ''}
                                            onChange={(e) => {
                                              const l = [...(formData.interventions || [])] as any;
                                              l[idx].deadline = e.target.value;
                                              setValue('interventions', l);
                                            }}
                                          />
                                        </div>
                                        <div className="space-y-3">
                                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Responsável / Profissional</label>
                                          <input 
                                            type="text"
                                            placeholder="Ex: Psicólogo, Assistente Social, Família…"
                                            className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none transition-all focus:border-primary focus:bg-white"
                                            value={item.responsible || ''}
                                            onChange={(e) => {
                                              const l = [...(formData.interventions || [])] as any;
                                              l[idx].responsible = e.target.value;
                                              setValue('interventions', l);
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center border-t border-slate-100 pt-6 md:border-t-0 md:border-l md:pl-8 md:pt-0">
                                      <button 
                                        type="button" 
                                        onClick={() => setValue('interventions', (formData.interventions as any[]).filter((i: any) => i.id !== item.id))}
                                        className="rounded-full bg-rose-50 p-4 text-rose-400 transition-all hover:bg-rose-500 hover:text-white"
                                      >
                                        <Trash size={20} />
                                      </button>
                                    </div>
                                  </motion.div>
                                ))
                              )}
                            </div>
                         </section>

                         {/* 5. AVISO LEGAL E RESPONSABILIDADE */}
                         <footer className="rounded-3xl bg-slate-900 p-10 text-white shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                              <Brain size={120} />
                           </div>
                           <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                             <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 shadow-inner backdrop-blur-md">
                                <Brain size={32} className="text-primary" />
                             </div>
                             <div className="space-y-2">
                               <h4 className="text-lg font-black uppercase tracking-tight italic">Protocolo de Segurança Clínica</h4>
                               <p className="text-[10px] font-bold leading-relaxed uppercase tracking-[0.2em] text-white/40">
                                 Este Plano Terapêutico Singular foi construído com auxílio de modelos preditivos de IA. A validação das metas, prazos e condutas é de responsabilidade técnica exclusiva do profissional de saúde assinante.
                               </p>
                             </div>
                           </div>
                         </footer>
                      </>
                    );
                  })()}
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
