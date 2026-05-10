'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

export interface PtsFormData {
  fullName: string;
  socialName: string;
  phone: string;
  rg: string;
  cpf: string;
  fatherName: string;
  motherName: string;
  responsible: string;
  birthDate: string;
  gender: string;
  cad: string;
  susCard: string;
  fullAddress: string;
  lat: number | null;
  lon: number | null;
  neighborhood: string;
  cep: string;
  streetSituation: string;
  nearestUbs: string;
  selfIdentification: string;
  profession: string;
  education: string;
  maritalStatus: string;
  mainCid: string;
  associatedCid: string;
  email: string;
  origin: string;
  destination: string;
  shortTermGoals: string;
  mediumTermGoals: string;
  longTermGoals: string;
  interventions: Array<{ id: string; description: string; service: string; status: 'pending' | 'completed' }>;
  q1MainComplaint: string;
  q2Substances: string[];
  q3UsageTime: string;
  q4TriedToStop: string;
  q5StopMethods: string[];
  q6PreviousHospitalization: string;
  q6HospitalizationDetails: string;
  cCompulsion: boolean;
  cTolerance: boolean;
  cAbstinence: boolean;
  cRelief: boolean;
  cRelevance: boolean;
  q7AggravatingFactors: string[];
  q8RecoveryFactors: string[];
  q9DailyDifficulties: string[];
  q10SkillsInterests: string[];
  q11FixedHousing: string;
  q12FamilySupport: string;
  q13JusticeInvolvement: string;
  q14MentalHealthHistory: string;
  q15MotivationRating: string;
  nuWeight: string;
  nuHeight: string;
  nuBloodPressure: string;
  nuOxygenSaturation: string;
  nuChronicDisease: string;
  nuChronicDiseaseDetails: string;
  nuContinuousMedication: string;
  nuContinuousMedicationDetails: string;
  nuAllergy: string;
  nuAllergyDetails: string;
  nuVaccinationStatus: string;
  nuPainLevel: string;
  nuPainDetails: string;
  psPreviousPsychAccount: string;
  psPreviousPsychDetails: string;
  psCurrentTreatment: string;
  psSelfHarmThoughts: string;
  psSelfHarmDetails: string;
  psSleepDifficulty: string;
  psAnxietySadness: string;
  psDistressingMemories: string;
  psDistressingMemoriesDetails: string;
  toDailyIndependence: string;
  toCognitiveDifficulty: string;
  toLaborActivity: string;
  toLaborActivityDetails: string;
  toLeisureActivity: string;
  toLeisureActivityDetails: string;
  ssLivesWithOthers: string;
  ssLivesWithDetails: string;
  ssSocialBenefits: string;
  ssSocialBenefitsDetails: string;
  ssHealthAccess: string;
  ssHealthAccessDetails: string;
  efRegularPractice: string;
  efPhysicalLimitation: string;
  efPhysicalLimitationDetails: string;
  efPleasurableActivity: string;
  efPleasurableActivityDetails: string;
  ntDietType: string;
  ntWaterIntake: string;
}

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

function Field({ label, value, field, onChange, placeholder, className = 'col-span-12 md:col-span-6', type = 'text', mask }: {
  label: string; value: string; field: keyof PtsFormData; onChange: (f: keyof PtsFormData, v: unknown) => void;
  placeholder?: string; className?: string; type?: string; mask?: keyof typeof masks;
}) {
  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let v = e.target.value;
    if (mask && type !== 'date') v = masks[mask](v);
    onChange(field, v);
  };
  return (
    <div className={className}>
      <label className="mb-2.5 ml-1 block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{label}</label>
      {type === 'textarea' ? (
        <textarea className="min-h-[100px] w-full resize-none rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-4 font-semibold text-slate-700 placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none" value={value || ''} onChange={handle} placeholder={placeholder || 'Digite aqui…'} />
      ) : (
        <input type={type} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-4 py-3.5 font-semibold text-slate-700 placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none" value={value || ''} onChange={handle} placeholder={placeholder || '…'} />
      )}
    </div>
  );
}

function Radio({ label, value, field, options, onChange, className = 'col-span-12' }: {
  label: string; value: string; field: keyof PtsFormData; options: string[];
  onChange: (f: keyof PtsFormData, v: unknown) => void; className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2.5 ml-1 block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{label}</label>
      <div className="flex flex-wrap gap-2.5 p-1">
        {options.map((opt) => (
          <button key={opt} type="button" onClick={() => onChange(field, opt)}
            className={`flex items-center gap-2.5 rounded-xl border-2 px-5 py-3 text-xs font-bold transition-all active:scale-95 ${value === opt ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'}`}>
            {value === opt && <CheckCircle2 size={14} />} {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function Checkbox({ label, value, field, options, onChange, className = 'col-span-12' }: {
  label: string; value: string[]; field: keyof PtsFormData; options: string[];
  onChange: (f: keyof PtsFormData, v: unknown) => void; className?: string;
}) {
  const toggle = (item: string) => {
    const list = Array.isArray(value) ? value : [];
    onChange(field, list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };
  return (
    <div className={className}>
      <label className="mb-2.5 ml-1 block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{label}</label>
      <div className="flex flex-wrap gap-2.5 p-1">
        {options.map((opt) => (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`flex items-center gap-2.5 rounded-xl border-2 px-5 py-3 text-xs font-bold transition-all active:scale-95 ${value?.includes(opt) ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'}`}>
            {value?.includes(opt) && <CheckCircle2 size={14} />} {opt}
          </button>
        ))}
      </div>
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
    <div className="col-span-12 relative">
      <label className="mb-2.5 ml-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
        Endereço Completo <MapIcon size={10} className="text-blue-500" />
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
          {loading ? <span className="text-xs">…</span> : <MapIcon size={16} />}
        </div>
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
  const [data, setData] = useState<PtsFormData>({ ...EMPTY, ...(initialData ?? {}), fullName: patientName });
  const [active, setActive] = useState('demographics');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const t = setTimeout(async () => {
      if (data.fullAddress && data.fullAddress.length > 10 && !data.lat && !data.lon) {
        const coords = await geocodeAddress(data.fullAddress);
        if (coords) setData((prev) => ({ ...prev, lat: coords.lat, lon: coords.lon }));
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [data.fullAddress, data.lat, data.lon]);

  const sortedServices = useMemo(() => {
    if (!data.lat || !data.lon) return PUBLIC_SERVICES;
    return [...PUBLIC_SERVICES].sort((a, b) => calculateDistance(data.lat!, data.lon!, a.lat, a.lon) - calculateDistance(data.lat!, data.lon!, b.lat, b.lon));
  }, [data.lat, data.lon]);

  const update = useCallback((f: keyof PtsFormData, v: unknown) => setData((prev) => ({ ...prev, [f]: v })), []);

  const handleSave = async (status: 'draft' | 'completed') => {
    setSaving(true);
    try {
      await savePtsDocument(patientId, data as unknown as Record<string, unknown>, status);
      showToast(status === 'completed' ? 'PTS finalizado!' : 'Rascunho salvo!');
      if (status === 'completed') router.push(`/patients/${patientId}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-slate-900 font-sans text-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col overflow-hidden border-r border-slate-700/50 bg-slate-900 shadow-2xl">
        <div className="flex flex-col items-center border-b border-slate-700/30 p-6">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
            <Activity size={24} />
          </div>
          <h1 className="text-base font-black uppercase italic tracking-widest text-white">CAPS AD III</h1>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 italic">Projeto Terapêutico Singular</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-5 py-3 text-xs font-bold uppercase italic tracking-widest transition-all ${active === s.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
              {s.icon} {s.title}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-700/50 p-4">
          <button onClick={() => handleSave('completed')} disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-xs font-black uppercase italic tracking-widest text-white shadow-lg transition-all hover:bg-emerald-600 disabled:opacity-60">
            FINALIZAR <ChevronRight size={16} />
          </button>
          <button onClick={() => router.push(`/patients/${patientId}`)}
            className="mt-3 flex w-full items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-white">
            <ArrowLeft size={14} /> Voltar ao paciente
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 flex h-screen flex-1 flex-col overflow-y-auto bg-slate-50 text-slate-900">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/80 px-10 py-5 shadow-sm backdrop-blur-md">
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-800">
              {SECTIONS.find((s) => s.id === active)?.title}
            </h2>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-slate-500">
              Editando: <span className="text-blue-600">{data.fullName || 'Novo Registro'}</span>
            </p>
          </div>
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-60">
            <Save size={14} /> {saving ? 'Salvando…' : 'Salvar Rascunho'}
          </button>
        </div>

        <div className="mx-auto max-w-4xl p-10 pb-32">
          {/* ADMISSÃO */}
          {active === 'demographics' && (
            <div className="grid grid-cols-12 gap-6 rounded-[2rem] border border-slate-100 bg-white p-10 shadow-xl">
              <Field field="fullName" label="Nome Completo" value={data.fullName} onChange={update} className="col-span-12" />
              <Field field="socialName" label="Nome Social" value={data.socialName} onChange={update} placeholder="Apelido ou nome social (opcional)" />
              <Field field="birthDate" label="Data de Nascimento" type="date" value={data.birthDate} onChange={update} className="col-span-12 md:col-span-4" />
              <Field field="cpf" label="CPF" value={data.cpf} onChange={update} mask="cpf" placeholder="000.000.000-00" className="col-span-12 md:col-span-4" />
              <Field field="rg" label="RG" value={data.rg} onChange={update} className="col-span-12 md:col-span-4" />
              <Field field="susCard" label="Cartão SUS" value={data.susCard} onChange={update} className="col-span-12 md:col-span-6" />
              <Field field="cad" label="CAD" value={data.cad} onChange={update} className="col-span-12 md:col-span-6" />
              <Radio field="gender" label="Gênero" value={data.gender} onChange={update} options={['Masculino', 'Feminino', 'Não-Binário', 'Outros']} />
              <AddressAutocomplete
                value={data.fullAddress}
                onChange={(v) => update('fullAddress', v)}
                onSelect={(res) => {
                  const typedNumber = data.fullAddress.match(/\d+/)?.[0];
                  let finalAddress = res.display_name;
                  if (typedNumber && !res.address?.house_number) {
                    const parts = finalAddress.split(',');
                    parts[0] = `${parts[0].trim()}, ${typedNumber}`;
                    finalAddress = parts.join(', ');
                  }
                  setData((prev) => ({ ...prev, fullAddress: finalAddress, lat: parseFloat(res.lat), lon: parseFloat(res.lon) }));
                }}
              />
              <Field field="phone" label="Telefone" value={data.phone} onChange={update} mask="phone" className="col-span-12 md:col-span-6" />
              <Field field="email" label="E-mail" type="email" value={data.email} onChange={update} className="col-span-12 md:col-span-6" />
              <Field field="profession" label="Profissão" value={data.profession} onChange={update} className="col-span-12 md:col-span-6" />
              <Field field="education" label="Escolaridade" value={data.education} onChange={update} className="col-span-12 md:col-span-6" />
              <Field field="maritalStatus" label="Estado Civil" value={data.maritalStatus} onChange={update} className="col-span-12 md:col-span-4" />
              <Field field="mainCid" label="CID Principal" value={data.mainCid} onChange={update} className="col-span-12 md:col-span-4" />
              <Field field="associatedCid" label="CID Associado" value={data.associatedCid} onChange={update} className="col-span-12 md:col-span-4" />
              <Field field="origin" label="Origem / Encaminhamento" value={data.origin} onChange={update} />
              <Field field="destination" label="Destino / Contra-referência" value={data.destination} onChange={update} />
            </div>
          )}

          {/* ANAMNESE */}
          {active === 'triagem' && (
            <div className="space-y-8 rounded-[2rem] border border-slate-100 bg-white p-10 shadow-xl">
              <Field field="q1MainComplaint" label="Queixa Principal / Motivo da Busca" value={data.q1MainComplaint} onChange={update} type="textarea" className="col-span-12" />
              <Checkbox field="q2Substances" label="Substâncias utilizadas" value={data.q2Substances} onChange={update} options={['Álcool', 'Tabaco', 'Maconha', 'Cocaína', 'Crack', 'Inalantes', 'Opioides', 'Outros']} />
              <Field field="q3UsageTime" label="Há quanto tempo utiliza?" value={data.q3UsageTime} onChange={update} className="col-span-12" />
              <Radio field="q4TriedToStop" label="Já tentou parar de usar?" value={data.q4TriedToStop} onChange={update} options={['Sim', 'Não']} />
              {data.q4TriedToStop === 'Sim' && <Checkbox field="q5StopMethods" label="Quais métodos tentou?" value={data.q5StopMethods} onChange={update} options={['Sozinho', 'Religião', 'NA/AA', 'Clínica', 'Medicação', 'CAPS AD Anterior']} />}
              <div className="rounded-3xl border border-red-100 bg-red-50/50 p-8">
                <Radio field="q6PreviousHospitalization" label="Já teve alguma internação por dependência química?" value={data.q6PreviousHospitalization} onChange={update} options={['Sim', 'Não']} />
                {data.q6PreviousHospitalization === 'Sim' && <Field field="q6HospitalizationDetails" label="Quantas vezes e onde?" value={data.q6HospitalizationDetails} onChange={update} type="textarea" className="col-span-12 mt-4" />}
              </div>
              <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-8">
                <h3 className="mb-6 text-sm font-black uppercase italic tracking-widest text-blue-600">Critérios Diagnósticos</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(['cCompulsion', 'cTolerance', 'cAbstinence', 'cRelief', 'cRelevance'] as const).map((c, i) => {
                    const labels = ['Compulsão pelo consumo', 'Aumento da tolerância', 'Síndrome de abstinência', 'Alívio da abstinência pelo consumo', 'Relevância do consumo na rotina'];
                    return (
                      <button key={c} type="button" onClick={() => update(c, !data[c])}
                        className={`rounded-xl border-2 p-4 text-left font-bold transition-all ${data[c] ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-slate-100 bg-white text-slate-500 opacity-60'}`}>
                        {labels[i]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Checkbox field="q7AggravatingFactors" label="Fatores Agravantes" value={data.q7AggravatingFactors} onChange={update} options={['Conflitos Familiares', 'Desemprego', 'Saúde Física', 'Saúde Mental', 'Moradia', 'Financeiro', 'Judicial']} />
              <Checkbox field="q8RecoveryFactors" label="Fatores de Recuperação" value={data.q8RecoveryFactors} onChange={update} options={['Família', 'Religião', 'Acompanhamento', 'Trabalho', 'Grupos de Apoio', 'Esporte']} />
              <Checkbox field="q9DailyDifficulties" label="Dificuldades na Vida Diária" value={data.q9DailyDifficulties} onChange={update} options={['Concentração', 'Memória', 'Sono', 'Comunicação', 'Higiene', 'Trabalho']} />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {(['q11FixedHousing', 'q12FamilySupport', 'q13JusticeInvolvement', 'q14MentalHealthHistory'] as const).map((f, i) => {
                  const labels = ['Local fixo para morar?', 'Suporte familiar?', 'Envolvimento com a Justiça?', 'Histórico Saúde Mental?'];
                  return <div key={f} className="rounded-2xl border bg-slate-50 p-4"><Radio field={f} label={labels[i]} value={data[f] as string} onChange={update} options={['Sim', 'Não']} className="" /></div>;
                })}
              </div>
              <Radio field="q15MotivationRating" label="Motivação para o Tratamento" value={data.q15MotivationRating} onChange={update} options={['Muito Motivado', 'Motivado mas com Dificuldades', 'Pouco Motivado', 'Inseguro']} />
            </div>
          )}

          {/* ENFERMAGEM */}
          {active === 'nursing' && (
            <div className="space-y-8 rounded-[2rem] border border-slate-100 bg-white p-10 shadow-xl">
              <div className="grid grid-cols-12 gap-6">
                <Field field="nuWeight" label="Peso (kg)" value={data.nuWeight} onChange={update} className="col-span-6 md:col-span-3" />
                <Field field="nuHeight" label="Altura (m)" value={data.nuHeight} onChange={update} className="col-span-6 md:col-span-3" />
                <Field field="nuBloodPressure" label="Pressão Arterial" value={data.nuBloodPressure} onChange={update} className="col-span-6 md:col-span-3" />
                <Field field="nuOxygenSaturation" label="Saturação O2 (%)" value={data.nuOxygenSaturation} onChange={update} className="col-span-6 md:col-span-3" />
              </div>
              <Radio field="nuChronicDisease" label="Possui doença crônica?" value={data.nuChronicDisease} onChange={update} options={['Sim', 'Não']} />
              {data.nuChronicDisease === 'Sim' && <Field field="nuChronicDiseaseDetails" label="Quais doenças?" value={data.nuChronicDiseaseDetails} onChange={update} type="textarea" className="col-span-12" />}
              <Radio field="nuContinuousMedication" label="Usa medicação contínua?" value={data.nuContinuousMedication} onChange={update} options={['Sim', 'Não']} />
              {data.nuContinuousMedication === 'Sim' && <Field field="nuContinuousMedicationDetails" label="Quais medicações?" value={data.nuContinuousMedicationDetails} onChange={update} type="textarea" className="col-span-12" />}
              <Radio field="nuAllergy" label="Tem alergia a medicamento ou alimento?" value={data.nuAllergy} onChange={update} options={['Sim', 'Não']} />
              {data.nuAllergy === 'Sim' && <Field field="nuAllergyDetails" label="Descreva as alergias" value={data.nuAllergyDetails} onChange={update} type="textarea" className="col-span-12" />}
              <Radio field="nuVaccinationStatus" label="Carteira de vacinação em dia?" value={data.nuVaccinationStatus} onChange={update} options={['Sim', 'Não', 'Não sabe']} />
              <Radio field="nuPainLevel" label="Sente dor em alguma parte do corpo?" value={data.nuPainLevel} onChange={update} options={['Sim', 'Não', 'Crônica']} />
              {data.nuPainLevel !== 'Não' && data.nuPainLevel !== '' && <Field field="nuPainDetails" label="Local e intensidade da dor" value={data.nuPainDetails} onChange={update} type="textarea" className="col-span-12" />}
            </div>
          )}

          {/* PSICOLOGIA */}
          {active === 'ps' && (
            <div className="space-y-8 rounded-[2rem] border border-slate-100 bg-white p-10 shadow-xl">
              <Radio field="psPreviousPsychAccount" label="Já teve acompanhamento psicológico/psiquiátrico?" value={data.psPreviousPsychAccount} onChange={update} options={['Sim', 'Não']} />
              {data.psPreviousPsychAccount === 'Sim' && <Field field="psPreviousPsychDetails" label="Quando e onde?" value={data.psPreviousPsychDetails} onChange={update} type="textarea" className="col-span-12" />}
              <Radio field="psCurrentTreatment" label="Atualmente em tratamento psicológico/psiquiátrico?" value={data.psCurrentTreatment} onChange={update} options={['Sim', 'Não']} />
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
                <Radio field="psSelfHarmThoughts" label="Já teve pensamentos de auto-extermínio recentemente?" value={data.psSelfHarmThoughts} onChange={update} options={['Sim', 'Não', 'No Passado']} />
                {data.psSelfHarmThoughts !== 'Não' && data.psSelfHarmThoughts !== '' && <Field field="psSelfHarmDetails" label="Frequência e histórico" value={data.psSelfHarmDetails} onChange={update} type="textarea" className="col-span-12 mt-4" />}
              </div>
              <Radio field="psSleepDifficulty" label="Dificuldade para dormir?" value={data.psSleepDifficulty} onChange={update} options={['Sim', 'Não']} />
              <Radio field="psAnxietySadness" label="Sente tristeza ou ansiedade frequente?" value={data.psAnxietySadness} onChange={update} options={['Sim', 'Não']} />
              <Radio field="psDistressingMemories" label="Há memória traumática causando sofrimento atual?" value={data.psDistressingMemories} onChange={update} options={['Sim', 'Não']} />
              {data.psDistressingMemories === 'Sim' && <Field field="psDistressingMemoriesDetails" label="Descrição (opcional)" value={data.psDistressingMemoriesDetails} onChange={update} type="textarea" className="col-span-12" />}
            </div>
          )}

          {/* TERAPIA OCUPACIONAL */}
          {active === 'to' && (
            <div className="space-y-8 rounded-[2rem] border border-slate-100 bg-white p-10 shadow-xl">
              <Radio field="toDailyIndependence" label="Realiza atividades diárias de forma independente?" value={data.toDailyIndependence} onChange={update} options={['Sim', 'Não', 'Parcialmente']} />
              <Radio field="toCognitiveDifficulty" label="Dificuldade de atenção ou memória no dia a dia?" value={data.toCognitiveDifficulty} onChange={update} options={['Sim', 'Não']} />
              <Radio field="toLaborActivity" label="Participa de atividade laboral?" value={data.toLaborActivity} onChange={update} options={['Sim', 'Não']} />
              {data.toLaborActivity === 'Sim' && <Field field="toLaborActivityDetails" label="Qual atividade?" value={data.toLaborActivityDetails} onChange={update} type="textarea" className="col-span-12" />}
              <Radio field="toLeisureActivity" label="Participa de atividades de lazer?" value={data.toLeisureActivity} onChange={update} options={['Sim', 'Não']} />
              {data.toLeisureActivity === 'Sim' && <Field field="toLeisureActivityDetails" label="Quais atividades?" value={data.toLeisureActivityDetails} onChange={update} type="textarea" className="col-span-12" />}
            </div>
          )}

          {/* SERVIÇO SOCIAL */}
          {active === 'ss' && (
            <div className="space-y-8 rounded-[2rem] border border-slate-100 bg-white p-10 shadow-xl">
              <Radio field="ssLivesWithOthers" label="Mora com familiares ou outras pessoas?" value={data.ssLivesWithOthers} onChange={update} options={['Sim', 'Não']} />
              {data.ssLivesWithOthers === 'Sim' && <Field field="ssLivesWithDetails" label="Com quem reside?" value={data.ssLivesWithDetails} onChange={update} type="textarea" className="col-span-12" />}
              <Radio field="ssSocialBenefits" label="Recebe algum benefício social?" value={data.ssSocialBenefits} onChange={update} options={['Sim', 'Não']} />
              {data.ssSocialBenefits === 'Sim' && <Field field="ssSocialBenefitsDetails" label="Quais benefícios?" value={data.ssSocialBenefitsDetails} onChange={update} type="textarea" className="col-span-12" />}
              <Radio field="ssHealthAccess" label="Tem acesso a serviços de saúde próximos?" value={data.ssHealthAccess} onChange={update} options={['Sim', 'Não']} />
              {data.ssHealthAccess === 'Não' && <Field field="ssHealthAccessDetails" label="Principal dificuldade de acesso" value={data.ssHealthAccessDetails} onChange={update} type="textarea" className="col-span-12" />}
            </div>
          )}

          {/* EDUCAÇÃO FÍSICA */}
          {active === 'ef' && (
            <div className="space-y-8 rounded-[2rem] border border-slate-100 bg-white p-10 shadow-xl">
              <Radio field="efRegularPractice" label="Pratica atividades físicas regularmente?" value={data.efRegularPractice} onChange={update} options={['Sim', 'Não']} />
              <Radio field="efPhysicalLimitation" label="Possui limitação física para exercícios?" value={data.efPhysicalLimitation} onChange={update} options={['Sim', 'Não']} />
              {data.efPhysicalLimitation === 'Sim' && <Field field="efPhysicalLimitationDetails" label="Descreva a limitação" value={data.efPhysicalLimitationDetails} onChange={update} type="textarea" className="col-span-12" />}
              <Radio field="efPleasurableActivity" label="Há atividade física que gostaria de fazer?" value={data.efPleasurableActivity} onChange={update} options={['Sim', 'Não']} />
              {data.efPleasurableActivity === 'Sim' && <Field field="efPleasurableActivityDetails" label="Quais atividades?" value={data.efPleasurableActivityDetails} onChange={update} type="textarea" className="col-span-12" />}
            </div>
          )}

          {/* NUTRIÇÃO */}
          {active === 'nt' && (
            <div className="grid grid-cols-12 gap-6 rounded-[2rem] border border-slate-100 bg-white p-10 shadow-xl">
              <Field field="ntDietType" label="Tipo de Alimentação Preponderante" value={data.ntDietType} onChange={update} className="col-span-12" />
              <Field field="ntWaterIntake" label="Média de Ingestão Hídrica (Copo/L)" value={data.ntWaterIntake} onChange={update} className="col-span-12" />
            </div>
          )}

          {/* PLANO TERAPÊUTICO */}
          {active === 'intervention' && (
            <div className="space-y-12 rounded-[2rem] border border-slate-100 bg-white p-10 shadow-xl">
              <div className="space-y-6">
                <h3 className="flex items-center gap-3 text-lg font-black uppercase italic text-slate-800">
                  <Target className="text-blue-600" size={22} /> Objetivos do Cuidado
                </h3>
                <div className="grid grid-cols-12 gap-6">
                  <Field field="shortTermGoals" label="Curto Prazo (Imediato)" value={data.shortTermGoals} onChange={update} type="textarea" className="col-span-12" />
                  <Field field="mediumTermGoals" label="Médio Prazo (Até 6 meses)" value={data.mediumTermGoals} onChange={update} type="textarea" className="col-span-12" />
                  <Field field="longTermGoals" label="Longo Prazo (Estrutural)" value={data.longTermGoals} onChange={update} type="textarea" className="col-span-12" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black uppercase italic text-slate-800">Ações e Encaminhamentos</h3>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Vincule ações a serviços públicos de Presidente Prudente</p>
                  </div>
                  <button type="button" onClick={() => update('interventions', [...data.interventions, { id: Date.now().toString(), description: '', service: '', status: 'pending' as const }])}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:scale-105">
                    <Plus size={14} /> Adicionar Ação
                  </button>
                </div>

                {data.interventions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-100 py-12 text-slate-300">
                    <ClipboardList size={40} />
                    <p className="text-xs font-bold uppercase tracking-widest">Nenhuma ação registrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.interventions.map((item, idx) => (
                      <div key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-6 md:flex-row">
                        <div className="flex-1 space-y-4">
                          <textarea placeholder="Descrição da ação…"
                            className="min-h-[70px] w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 focus:border-blue-600 focus:outline-none"
                            value={item.description}
                            onChange={(e) => { const l = [...data.interventions]; l[idx].description = e.target.value; update('interventions', l); }}
                          />
                          <div className="flex flex-col gap-3 md:flex-row">
                            <select className="flex-1 appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 focus:border-blue-600 focus:outline-none"
                              value={item.service}
                              onChange={(e) => { const l = [...data.interventions]; l[idx].service = e.target.value; update('interventions', l); }}>
                              <option value="">Selecione o Serviço/Unidade…</option>
                              {sortedServices.map((s) => {
                                const dist = data.lat && data.lon ? calculateDistance(data.lat, data.lon, s.lat, s.lon).toFixed(2) : null;
                                return <option key={s.id} value={s.name}>{s.type} — {s.name}{dist ? ` (${dist} km)` : ''}</option>;
                              })}
                            </select>
                            <button type="button" onClick={() => { const l = [...data.interventions]; l[idx].status = l[idx].status === 'completed' ? 'pending' : 'completed'; update('interventions', l); }}
                              className={`flex min-w-[130px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${item.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                              {item.status === 'completed' ? <CheckCircle size={14} /> : <Clock size={14} />}
                              {item.status === 'completed' ? 'Concluído' : 'Pendente'}
                            </button>
                            <button type="button" onClick={() => update('interventions', data.interventions.filter((i) => i.id !== item.id))}
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
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-8 right-8 z-[1000] flex items-center gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-500 px-8 py-4 font-black uppercase italic tracking-widest text-white shadow-2xl">
          <CheckCircle2 size={22} /> {toast}
        </div>
      )}
    </div>
  );
}
