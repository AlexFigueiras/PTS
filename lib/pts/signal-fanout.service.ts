/**
 * Signal Fan-out — Fase 3.
 *
 * A partir das necessidades inferidas pelo NLP + IA, cria N sinalizações
 * via PtsSignalRepository, todas no estado `sugerida`.
 * Humano-no-loop preservado: cada sinalização é confirmada/descartada
 * individualmente pelo autor.
 *
 * §5.6: 1 relato → N sinalizações, cada uma ligada ao sourceRecordId.
 */

import { and, eq, inArray } from 'drizzle-orm';
import { getComponentsForNeed, type NeedTypeId, type SignalPriority, type SignalStatus, type Dimension } from '@pts/domain';
import { serviceUnits, ptsSignals, ptsCases } from '@/lib/db/schema';
import { PtsSignalRepository } from '@/modules/pts/repositories/pts-signal.repository';
import type { TenantContext } from '@/lib/tenant-context';
import type { NlpEntity } from '@/lib/nlp/nlp-engine';
import type { DerivationResult } from './dimension-derivation.service';

export type FanOutInput = {
  caseId: string;
  sourceRecordId?: string;
  nlpEntities: NlpEntity[];
  derivedDimensions: DerivationResult;
};

export type FanOutResult = {
  created: number;
  skipped: number;
  signalIds: string[];
};

/**
 * Mapeamento NLP tag → needTypeId do catálogo.
 */
const NLP_TAG_TO_NEED: Record<string, NeedTypeId[]> = {
  'B-MENTAL_HEALTH': ['risco_reinternacao', 'abandono_tratamento'],
  'B-SDOH_HOUSING': ['situacao_rua', 'pos_internacao_sem_moradia'],
  'B-SDOH_FOOD': ['vulnerabilidade_social_familiar'],
  'B-SUBSTANCE_USE': ['uso_substancias'],
  'B-LEGAL_VIOLENCE': ['violacao_direitos', 'medida_protetiva'],
  'B-CLINICAL_COMORBIDITY': ['comorbidade_clinica'],
};

/**
 * Mapeia risco de dimensão para prioridade de sinalização.
 * Domain só tem 'imediata' | 'pactuada'.
 */
function riskToPriority(risco: string): SignalPriority {
  if (risco === 'critico') return 'imediata';
  return 'pactuada';
}

/**
 * Gera razão abstrata para a sinalização — nunca expõe dado clínico bruto.
 */
function abstractReason(needTypeId: string, dimension: string): string {
  const labels: Record<string, string> = {
    risco_reinternacao: 'Risco de reinternação identificado — coordenação intersetorial indicada.',
    abandono_tratamento: 'Padrão de abandono de tratamento — necessidade de busca ativa.',
    situacao_rua: 'Indicador de vulnerabilidade habitacional — encaminhamento à proteção social.',
    pos_internacao_sem_moradia: 'Pós-internação sem moradia — articulação com serviço de acolhimento.',
    vulnerabilidade_social_familiar: 'Vulnerabilidade sociofamiliar — acompanhamento PAIF/PAEFI indicado.',
    uso_substancias: 'Necessidade de atenção por uso de substâncias.',
    violacao_direitos: 'Situação de violação de direitos — encaminhamento ao CREAS/Conselho Tutelar.',
    medida_protetiva: 'Necessidade de proteção jurídica identificada.',
    perda_beneficio: 'Perda de benefício social — risco de vulnerabilidade alimentar e habitacional.',
    isolamento_social: 'Isolamento social — necessidade de reinserção comunitária.',
    comorbidade_clinica: 'Comorbidade clínica crônica (diabetes/hipertensão) necessitando de acompanhamento pela Atenção Básica/eSF.',
  };
  return labels[needTypeId] ?? `Necessidade de coordenação identificada na dimensão ${dimension}.`;
}

/**
 * Cria N sinalizações cruzadas no estado `sugerida` a partir de NLP + dimensões derivadas.
 * Resolve a unidade destino pela tabela service_units do tenant.
 * Sinalizações duplicadas (mesmo caseId+needTypeId em estado sugerida/pendente) são ignoradas.
 */
export async function fanOutSignals(
  ctx: TenantContext,
  tx: any,
  input: FanOutInput,
): Promise<FanOutResult> {
  const result: FanOutResult = { created: 0, skipped: 0, signalIds: [] };

  if (!ctx.activeUnitId) {
    // Sem unidade ativa — não há origem para a sinalização
    return result;
  }

  // Verifica se o caso está em estado de recusa (T2)
  const [currentCase] = await tx
    .select({ status: ptsCases.status })
    .from(ptsCases)
    .where(and(eq(ptsCases.id, input.caseId), eq(ptsCases.tenantId, ctx.tenantId)))
    .limit(1);

  if (!currentCase || currentCase.status === 'recusa') {
    return result; // T2: Caso em recusa não gera sinalizações
  }

  // Coleta needTypeIds únicos a partir das tags NLP
  const needTypeIds = new Set<NeedTypeId>();

  for (const entity of input.nlpEntities) {
    const needs = NLP_TAG_TO_NEED[entity.tag] ?? [];
    for (const n of needs) needTypeIds.add(n);
  }

  // Adiciona necessidades inferidas das dimensões com risco alto/crítico
  const { derivedDimensions } = input;
  if (derivedDimensions.social.risco === 'alto' || derivedDimensions.social.risco === 'critico') {
    needTypeIds.add('vulnerabilidade_social_familiar');
    needTypeIds.add('perda_beneficio');
  }
  if (derivedDimensions.juridico.risco === 'alto' || derivedDimensions.juridico.risco === 'critico') {
    needTypeIds.add('violacao_direitos');
  }
  if (derivedDimensions.saude.risco === 'critico') {
    needTypeIds.add('risco_reinternacao');
  }

  if (needTypeIds.size === 0) return result;

  // Evita duplicar sinalizações já existentes em estado ativo para o mesmo caso+necessidade
  const ACTIVE_SIGNAL_STATUSES: SignalStatus[] = ['sugerida', 'confirmada_pelo_autor', 'aguardando_validacao_rt', 'encaminhada', 'recebida', 'em_tratamento'];
  const existing = await tx
    .select({ needTypeId: ptsSignals.needTypeId })
    .from(ptsSignals)
    .where(
      and(
        eq(ptsSignals.caseId, input.caseId),
        eq(ptsSignals.tenantId, ctx.tenantId),
        inArray(ptsSignals.status, ACTIVE_SIGNAL_STATUSES),
        inArray(ptsSignals.needTypeId, [...needTypeIds]),
      ),
    );

  const existingNeedTypes = new Set(existing.map((r: { needTypeId: string | null }) => r.needTypeId));

  const repo = new PtsSignalRepository(ctx, tx);

  for (const needTypeId of needTypeIds) {
    if (existingNeedTypes.has(needTypeId)) {
      result.skipped++;
      continue;
    }

    const components = getComponentsForNeed(needTypeId);
    if (components.length === 0) {
      result.skipped++;
      continue;
    }

    // Resolve unidade destino no tenant
    const candidateUnits = await tx
      .select({ id: serviceUnits.id, componentId: serviceUnits.componentId })
      .from(serviceUnits)
      .where(
        and(
          eq(serviceUnits.tenantId, ctx.tenantId),
          inArray(serviceUnits.componentId, [...components]),
        ),
      );

    let destinationComponent = components[0];
    let destinationUnitId: string | null = null;
    for (const comp of components) {
      const match = candidateUnits.find((u: { componentId: string | null }) => u.componentId === comp);
      if (match) {
        destinationComponent = comp;
        destinationUnitId = match.id;
        break;
      }
    }

    // Prioridade baseada no risco da dimensão mais relevante
    const dimensionForNeed: Dimension = needTypeId.includes('social') || needTypeId === 'perda_beneficio' || needTypeId === 'vulnerabilidade_social_familiar'
      ? 'social'
      : needTypeId === 'violacao_direitos' || needTypeId === 'medida_protetiva'
        ? 'juridico'
        : 'saude';

    const dimRisk = derivedDimensions[dimensionForNeed]?.risco ?? 'baixo';
    const priority = riskToPriority(dimRisk);

    const signal = await repo.create({
      caseId: input.caseId,
      authorId: ctx.userId,
      sourceUnitId: ctx.activeUnitId!,
      needTypeId,
      destinationComponent,
      destinationUnitId,
      priority,
      abstractReason: abstractReason(needTypeId, dimensionForNeed),
    });

    // Liga sinalização ao evento de ingestão
    if (input.sourceRecordId) {
      await tx
        .update(ptsSignals)
        .set({ sourceRecordId: input.sourceRecordId })
        .where(eq(ptsSignals.id, signal.id));
    }

    result.created++;
    result.signalIds.push(signal.id);
  }

  return result;
}

