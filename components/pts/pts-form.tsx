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
  const { register, formState: { errors }, setValue, watch } = useFormContext<PtsFormData>();
  const error = errors[field]?.message as string;

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let v = e.target.value;
    if (mask && type !== 'date') v = masks[mask](v);
    setValue(field, v as any, { shouldValidate: true, shouldDirty: true });
  };

  const fieldProps = register(field as any);

  return (
    <div className={className}>
      <label className="mb-2.5 ml-1 block text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</label>
      {type === 'textarea' ? (
        <textarea
          {...fieldProps}
          className={`min-h-[120px] w-full resize-none rounded-2xl border bg-white/5 p-5 text-sm font-medium text-white placeholder:text-slate-700 focus:ring-4 focus:outline-none transition-all duration-300 ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/10' : 'border-white/5 focus:border-blue-500 focus:ring-blue-500/10'}`}
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
          className={`w-full rounded-2xl border bg-white/5 px-5 py-4 text-sm font-medium text-white placeholder:text-slate-700 focus:ring-4 focus:outline-none transition-all duration-300 ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/10' : 'border-white/5 focus:border-blue-500 focus:ring-blue-500/10'}`}
          placeholder={placeholder || '…'}
        />
      )}
      {error && <p className="mt-2 ml-1 text-[9px] font-bold text-red-400 uppercase tracking-widest animate-reveal">{error}</p>}
    </div>
  );
}

function Radio({ label, field, options, className = 'col-span-12' }: {
  label: string; field: keyof PtsFormData; options: string[]; className?: string;
}) {
  const { control, formState: { errors }, watch, setValue } = useFormContext<PtsFormData>();
  const error = errors[field]?.message as string;
  const current = watch(field);

  return (
    <div className={className}>
      <label className="mb-4 ml-1 block text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setValue(field, opt as any, { shouldValidate: true, shouldDirty: true })}
            className={`rounded-xl border px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${current === opt ? 'border-blue-600 bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'border-white/5 bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}
          >
            {opt}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 ml-1 text-[9px] font-bold text-red-400 uppercase tracking-widest animate-reveal">{error}</p>}
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
      <label className="mb-4 ml-1 block text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-xl border px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${current.includes(opt) ? 'border-blue-600 bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'border-white/5 bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}
          >
            {opt}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 ml-1 text-[9px] font-bold text-red-400 uppercase tracking-widest animate-reveal">{error}</p>}
    </div>
  );
}

function AddressAutocomplete({ value, onChange, onSelect }: {
  value: string; onChange: (v: string) => void; onSelect: (r: GeocodeResult) => void;
}) {
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (value.length >= 3) {
        setLoading(true);
        const res = await searchAddress(value);
        setSuggestions(res);
        setOpen(res.length > 0);
        setLoading(false);
      } else {
        setSuggestions([]);
        setOpen(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="relative col-span-12">
      <label className="mb-2.5 ml-1 block text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Endereço Completo</label>
      <div className="relative">
        <input
          type="text"
          className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-4 pl-12 pr-4 font-semibold text-slate-700 placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
          placeholder="Comece a digitar o endereço…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value.length >= 3 && setOpen(true)}
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {suggestions.map((s, i) => (
            <button key={i} type="button" className="flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left transition-colors last:border-0 hover:bg-slate-50"
              onClick={() => { onSelect(s); setOpen(false); }}>
              <MapIcon size={14} className="mt-1 shrink-0 text-slate-300" />
              <span className="text-sm font-semibold text-slate-600">{s.display_name}</span>
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

  const { handleSubmit, setValue, watch, formState: { errors } } = methods;
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
      <div className="flex min-h-[100dvh] overflow-hidden bg-slate-950 font-sans text-slate-200">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 z-50 flex h-[100dvh] w-72 -translate-x-full flex-col overflow-hidden border-r border-white/5 bg-slate-900/40 backdrop-blur-2xl transition-transform lg:translate-x-0">
          <div className="flex flex-col items-center border-b border-white/5 p-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              <Activity size={28} />
            </div>
            <h1 className="text-sm font-black uppercase italic tracking-[0.2em] text-white">CAPS AD III</h1>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.3em] text-slate-500 italic">Projeto Terapêutico Singular</p>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto p-5">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => setActive(s.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-[10px] font-black uppercase italic tracking-widest transition-all duration-300 active:scale-[0.98] ${active === s.id ? 'bg-white text-slate-950 shadow-premium' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
                <span className={active === s.id ? 'text-blue-600' : 'text-slate-600'}>{s.icon}</span> {s.title}
              </button>
            ))}
          </nav>

          <div className="border-t border-white/5 p-6">
            <button onClick={() => handleSave('completed')} disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-[10px] font-black uppercase italic tracking-widest text-white shadow-[0_10px_20px_rgba(16,185,129,0.2)] transition-all hover:bg-emerald-400 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60">
              FINALIZAR <ChevronRight size={16} />
            </button>
            <button onClick={() => router.push(`/patients/${patientId}`)}
              className="mt-4 flex w-full items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600 transition-colors hover:text-white">
              <ArrowLeft size={12} /> Voltar ao paciente
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-h-[100dvh] flex-1 flex-col overflow-y-auto bg-[#0a0a0b] text-slate-200 selection:bg-blue-500/30 lg:ml-72">
          <div className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/60 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between px-12 py-6">
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tight text-white animate-reveal">
                  {SECTIONS.find((s) => s.id === active)?.title}
                </h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Paciente: <span className="text-blue-500">{formData.fullName || 'Novo Registro'}</span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => handleSave('draft')} disabled={saving}
                  className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-white/10 active:scale-95 disabled:opacity-60">
                  <Save size={16} /> {saving ? 'Salvando…' : 'Salvar Rascunho'}
                </button>
              </div>
            </div>

            {/* Stepper / Progress Bar */}
            <div className="px-12 pb-6">
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700 ease-out"
                  style={{ width: `${((SECTIONS.findIndex((s) => s.id === active) + 1) / SECTIONS.length) * 100}%` }}
                />
              </div>
              <div className="mt-4 flex justify-between px-1">
                {SECTIONS.map((s, idx) => {
                  const currentIdx = SECTIONS.findIndex((sec) => sec.id === active);
                  const isActive = active === s.id;
                  const isCompleted = currentIdx > idx;
                  return (
                    <div key={s.id} className="flex flex-col items-center">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black transition-all duration-500 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-110'
                            : isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white/5 text-slate-700'
                        }`}
                      >
                        {isCompleted ? <CheckCircle size={10} /> : idx + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-5xl p-12 pb-32 animate-reveal">
            {/* ADMISSÃO */}
            {active === 'demographics' && (
              <div className="grid grid-cols-12 gap-6 rounded-4xl border border-white/5 bg-white/5 p-12 shadow-diffusion">
                <Field field="fullName" label="Nome Completo" className="col-span-12" />
                <Field field="socialName" label="Nome Social" placeholder="Apelido ou nome social (opcional)" />
                <Field field="birthDate" label="Data de Nascimento" type="date" className="col-span-12 md:col-span-4" />
                <Field field="cpf" label="CPF" mask="cpf" placeholder="000.000.000-00" className="col-span-12 md:col-span-4" />
                <Field field="rg" label="RG" className="col-span-12 md:col-span-4" />
                <Field field="susCard" label="Cartão SUS" className="col-span-12 md:col-span-6" />
                <Field field="cad" label="CAD" className="col-span-12 md:col-span-6" />
                <Radio field="gender" label="Gênero" options={['Masculino', 'Feminino', 'Não-Binário', 'Outros']} />
                <AddressAutocomplete
                  value={formData.fullAddress}
                  onChange={(v) => setValue('fullAddress', v)}
                  onSelect={(res) => {
                    const typedNumber = formData.fullAddress.match(/\d+/)?.[0];
                    let finalAddress = res.display_name;
                    if (typedNumber && !res.address?.house_number) {
                      const parts = finalAddress.split(',');
                      parts[0] = `${parts[0].trim()}, ${typedNumber}`;
                      finalAddress = parts.join(', ');
                    }
                    setValue('fullAddress', finalAddress);
                    setValue('lat', parseFloat(res.lat));
                    setValue('lon', parseFloat(res.lon));
                  }}
                />
                <Field field="phone" label="Telefone" mask="phone" className="col-span-12 md:col-span-6" />
                <Field field="email" label="E-mail" type="email" className="col-span-12 md:col-span-6" />
                <Field field="profession" label="Profissão" className="col-span-12 md:col-span-6" />
                <Field field="education" label="Escolaridade" className="col-span-12 md:col-span-6" />
                <Field field="maritalStatus" label="Estado Civil" className="col-span-12 md:col-span-4" />
                <Field field="mainCid" label="CID Principal" className="col-span-12 md:col-span-4" />
                <Field field="associatedCid" label="CID Associado" className="col-span-12 md:col-span-4" />
                <Field field="origin" label="Origem / Encaminhamento" />
                <Field field="destination" label="Destino / Contra-referência" />
              </div>
            )}

            {/* ANAMNESE */}
            {active === 'triagem' && (
              <div className="space-y-10 rounded-4xl border border-white/5 bg-white/5 p-12 shadow-diffusion">
                <Field field="q1MainComplaint" label="Queixa Principal / Motivo da Busca" type="textarea" className="col-span-12" />
                <Checkbox field="q2Substances" label="Substâncias utilizadas" options={['Álcool', 'Tabaco', 'Maconha', 'Cocaína', 'Crack', 'Inalantes', 'Opioides', 'Outros']} />
                <Field field="q3UsageTime" label="Há quanto tempo utiliza?" className="col-span-12" />
                <Radio field="q4TriedToStop" label="Já tentou parar de usar?" options={['Sim', 'Não']} />
                {formData.q4TriedToStop === 'Sim' && <Checkbox field="q5StopMethods" label="Quais métodos tentou?" options={['Sozinho', 'Religião', 'NA/AA', 'Clínica', 'Medicação', 'CAPS AD Anterior']} />}
                <div className="rounded-3xl border border-red-100 bg-red-50/50 p-8">
                  <Radio field="q6PreviousHospitalization" label="Já teve alguma internação por dependência química?" options={['Sim', 'Não']} />
                  {formData.q6PreviousHospitalization === 'Sim' && <Field field="q6HospitalizationDetails" label="Quantas vezes e onde?" type="textarea" className="col-span-12 mt-4" />}
                </div>
                <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-8">
                  <h3 className="mb-6 text-sm font-black uppercase italic tracking-widest text-blue-600">Critérios Diagnósticos</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {(['cCompulsion', 'cTolerance', 'cAbstinence', 'cRelief', 'cRelevance'] as const).map((c, i) => {
                      const labels = ['Compulsão pelo consumo', 'Aumento da tolerância', 'Síndrome de abstinência', 'Alívio da abstinência pelo consumo', 'Relevância do consumo na rotina'];
                      const isSelected = formData[c];
                      return (
                        <button key={c} type="button" onClick={() => setValue(c, !isSelected)}
                          className={`rounded-2xl border p-5 text-left font-black uppercase tracking-widest text-[10px] transition-all duration-300 active:scale-[0.98] ${isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'border-white/5 bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}>
                          {labels[i]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Checkbox field="q7AggravatingFactors" label="Fatores Agravantes" options={['Conflitos Familiares', 'Desemprego', 'Saúde Física', 'Saúde Mental', 'Moradia', 'Financeiro', 'Judicial']} />
                <Checkbox field="q8RecoveryFactors" label="Fatores de Recuperação" options={['Família', 'Religião', 'Acompanhamento', 'Trabalho', 'Grupos de Apoio', 'Esporte']} />
                <Checkbox field="q9DailyDifficulties" label="Dificuldades na Vida Diária" options={['Concentração', 'Memória', 'Sono', 'Comunicação', 'Higiene', 'Trabalho']} />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {(['q11FixedHousing', 'q12FamilySupport', 'q13JusticeInvolvement', 'q14MentalHealthHistory'] as const).map((f, i) => {
                    const labels = ['Local fixo para morar?', 'Suporte familiar?', 'Envolvimento com a Justiça?', 'Histórico Saúde Mental?'];
                    return <div key={f} className="rounded-2xl border bg-slate-50 p-4"><Radio field={f} label={labels[i]} options={['Sim', 'Não']} /></div>;
                  })}
                </div>
                <Radio field="q15MotivationRating" label="Motivação para o Tratamento" options={['Muito Motivado', 'Motivado mas com Dificuldades', 'Pouco Motivado', 'Inseguro']} />
              </div>
            )}

            {/* ENFERMAGEM */}
            {active === 'nursing' && (
              <div className="space-y-10 rounded-4xl border border-white/5 bg-white/5 p-12 shadow-diffusion">
                <div className="grid grid-cols-12 gap-6">
                  <Field field="nuWeight" label="Peso (kg)" className="col-span-6 md:col-span-3" />
                  <Field field="nuHeight" label="Altura (m)" className="col-span-6 md:col-span-3" />
                  <Field field="nuBloodPressure" label="Pressão Arterial" className="col-span-6 md:col-span-3" />
                  <Field field="nuOxygenSaturation" label="Saturação O2 (%)" className="col-span-6 md:col-span-3" />
                </div>
                <Radio field="nuChronicDisease" label="Possui doença crônica?" options={['Sim', 'Não']} />
                {formData.nuChronicDisease === 'Sim' && <Field field="nuChronicDiseaseDetails" label="Quais doenças?" type="textarea" className="col-span-12" />}
                <Radio field="nuContinuousMedication" label="Usa medicação contínua?" options={['Sim', 'Não']} />
                {formData.nuContinuousMedication === 'Sim' && <Field field="nuContinuousMedicationDetails" label="Quais medicações?" type="textarea" className="col-span-12" />}
                <Radio field="nuAllergy" label="Tem alergia a medicamento ou alimento?" options={['Sim', 'Não']} />
                {formData.nuAllergy === 'Sim' && <Field field="nuAllergyDetails" label="Descreva as alergias" type="textarea" className="col-span-12" />}
                <Radio field="nuVaccinationStatus" label="Carteira de vacinação em dia?" options={['Sim', 'Não', 'Não sabe']} />
                <Radio field="nuPainLevel" label="Sente dor em alguma parte do corpo?" options={['Sim', 'Não', 'Crônica']} />
                {formData.nuPainLevel !== 'Não' && formData.nuPainLevel !== '' && <Field field="nuPainDetails" label="Local e intensidade da dor" type="textarea" className="col-span-12" />}
              </div>
            )}

            {/* PSICOLOGIA */}
            {active === 'ps' && (
              <div className="space-y-10 rounded-4xl border border-white/5 bg-white/5 p-12 shadow-diffusion">
                <Radio field="psPreviousPsychAccount" label="Já teve acompanhamento psicológico/psiquiátrico?" options={['Sim', 'Não']} />
                {formData.psPreviousPsychAccount === 'Sim' && <Field field="psPreviousPsychDetails" label="Quando e onde?" type="textarea" className="col-span-12" />}
                <Radio field="psCurrentTreatment" label="Atualmente em tratamento psicológico/psiquiátrico?" options={['Sim', 'Não']} />
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
                  <Radio field="psSelfHarmThoughts" label="Já teve pensamentos de auto-extermínio recentemente?" options={['Sim', 'Não', 'No Passado']} />
                  {formData.psSelfHarmThoughts !== 'Não' && formData.psSelfHarmThoughts !== '' && <Field field="psSelfHarmDetails" label="Frequência e histórico" type="textarea" className="col-span-12 mt-4" />}
                </div>
                <Radio field="psSleepDifficulty" label="Dificuldade para dormir?" options={['Sim', 'Não']} />
                <Radio field="psAnxietySadness" label="Sente tristeza ou ansiedade frequente?" options={['Sim', 'Não']} />
                <Radio field="psDistressingMemories" label="Há memória traumática causando sofrimento atual?" options={['Sim', 'Não']} />
                {formData.psDistressingMemories === 'Sim' && <Field field="psDistressingMemoriesDetails" label="Descrição (opcional)" type="textarea" className="col-span-12" />}
              </div>
            )}

            {/* TERAPIA OCUPACIONAL */}
            {active === 'to' && (
              <div className="space-y-10 rounded-4xl border border-white/5 bg-white/5 p-12 shadow-diffusion">
                <Radio field="toDailyIndependence" label="Realiza atividades diárias de forma independente?" options={['Sim', 'Não', 'Parcialmente']} />
                <Radio field="toCognitiveDifficulty" label="Dificuldade de atenção ou memória no dia a dia?" options={['Sim', 'Não']} />
                <Radio field="toLaborActivity" label="Participa de atividade laboral?" options={['Sim', 'Não']} />
                {formData.toLaborActivity === 'Sim' && <Field field="toLaborActivityDetails" label="Qual atividade?" type="textarea" className="col-span-12" />}
                <Radio field="toLeisureActivity" label="Participa de atividades de lazer?" options={['Sim', 'Não']} />
                {formData.toLeisureActivity === 'Sim' && <Field field="toLeisureActivityDetails" label="Quais atividades?" type="textarea" className="col-span-12" />}
              </div>
            )}

            {/* SERVIÇO SOCIAL */}
            {active === 'ss' && (
              <div className="space-y-10 rounded-4xl border border-white/5 bg-white/5 p-12 shadow-diffusion">
                <Radio field="ssLivesWithOthers" label="Mora com familiares ou outras pessoas?" options={['Sim', 'Não']} />
                {formData.ssLivesWithOthers === 'Sim' && <Field field="ssLivesWithDetails" label="Com quem reside?" type="textarea" className="col-span-12" />}
                <Radio field="ssSocialBenefits" label="Recebe algum benefício social?" options={['Sim', 'Não']} />
                {formData.ssSocialBenefits === 'Sim' && <Field field="ssSocialBenefitsDetails" label="Quais benefícios?" type="textarea" className="col-span-12" />}
                <Radio field="ssHealthAccess" label="Tem acesso a serviços de saúde próximos?" options={['Sim', 'Não']} />
                {formData.ssHealthAccess === 'Não' && <Field field="ssHealthAccessDetails" label="Principal dificuldade de acesso" type="textarea" className="col-span-12" />}
              </div>
            )}

            {/* EDUCAÇÃO FÍSICA */}
            {active === 'ef' && (
              <div className="space-y-10 rounded-4xl border border-white/5 bg-white/5 p-12 shadow-diffusion">
                <Radio field="efRegularPractice" label="Pratica atividades físicas regularmente?" options={['Sim', 'Não']} />
                <Radio field="efPhysicalLimitation" label="Possui limitação física para exercícios?" options={['Sim', 'Não']} />
                {formData.efPhysicalLimitation === 'Sim' && <Field field="efPhysicalLimitationDetails" label="Descreva a limitação" type="textarea" className="col-span-12" />}
                <Radio field="efPleasurableActivity" label="Há atividade física que gostaria de fazer?" options={['Sim', 'Não']} />
                {formData.efPleasurableActivity === 'Sim' && <Field field="efPleasurableActivityDetails" label="Quais atividades?" type="textarea" className="col-span-12" />}
              </div>
            )}

            {/* NUTRIÇÃO */}
            {active === 'nt' && (
              <div className="grid grid-cols-12 gap-6 rounded-4xl border border-white/5 bg-white/5 p-12 shadow-diffusion">
                <Field field="ntDietType" label="Tipo de Alimentação Preponderante" className="col-span-12" />
                <Field field="ntWaterIntake" label="Média de Ingestão Hídrica (Copo/L)" className="col-span-12" />
              </div>
            )}

            {/* PLANO TERAPÊUTICO */}
            {active === 'intervention' && (
              <div className="space-y-12 rounded-4xl border border-white/5 bg-white/5 p-12 shadow-diffusion">
                <div className="space-y-6">
                  <h3 className="flex items-center gap-3 text-lg font-black uppercase italic text-slate-800">
                    <Target className="text-blue-600" size={22} /> Objetivos do Cuidado
                  </h3>
                  <div className="grid grid-cols-12 gap-6">
                    <Field field="shortTermGoals" label="Curto Prazo (Imediato)" type="textarea" className="col-span-12" />
                    <Field field="mediumTermGoals" label="Médio Prazo (Até 6 meses)" type="textarea" className="col-span-12" />
                    <Field field="longTermGoals" label="Longo Prazo (Estrutural)" type="textarea" className="col-span-12" />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-8">
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black uppercase italic text-slate-800">Ações e Encaminhamentos</h3>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Vincule ações a serviços públicos de Presidente Prudente</p>
                    </div>
                    <button type="button" onClick={() => {
                      const current = formData.interventions || [];
                      setValue('interventions', [...current, { id: Date.now().toString(), description: '', service: '', status: 'pending' as const }]);
                    }}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:scale-105">
                      <Plus size={14} /> Adicionar Ação
                    </button>
                  </div>

                  {(!formData.interventions || formData.interventions.length === 0) ? (
                    <div className="flex flex-col items-center justify-center gap-6 rounded-4xl border border-white/5 bg-white/5 py-16 text-slate-700 shadow-diffusion">
                      <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white/5 text-slate-500">
                        <ClipboardList size={32} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Nenhuma ação registrada</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(formData.interventions || []).map((item: any, idx: number) => (
                        <div key={item.id} className="flex flex-col gap-5 rounded-3xl border border-white/5 bg-white/5 p-8 md:flex-row">
                          <div className="flex-1 space-y-4">
                            <textarea placeholder="Descrição da ação…"
                              className="min-h-[80px] w-full resize-none rounded-2xl border border-white/5 bg-white/5 p-5 text-sm font-medium text-white placeholder:text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-300"
                              value={item.description}
                              onChange={(e) => {
                                const l = [...(formData.interventions || [])] as any;
                                l[idx].description = e.target.value;
                                setValue('interventions', l);
                              }}
                            />
                            <div className="flex flex-col gap-4 md:flex-row">
                              <select className="flex-1 appearance-none rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 focus:border-blue-500 focus:outline-none transition-all duration-300"
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
                                className={`flex min-w-[140px] items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[9px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-500'}`}>
                                {item.status === 'completed' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                {item.status === 'completed' ? 'Concluído' : 'Pendente'}
                              </button>
                              <button type="button" onClick={() => setValue('interventions', formData.interventions.filter((i) => i.id !== item.id))}
                                className="rounded-xl p-3 text-slate-300 transition-all hover:bg-red-50 hover:text-red-500">
                                <Trash size={16} />
                              </button>
                            </div>
                            {item.service && (
                              <p className="ml-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                {PUBLIC_SERVICES.find((s) => s.name === item.service)?.address}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-16 flex items-center justify-between border-t border-white/5 pt-10">
            {active !== SECTIONS[0].id ? (
              <button
                type="button"
                onClick={() => {
                  const idx = SECTIONS.findIndex((s) => s.id === active);
                  setActive(SECTIONS[idx - 1].id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-white/10 hover:text-white active:scale-95"
              >
                <ArrowLeft size={16} /> Anterior
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
                className="flex items-center gap-3 rounded-2xl bg-blue-600 px-10 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-blue-500 hover:-translate-y-0.5 active:scale-95"
              >
                Próximo <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave('completed')}
                disabled={saving}
                className="flex items-center gap-3 rounded-2xl bg-emerald-500 px-10 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-emerald-400 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
              >
                FINALIZAR <CheckCircle size={18} />
              </button>
            )}
          </div>
        </div>
      </main>
      </div>
    </FormProvider>
  );
}
