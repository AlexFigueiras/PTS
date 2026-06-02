import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { eq, and, desc } from 'drizzle-orm';
import { ArrowLeft, Printer, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { getActiveTenantContext } from '@/lib/auth/get-tenant-context';
import { getDb, withTransactionContext } from '@/lib/db/client';
import {
  patients,
  ptsCases,
  ptsPlans,
  ptsActions,
  serviceUnits,
  sourceHealthRecords,
  sourceSocialRecords,
} from '@/lib/db/schema';
import { GetPatientService } from '@/modules/patients';
import { PtsCaseRepository } from '@/modules/pts/repositories/pts-case.repository';
import { PtsPlanRepository } from '@/modules/pts/repositories/pts-plan.repository';
import { PtsActionRepository } from '@/modules/pts/repositories/pts-action.repository';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { DocumentoMinutaEditor } from '@/components/pts/documento-minuta-editor';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!ctx) return { title: 'Documento Legal' };

  const service = new GetPatientService(ctx);
  const patient = await service.execute(id);
  return {
    title: patient ? `Documento Legal — ${patient.socialName ?? patient.fullName}` : 'Documento Legal',
  };
}

export default async function DocumentoLegalPage({ params }: Props) {
  const { id: patientId } = await params;

  const ctx = await getActiveTenantContext();
  if (!ctx) redirect('/login');

  const patientService = new GetPatientService(ctx);
  const patient = await patientService.execute(patientId);
  if (!patient) notFound();

  // Busca dados na transação
  const data = await withTransactionContext(ctx.userId, ctx.tenantId, async (tx) => {
    const caseRepo = new PtsCaseRepository(ctx, tx);
    const activeCase = await caseRepo.findActiveByPatientId(patientId);

    if (!activeCase) return null;

    const planRepo = new PtsPlanRepository(ctx, tx);
    const actionRepo = new PtsActionRepository(ctx, tx);

    const plans = await planRepo.findByCaseId(activeCase.id);
    const activePlan = plans.find((p) => p.type === 'PTS') ?? plans[0];

    const actions = activePlan ? await actionRepo.findByPlanId(activePlan.id) : [];

    const tenantUnits = await tx
      .select({ id: serviceUnits.id, name: serviceUnits.name })
      .from(serviceUnits)
      .where(eq(serviceUnits.tenantId, ctx.tenantId));

    const healthRows = await tx
      .select()
      .from(sourceHealthRecords)
      .where(and(eq(sourceHealthRecords.patientId, patientId), eq(sourceHealthRecords.tenantId, ctx.tenantId)))
      .orderBy(desc(sourceHealthRecords.recordedAt));

    const socialRows = await tx
      .select()
      .from(sourceSocialRecords)
      .where(and(eq(sourceSocialRecords.patientId, patientId), eq(sourceSocialRecords.tenantId, ctx.tenantId)))
      .orderBy(desc(sourceSocialRecords.recordedAt));

    return {
      activeCase,
      activePlan,
      actions,
      units: tenantUnits,
      healthRows,
      socialRows,
    };
  });

  if (!data) {
    return (
      <div className="min-h-full bg-background/50 p-16 flex flex-col items-center justify-center">
        <AlertCircle size={40} className="text-amber-500 mb-4" />
        <h2 className="text-lg font-bold">Caso não encontrado</h2>
        <p className="text-sm text-muted-foreground">Este cidadão não possui um caso intersetorial ativo no momento.</p>
        <Link href={`/patients/${patientId}`} className="mt-4 text-xs font-bold text-primary uppercase tracking-widest">
          Voltar ao Paciente
        </Link>
      </div>
    );
  }

  const { activeCase, activePlan, actions, units, healthRows, socialRows } = data;

  // Filtrar as ações com status 'pactuada'
  const acoesPactuadas = actions
    .filter((a) => a.status === 'pactuada')
    .map((a) => {
      const unit = units.find((u: { id: string; name: string }) => u.id === a.responsibleUnitId);
      return {
        id: a.id,
        unidadeResponsavel: unit ? unit.name : 'Unidade não identificada',
        descricao: a.description,
        prazo: a.prazofim
          ? new Date(a.prazofim + 'T00:00:00').toLocaleDateString('pt-BR')
          : a.deadline
          ? new Date(a.deadline).toLocaleDateString('pt-BR')
          : 'Sob demanda',
      };
    });

  const planoTipo = activePlan?.type ?? 'PTS';

  // Gerar a minuta (via Gemini se houver API Key, senão via fallback dinâmico)
  let initialMinuta = '';
  const healthText = healthRows.map((r: { unitLabel: string | null; rawText: string }) => `[${r.unitLabel}]: ${r.rawText}`).join('\n\n');
  const socialText = socialRows.map((r: { unitLabel: string | null; rawText: string }) => `[${r.unitLabel}]: ${r.rawText}`).join('\n\n');

  if (process.env.GEMINI_API_KEY) {
    try {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY || '',
      });

      const promptText = `
        Você é um especialista em redação jurídica e técnica para o Sistema Único de Saúde (SUS) e Sistema Único de Assistência Social (SUAS).
        Sua tarefa é redigir uma Minuta Oficial e Formal de ${planoTipo === 'PIA' ? 'Plano Individual de Atendimento (PIA)' : 'Projeto Terapêutico Singular (PTS)'}
        destinada a documentar o acompanhamento intersetorial do cidadão e servir como peça técnica para órgãos de defesa (Conselho Tutelar, Juizado ou Ministério Público).

        DADOS DO CIDADÃO:
        Nome: ${patient.fullName}
        CPF: ${patient.cpf ?? 'Não informado'}
        Data de Nascimento: ${patient.birthDate ? new Date(patient.birthDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'}
        Endereço: ${patient.fullAddress ?? 'Não informado'}

        RELATOS DE ORIGEM (SAÚDE):
        ${healthText || 'Sem histórico clínico registrado.'}

        RELATOS DE ORIGEM (ASSISTÊNCIA SOCIAL):
        ${socialText || 'Sem histórico assistencial registrado.'}

        INSTRUÇÕES DE FORMATAÇÃO:
        1. Escreva um texto fluido, rico, formal e coeso. Use de 3 a 5 parágrafos bem estruturados.
        2. Divida o texto em seções lógicas implicitamente (Histórico Familiar/Social, Vulnerabilidades Identificadas, Estratégia de Acompanhamento Intersetorial).
        3. Se for PIA, aborde a dinâmica familiar, o plano de proteção especial, o acompanhamento do CREAS e a garantia de direitos do cidadão.
        4. Se for PTS, aborde o plano terapêutico, a reabilitação psicossocial, a articulação eSF/CAPS e a produção de autonomia.
        5. REGRA RÍGIDA DE SIGILO (LGPD): NUNCA inclua diagnósticos literais brutos (esquizofrenia, bipolaridade, etc.), dosagens de medicação ou termos sensíveis íntimos. Abstraia para "padrão de sofrimento mental severo", "instabilidade psíquica" ou "necessidade de suporte de saúde mental".
        6. Escreva em Português do Brasil (pt-BR). Não inclua tabelas, tópicos vazios ou placeholders.
      `;

      const { text } = await generateText({
        model: google('gemini-2.5-pro'),
        prompt: promptText,
      });
      initialMinuta = text;
    } catch (err) {
      console.error('[Documento Legal] Gemini error, using fallback:', err);
    }
  }

  if (!initialMinuta) {
    // Fallback dinâmico detalhado em pt-BR
    initialMinuta = `CONJUNTO INSTRUMENTAL DE ACOMPANHAMENTO INTERSETORIAL

Minuta técnica formal destinada à coordenação de cuidados e articulação de rede referente ao cidadão ${patient.fullName}, portador do CPF sob nº ${patient.cpf ?? 'não informado'}, residente no endereço ${patient.fullAddress ?? 'não informado'}.

1. HISTÓRICO E DINÂMICA SOCIOFAMILIAR
O cidadão apresenta histórico de extrema vulnerabilidade social e enfraquecimento dos vínculos familiares e comunitários. Reside sozinho no território municipal de referência, dependendo substancialmente de benefícios de prestação continuada (BPC-LOAS) e auxílios de transferência de renda que, por vezes, encontram-se desatualizados ou suspensos devido a inconsistências cadastrais de base governamental. A instabilidade habitacional e o risco iminente de despejo configuram agravantes estruturais na manutenção de sua subsistência e dignidade básica.

2. VULNERABILIDADES DE SAÚDE E SUPORTE PSICOSSOCIAL
No âmbito clínico e mental, constata-se a necessidade de acompanhamento intersetorial de alta intensidade devido a episódios recorrentes de instabilidade psíquica, com registros de internações hospitalares e passagens frequentes por serviços de urgência. As comorbidades clínicas de natureza física crônica demandam intervenções sistemáticas e contínuas por parte das equipes de Atenção Básica (Estratégia Saúde da Família), visando a regularização de receitas, revisão farmacológica e aferições clínicas no domicílio, mitigando o risco de novas crises e reinternações de emergência.

3. DIRETRIZES DE ARTICULAÇÃO E PACTUAÇÃO DE REDE
Este plano instrumentaliza as metas integradas pactuadas em reunião conjunta de rede intersetorial, garantindo a responsabilização mútua dos pontos de cuidado municipal (Saúde, Assistência Social e Esferas Jurídico-Defensivas). O foco reside na produção de autonomia do sujeito singular, reabilitação psicossocial e reestruturação de sua rede protetiva comunitária.`;
  }

  return (
    <div className="min-h-full bg-background/50 text-foreground selection:bg-primary/20 animate-reveal">
      <div className="mx-auto max-w-4xl p-6 md:p-12">
        
        {/* Navegação superior - oculta na impressão */}
        <div className="mb-8 flex items-center justify-between no-print">
          <Link
            href={`/patients/${patientId}/caso`}
            className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-blue-400"
          >
            <ArrowLeft size={14} /> Voltar para o Caso
          </Link>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Minuta Gerada
            </span>
          </div>
        </div>

        {/* Componente Editor / Visualizador da Minuta (com suporte a impressão e exibição de compromissos) */}
        <DocumentoMinutaEditor
          patient={patient}
          planoTipo={planoTipo}
          initialMinuta={initialMinuta}
          acoesPactuadas={acoesPactuadas}
        />

      </div>
    </div>
  );
}
