'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  User,
  Activity,
  Brain,
  HeartPulse,
  HandHeart,
  Scale,
  GraduationCap,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  Save,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PUBLIC_SERVICES, calculateDistance } from '@/lib/health-services';
import { savePtsDocument, generateAiSuggestions, getPredefinedActions } from '@/app/(app)/patients/[id]/pts/actions';
import type { PredefinedAction } from '@/lib/db/schema/predefined-actions';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ptsSchema, type PtsSchema } from '@/validations/pts-schema';
import { toast } from 'sonner';
import { analyzePtsState } from '@/lib/pts/intelligence-engine';
import { Skeleton } from '@/components/ui/skeleton';

import { DemographicsSection } from './sections/demographics-section';
import { TriagemSection } from './sections/triagem-section';
import { OfflineStore } from '@/lib/offline/offline-store';

import { SyncStatusBadge } from '@/components/layout/sync-status-badge';

// Seções pesadas (domínios e dashboard) carregam sob demanda para reduzir
// o bundle inicial. O dashboard usa framer-motion intensamente e só é
// renderizado na última etapa do fluxo.
const SectionSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-12 w-1/2 rounded-2xl opacity-40" />
    <Skeleton className="h-32 w-full rounded-3xl opacity-30" />
    <Skeleton className="h-32 w-full rounded-3xl opacity-30" />
  </div>
);

const PsiquicoSection = dynamic(() => import('./sections/psiquico-section').then((m) => m.PsiquicoSection), {
  loading: SectionSkeleton,
});
const SaudeSection = dynamic(() => import('./sections/saude-section').then((m) => m.SaudeSection), {
  loading: SectionSkeleton,
});
const SocialSection = dynamic(() => import('./sections/social-section').then((m) => m.SocialSection), {
  loading: SectionSkeleton,
});
const JuridicoSection = dynamic(() => import('./sections/juridico-section').then((m) => m.JuridicoSection), {
  loading: SectionSkeleton,
});
const EducacaoSection = dynamic(() => import('./sections/educacao-section').then((m) => m.EducacaoSection), {
  loading: SectionSkeleton,
});
const DashboardSection = dynamic(() => import('./sections/dashboard-section').then((m) => m.DashboardSection), {
  loading: SectionSkeleton,
});

export type PtsFormData = PtsSchema;

const EMPTY: PtsFormData = {
  // Cadastro
  fullName: '', socialName: '', phone: '', rg: '', cpf: '',
  fatherName: '', motherName: '', responsible: '', birthDate: '', gender: '',
  cad: '', susCard: '', fullAddress: '', lat: null, lon: null,
  neighborhood: '', cep: '', streetSituation: '', nearestUbs: '',
  selfIdentification: '', profession: '', education: '', maritalStatus: '',
  email: '', origin: '', destination: '',
  // Objetivos e intervenções
  shortTermGoals: '', mediumTermGoals: '', longTermGoals: '', interventions: [],
  // Escuta inicial (anamnese)
  q1MainComplaint: '', q2Substances: [], q3UsageTime: '', q4TriedToStop: '',
  q5StopMethods: [], q6PreviousHospitalization: '', q6HospitalizationDetails: '',
  cCompulsion: false, cTolerance: false, cAbstinence: false, cRelief: false, cRelevance: false,
  q7AggravatingFactors: [], q8RecoveryFactors: [], q9DailyDifficulties: [], q10SkillsInterests: [],
  q11FixedHousing: '', q12FamilySupport: '', q13JusticeInvolvement: '',
  q14MentalHealthHistory: '', q15MotivationRating: '',
  // Domínio Psíquico
  psPreviousPsychAccount: '', psPreviousPsychDetails: '', psCurrentTreatment: '',
  psSelfHarmThoughts: '', psSelfHarmDetails: '', psSleepDifficulty: '', psAnxietySadness: '',
  psDistressingMemories: '', psDistressingMemoriesDetails: '',
  // Domínio Social / Renda
  ssLivesWithOthers: '', ssLivesWithDetails: '', ssSocialBenefits: '',
  ssSocialBenefitsDetails: '', ssHealthAccess: '', ssHealthAccessDetails: '',
  // Domínio Jurídico / Direitos
  lgRightsViolation: '', lgRightsViolationDetails: '', lgLegalFollowUp: '', lgLegalFollowUpDetails: '',
  // Domínio Educação / Trabalho
  edSchoolEnrollment: '', edSchoolEnrollmentDetails: '', edLaborActivity: '', edLaborActivityDetails: '',
  // Domínio Autonomia / Cotidiano
  toDailyIndependence: '', toCognitiveDifficulty: '', toLeisureActivity: '', toLeisureActivityDetails: '',
  // Domínio Saúde
  efRegularPractice: '', efPhysicalLimitation: '', efPhysicalLimitationDetails: '',
  efPleasurableActivity: '', ntDietType: '', ntWaterIntake: '',
  // Alta fidelidade estendida
  efChronicDiseasesCount: 0, efContinuousMedsCount: 0, efEmergencyAdmissionsCount: 0,
  efKatzIndex: null, ssIncomePerCapita: null, ssEbiaStatus: null,
  ssSaneamentoAcesso: true, ssHasCaregiver: true, ssCommunityVinc: 3,
  srq20Score: null, psCrisisCount: 0, psMedicationCompliance: null,
  lgMissingDocuments: false, lgActiveJudicialization: false,
  // Motor de inteligência
  scores: {}, suggestedActions: [],
  aiSuggestions: [], aiPotentialities: [], aiFragilities: [],
};

/**
 * Etapas do PTS Intersetorial. As etapas de avaliação são DOMÍNIOS (não
 * profissões) — qualquer profissional logado pode pontuar qualquer domínio.
 */
const SECTIONS = [
  { id: 'demographics', title: 'Cadastro', icon: <User size={18} /> },
  { id: 'triagem', title: 'Escuta Inicial', icon: <Activity size={18} /> },
  { id: 'psiquico', title: 'Domínio Psíquico', icon: <Brain size={18} /> },
  { id: 'saude', title: 'Domínio Saúde', icon: <HeartPulse size={18} /> },
  { id: 'social', title: 'Domínio Social / Renda', icon: <HandHeart size={18} /> },
  { id: 'juridico', title: 'Domínio Jurídico / Direitos', icon: <Scale size={18} /> },
  { id: 'educacao', title: 'Domínio Educação / Trabalho', icon: <GraduationCap size={18} /> },
  { id: 'dashboard', title: 'Plano Terapêutico', icon: <CheckCircle size={18} /> },
];

export function PtsForm({
  patientId,
  patientName,
  initialData,
  initialStatus: _initialStatus,
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
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);

  const updatePendingCount = async () => {
    try {
      const queue = await OfflineStore.getSyncQueue();
      setPendingCount(queue.length);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerBackgroundSync = async () => {
    try {
      const queue = await OfflineStore.getSyncQueue();
      if (queue.length === 0) return;

      toast.loading('Sincronizando alterações offline...', { id: 'sync-toast' });

      let successCount = 0;
      for (const item of queue) {
        try {
          if (item.actionType === 'save_pts') {
            const payload = item.payload as { data: unknown; status: 'draft' | 'completed' };
            await savePtsDocument(item.patientId, payload.data, payload.status);
          }
          await OfflineStore.clearSyncQueueItem(item.id!);
          successCount++;
        } catch (err) {
          console.error('Falha ao sincronizar item da fila:', err);
        }
      }

      await updatePendingCount();
      if (successCount > 0) {
        toast.success(`${successCount} alteração(ões) sincronizada(s) com sucesso!`, { id: 'sync-toast' });
      } else {
        toast.dismiss('sync-toast');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    getPredefinedActions().then(setCatalog);

    if (typeof window === 'undefined') return;

    const updateOnline = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        triggerBackgroundSync();
      }
    };

    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    // Carrega rascunho local se houver e a fila pendente
    OfflineStore.getDraft(patientId).then((draft) => {
      if (draft) {
        toast.info('Rascunho local recuperado offline', {
          description: 'Carregamos as últimas alterações salvas no seu aparelho.'
        });
        Object.entries(draft).forEach(([key, value]) => {
          setValue(key, value);
        });
      }
    });

    updatePendingCount();

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, [patientId]);

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

  const sortedServices = useMemo(() => {
    if (!formData.lat || !formData.lon) return PUBLIC_SERVICES;
    return [...PUBLIC_SERVICES].sort(
      (a, b) =>
        calculateDistance(formData.lat!, formData.lon!, a.lat, a.lon) -
        calculateDistance(formData.lat!, formData.lon!, b.lat, b.lon),
    );
  }, [formData.lat, formData.lon]);

  const onSave = async (status: 'draft' | 'completed', data: PtsFormData) => {
    setSaving(true);
    
    // Se estiver offline, salvar na IndexedDB local e enfileirar na fila de sync
    if (!isOnline) {
      try {
        await OfflineStore.saveDraft(patientId, data);
        await OfflineStore.enqueueSyncMutation(patientId, 'save_pts', { data, status });
        await updatePendingCount();
        
        toast.warning('Alteração salva localmente!', {
          description: 'Você está offline. Os dados serão sincronizados assim que a conexão voltar.'
        });
        
        if (status === 'completed') {
          router.push(`/patients/${patientId}`);
        }
      } catch {
        toast.error('Erro ao salvar localmente');
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      await savePtsDocument(patientId, data as unknown as Record<string, unknown>, status);
      await OfflineStore.clearDraft(patientId); // Limpa rascunho de sucesso online
      toast.success(status === 'completed' ? 'PTS finalizado!' : 'Rascunho salvo!', {
        description: status === 'completed' ? 'O documento foi concluído com sucesso.' : 'Suas alterações foram salvas.',
      });
      if (status === 'completed') router.push(`/patients/${patientId}`);
    } catch {
      toast.error('Erro ao salvar', { description: 'Ocorreu um problema ao processar sua solicitação.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = (status: 'draft' | 'completed') => {
    if (status === 'completed') {
      handleSubmit(
        (data: PtsFormData) => onSave('completed', data),
        (err: unknown) => {
          console.error('Validation errors:', err);
          toast.error('Campos pendentes', {
            description: 'Verifique os campos obrigatórios em vermelho.',
          });
        },
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
    const targetIdx = SECTIONS.findIndex((s) => s.id === id);

    // If moving forward, validate current section
    if (targetIdx > activeIdx) {
      const fieldsToValidate = SECTION_FIELDS[active] || [];
      const isValid = await methods.trigger(fieldsToValidate);

      if (!isValid) {
        toast.error('Verifique os campos obrigatórios', {
          description: 'Alguns campos desta etapa precisam ser preenchidos corretamente.',
        });
        return;
      }

      setCompletedSteps((prev) => Array.from(new Set([...prev, active])));
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
          .then((res) => {
            console.log('[Frontend] AI Suggestions received:', res);
            setValue('vulnerabilityIndex', res.vulnerability_index);
            setValue(
              'aiSuggestions',
              res.suggested_actions.map((s: { action_id: string; clinical_justification: string }) => ({
                actionId: s.action_id,
                clinicalJustification: s.clinical_justification,
                approved: false,
              })),
            );
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
        {/* Header - Compact & Dense */}
        <header className="h-[64px] shrink-0 border-b border-border bg-white/70 px-6 backdrop-blur-md z-[110]">
          <div className="flex h-full items-center justify-between gap-6">
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                <Activity size={20} />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/60 truncate">PTS / Anamnese</h1>
                <p className="text-sm font-black tracking-tight text-slate-900 truncate">{patientName}</p>
              </div>
            </div>

            {/* Compact Stepper */}
            <nav className="hidden flex-1 items-center justify-center lg:flex">
              <div className="flex w-full max-w-3xl items-center">
                {SECTIONS.map((section, idx) => {
                  const isActive = section.id === active;
                  const isDone =
                    completedSteps.includes(section.id) || SECTIONS.findIndex((s) => s.id === active) > idx;

                  return (
                    <React.Fragment key={section.id}>
                      <button
                        type="button"
                        onClick={() => goToStep(section.id)}
                        className={cn(
                          'group relative flex items-center justify-center transition-all duration-300',
                          isActive ? 'scale-105' : 'opacity-30 hover:opacity-100',
                        )}
                      >
                        <div
                          className={cn(
                            'flex size-7 items-center justify-center rounded-full border transition-all duration-500',
                            isActive
                              ? 'bg-primary border-primary text-white shadow-md shadow-primary/30'
                              : isDone
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-white border-slate-200 text-slate-400',
                          )}
                        >
                          {isDone && !isActive ? (
                            <CheckCircle size={12} />
                          ) : (
                            React.cloneElement(section.icon as React.ReactElement<{ size?: number }>, { size: 12 })
                          )}
                        </div>
                        {isActive && (
                          <span className="absolute -bottom-4 whitespace-nowrap text-[6px] font-black uppercase tracking-[0.2em] text-primary animate-in fade-in slide-in-from-top-1">
                            {section.title}
                          </span>
                        )}
                      </button>
                      {idx < SECTIONS.length - 1 && (
                        <div className="h-[1px] flex-1 mx-1.5 bg-slate-100 relative overflow-hidden">
                          <motion.div
                            className="absolute inset-0 bg-primary/30"
                            initial={{ width: '0%' }}
                            animate={{ width: isDone ? '100%' : '0%' }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </nav>

            <div className="flex items-center gap-2">
              <SyncStatusBadge />
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="hidden md:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-60"
              >
                <Save size={12} /> {saving ? 'Salvando…' : 'Rascunho'}
              </button>
              <button
                onClick={() => router.push(`/patients/${patientId}`)}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-800 border border-slate-200"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area - Maximized Space */}
        <div className="relative flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/30 scrollbar-thin scrollbar-thumb-slate-200">
          <div className="mx-auto w-full max-w-4xl px-4 py-8 md:max-w-5xl md:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="rounded-[2rem] border border-slate-200/50 bg-white p-6 shadow-diffusion md:rounded-[2.5rem] md:p-12"
              >
                {/* Section Header - Compact */}
                <div className="mb-10 flex items-center gap-5 border-b border-slate-50 pb-8">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-primary/5 text-primary">
                    {SECTIONS.find((s) => s.id === active)?.icon}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">
                      Etapa {activeIdx + 1} de {SECTIONS.length}
                    </p>
                    <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-900 leading-none mt-1">
                      {SECTIONS.find((s) => s.id === active)?.title}
                    </h2>
                  </div>
                </div>

                {active === 'demographics' && <DemographicsSection />}
                {active === 'triagem' && <TriagemSection />}
                {active === 'psiquico' && <PsiquicoSection />}
                {active === 'saude' && <SaudeSection />}
                {active === 'social' && <SocialSection />}
                {active === 'juridico' && <JuridicoSection />}
                {active === 'educacao' && <EducacaoSection />}
                {active === 'dashboard' && (
                  <DashboardSection loadingAi={loadingAi} catalog={catalog} sortedServices={sortedServices} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Floating Glass Navigation Pill */}
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(2rem+env(safe-area-inset-bottom))] z-[150] flex justify-center px-6">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/20 bg-white/40 p-2 shadow-2xl shadow-primary/10 backdrop-blur-xl ring-1 ring-slate-900/5 animate-in slide-in-from-bottom-8 duration-500">
            <button
              type="button"
              disabled={activeIdx === 0}
              onClick={() => goToStep(SECTIONS[activeIdx - 1].id)}
              className={cn(
                'flex h-12 items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-0',
                'px-4 md:px-6 md:gap-3 border border-slate-200 bg-white/50 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-white',
              )}
            >
              <ArrowLeft size={16} />
              <span className="hidden md:inline">Anterior</span>
            </button>

            <div className="h-6 w-px bg-slate-200/50" />

            {activeIdx < SECTIONS.length - 1 ? (
              <button
                type="button"
                onClick={() => goToStep(SECTIONS[activeIdx + 1].id)}
                className="flex h-12 items-center justify-center gap-3 rounded-full bg-primary px-8 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                <span className="hidden md:inline">Próximo</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave('completed')}
                disabled={saving}
                className="flex h-12 items-center justify-center gap-3 rounded-full bg-emerald-500 px-8 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              >
                <span className="hidden md:inline">FINALIZAR</span> <CheckCircle size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
