import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { Dimension } from '@pts/domain';
import type { DimensionPayload } from '@/lib/db/schema';

// Typagem do resultado do serviço de derivação
export type DerivationResult = Record<Dimension, DimensionPayload>;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

if (!process.env.GEMINI_API_KEY) {
  console.warn('[Dimension Derivation] AVISO: GEMINI_API_KEY não encontrada no ambiente. Utilizando fallback local.');
}

const dimensionPayloadSchema = z.object({
  estado: z.string().describe('Visão geral resumida e neutra do estado atual do cidadão nesta dimensão.'),
  fragilidades: z.array(z.string()).describe('Lista de riscos e fragilidades identificadas nesta dimensão (máximo 4)'),
  potencialidades: z.array(z.string()).describe('Lista de forças e fatores protetivos identificados nesta dimensão (máximo 4)'),
  risco: z.enum(['baixo', 'medio', 'alto', 'critico']).describe('Classificação de risco para esta dimensão'),
  observacoes: z.string().optional().describe('Observações adicionais pertinentes'),
});

const derivationResultSchema = z.object({
  saude: dimensionPayloadSchema,
  social: dimensionPayloadSchema,
  psiquico: dimensionPayloadSchema,
  juridico: dimensionPayloadSchema,
  educacao: dimensionPayloadSchema,
});

export interface DeriveDimensionsInput {
  maskedHealthText: string;
  maskedSocialText: string;
}

/**
 * Deriva as 5 Dimensões oficiais (Saúde, Social, Psíquico, Jurídico, Educação) via IA (Gemini).
 * Se a API Key estiver ausente ou a chamada falhar, cai para um fallback determinístico inteligente.
 * §1.2: A regra de sensibilidade de psíquico é abstraída a nível de persistência (com payload suavizado pelo sistema).
 */
export async function deriveDimensions(input: DeriveDimensionsInput): Promise<DerivationResult> {
  const combinedText = `${input.maskedHealthText}\n${input.maskedSocialText}`;

  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('[Dimension Derivation] Chamando Gemini 2.5 Pro...');
      const { object } = await generateObject({
        model: google('gemini-2.5-pro'),
        schema: derivationResultSchema,
        prompt: `
          Você é um especialista em análise intersetorial de Planos Terapêuticos Singulares (PTS).
          Sua tarefa é analisar os relatos integrados (saúde e assistência social) de um cidadão
          e preencher a avaliação estruturada para as 5 Dimensões Oficiais do sistema:
          Saúde, Social, Psíquico, Jurídico e Educação.

          TEXTO ANALISADO (PSEUDONIMIZADO):
          ---
          ${combinedText}
          ---

          INSTRUÇÕES GERAIS:
          - Todo o conteúdo gerado deve estar em Português do Brasil (pt-BR).
          - Seja conciso, técnico, objetivo e empático.
          - Evite jargões excessivos e foque na articulação de rede intersetorial.

          INSTRUÇÕES POR DIMENSÃO:
          1. Saúde: Avaliar condições físicas, doenças crônicas, acesso a remédios, autonomia geral e autocuidado.
          2. Social: Avaliar renda, moradia, saneamento básico, relações familiares e acesso a benefícios.
          3. Psíquico: Avaliar sofrimento mental, ideação, uso de substâncias de forma empática e respeitosa.
          4. Jurídico: Avaliar proteção a direitos, violações, medidas protetivas judiciais ou conflitos legais.
          5. Educação: Avaliar escolaridade, capacitação profissional, inserção no trabalho ou exclusão escolar.

          REGRA FIXA LGPD DE SENSIBILIDADE (PSÍQUICO):
          - Na dimensão Psíquico, NUNCA inclua diagnósticos literais crus (ex: "esquizofrenia refratária"),
            dosagens de medicação ou detalhes íntimos do relato do profissional.
          - Em vez disso, abstraia para a necessidade de suporte de saúde mental e o risco geral (ex: "Cidadão apresenta padrão de sofrimento mental severo com necessidade de acompanhamento em rede").
        `,
      });

      console.log('[Dimension Derivation] Resposta do Gemini recebida com sucesso.');
      
      // Garante a aplicação da regra fixa de sensibilidade psíquica a nível de texto na saída
      const validatedObject = applyPsiquicoSensitivity(object as DerivationResult);
      return validatedObject;
    } catch (error) {
      console.error('[Dimension Derivation] Erro ao chamar a API do Gemini. Usando fallback NLP local:', error);
    }
  }

  // Fallback local determinístico baseado em varredura léxica
  return runLocalFallbackDerivation(combinedText);
}

/**
 * Filtra e suaviza o payload do Psíquico para garantir que detalhes clínicos brutos não cruzem as esferas.
 */
function applyPsiquicoSensitivity(result: DerivationResult): DerivationResult {
  const psiquico = result.psiquico;
  
  // Lista de palavras que devem ser suavizadas/removidas do estado e observações psíquicas
  const sensitiveTerms = [
    /esquizofrenia/gi, /bipolar/gi, /surto psicótico/gi, /surtou/gi, /alucinações/gi,
    /haloperidol/gi, /rivotril/gi, /diazepam/gi, /lítio/gi, /risperidona/gi
  ];

  let estadoSuavizado = psiquico.estado;
  let obsSuavizada = psiquico.observacoes || '';

  sensitiveTerms.forEach(term => {
    estadoSuavizado = estadoSuavizado.replace(term, 'sofrimento psíquico severo');
    obsSuavizada = obsSuavizada.replace(term, 'acompanhamento psiquiátrico');
  });

  return {
    ...result,
    psiquico: {
      ...psiquico,
      estado: estadoSuavizado,
      observacoes: obsSuavizada || undefined,
    }
  };
}

/**
 * Fallback determinístico inteligente baseado em análise léxica simples do texto de entrada.
 */
function runLocalFallbackDerivation(text: string): DerivationResult {
  const lowercaseText = text.toLowerCase();

  // 1. Psíquico
  const hasSubstances = lowercaseText.includes('álcool') || lowercaseText.includes('droga') || lowercaseText.includes('substância') || lowercaseText.includes('bebida');
  const hasSelfHarm = lowercaseText.includes('auto-extermínio') || lowercaseText.includes('suicí') || lowercaseText.includes('se cortar') || lowercaseText.includes('morte');
  const hasPsychicCrisis = lowercaseText.includes('crise') || lowercaseText.includes('surto') || lowercaseText.includes('delírio') || lowercaseText.includes('alucina');
  
  let riscoPsic: 'baixo' | 'medio' | 'alto' | 'critico' = 'baixo';
  const fragPsic: string[] = [];
  const potPsic: string[] = ['Aceitação de acompanhamento psicológico terapêutico'];

  if (hasSelfHarm) {
    riscoPsic = 'critico';
    fragPsic.push('Risco severo de autoextermínio evidenciado');
  } else if (hasPsychicCrisis || hasSubstances) {
    riscoPsic = 'alto';
    if (hasSubstances) fragPsic.push('Padrão nocivo de uso de substâncias psicotrópicas');
    if (hasPsychicCrisis) fragPsic.push('Histórico recente de crises psicóticas ou surtos severos');
  } else if (lowercaseText.includes('triste') || lowercaseText.includes('ansie') || lowercaseText.includes('desespero')) {
    riscoPsic = 'medio';
    fragPsic.push('Sintomatologia depressiva e de ansiedade expressiva');
  }

  if (fragPsic.length === 0) fragPsic.push('Ausência de sintomas agudos manifestos');

  // 2. Saúde
  const hasEmergency = lowercaseText.includes('emergência') || lowercaseText.includes('hospital') || lowercaseText.includes('pronto socorro') || lowercaseText.includes('upa');
  const hasMeds = lowercaseText.includes('remédio') || lowercaseText.includes('medicamento') || lowercaseText.includes('receita');
  const hasChronics = lowercaseText.includes('diabetes') || lowercaseText.includes('hipertensão') || lowercaseText.includes('pressão') || lowercaseText.includes('crônica');

  let riscoSaude: 'baixo' | 'medio' | 'alto' | 'critico' = 'baixo';
  const fragSaude: string[] = [];
  const potSaude: string[] = ['Vínculo estabelecido com a Unidade Básica de Saúde'];

  if (hasEmergency) {
    riscoSaude = 'alto';
    fragSaude.push('Histórico de admissões frequentes em pronto-socorro / emergências');
  } else if (hasChronics || hasMeds) {
    riscoSaude = 'medio';
    if (hasChronics) fragSaude.push('Comorbidades clínicas crônicas sob necessidade de manejo');
    if (hasMeds) fragSaude.push('Uso contínuo de múltiplos fármacos com risco de adesão parcial');
  }

  if (fragSaude.length === 0) fragSaude.push('Bom nível geral de autonomia funcional e autocuidado');

  // 3. Social
  const hasStreet = lowercaseText.includes('rua') || lowercaseText.includes('desabrigado') || lowercaseText.includes('albergue') || lowercaseText.includes('pop');
  const hasBenefits = lowercaseText.includes('bolsa') || lowercaseText.includes('benefício') || lowercaseText.includes('bpc') || lowercaseText.includes('cadúnico');
  const hasNoIncome = lowercaseText.includes('sem renda') || lowercaseText.includes('desempregado') || lowercaseText.includes('fome') || lowercaseText.includes('pobreza');

  let riscoSocial: 'baixo' | 'medio' | 'alto' | 'critico' = 'baixo';
  const fragSocial: string[] = [];
  const potSocial: string[] = [];

  if (hasStreet) {
    riscoSocial = 'critico';
    fragSocial.push('Situação de rua ativa com violação severa de moradia e dignidade');
  } else if (hasNoIncome) {
    riscoSocial = 'alto';
    fragSocial.push('Extrema vulnerabilidade socioeconômica e alimentar severa');
  } else if (lowercaseText.includes('conflito') || lowercaseText.includes('violência familiar') || lowercaseText.includes('isolamento')) {
    riscoSocial = 'medio';
    fragSocial.push('Fragilidade nos vínculos familiares e de suporte comunitário');
  }

  if (hasBenefits) potSocial.push('Cidadão inserido em programas federais de transferência de renda');
  else potSocial.push('Residência no território de cobertura do CRAS local');

  if (fragSocial.length === 0) fragSocial.push('Estabilidade habitacional básica provida');

  // 4. Jurídico
  const hasViolence = lowercaseText.includes('agressão') || lowercaseText.includes('violência') || lowercaseText.includes('bater') || lowercaseText.includes('ameaça');
  const hasMeasures = lowercaseText.includes('medida protetiva') || lowercaseText.includes('conselho tutelar') || lowercaseText.includes('justiça') || lowercaseText.includes('juiz');

  let riscoJur: 'baixo' | 'medio' | 'alto' | 'critico' = 'baixo';
  const fragJur: string[] = [];
  const potJur: string[] = ['Inexistência de antecedentes criminais ou litígios graves'];

  if (hasViolence) {
    riscoJur = 'critico';
    fragJur.push('Exposição a situação de violência intrafamiliar ou comunitária contínua');
  } else if (hasMeasures) {
    riscoJur = 'alto';
    fragJur.push('Acompanhamento obrigatório por medida protetiva judicial pendente');
  }

  if (fragJur.length === 0) fragJur.push('Nenhuma pendência ou risco jurídico aparente detectado');

  // 5. Educação
  const hasNoSchool = lowercaseText.includes('analfabeto') || lowercaseText.includes('não estuda') || lowercaseText.includes('escola') || lowercaseText.includes('abandono escolar');

  let riscoEduc: 'baixo' | 'medio' | 'alto' | 'critico' = 'baixo';
  const fragEduc: string[] = [];
  const potEduc: string[] = ['Desejo manifesto de inserção em cursos e capacitação profissional'];

  if (hasNoSchool) {
    riscoEduc = 'medio';
    fragEduc.push('Defasagem idade-série expressiva ou abandono escolar prematuro');
  }

  if (fragEduc.length === 0) fragEduc.push('Alfabetizado com histórico de escolarização básica concluída');

  return {
    saude: {
      estado: hasEmergency 
        ? 'Necessidade de intervenção clínica frequente devido a episódios agudos.' 
        : 'Estado de saúde clínica estável com independência de autocuidado preservada.',
      fragilidades: fragSaude,
      potencialidades: potSaude,
      risco: riscoSaude,
    },
    social: {
      estado: hasStreet 
        ? 'Cidadão em situação de rua, com alta privação material e habitacional.' 
        : 'Instabilidade socioeconômica moderada com necessidade de articulação de benefícios.',
      fragilidades: fragSocial,
      potencialidades: potSocial,
      risco: riscoSocial,
    },
    psiquico: {
      estado: riscoPsic === 'critico' || riscoPsic === 'alto'
        ? 'Apresenta padrão de sofrimento psíquico severo e necessidade de acompanhamento em rede.'
        : 'Sofrimento mental leve a moderado, com padrão de humor reativo a condições de vulnerabilidade.',
      fragilidades: fragPsic,
      potencialidades: potPsic,
      risco: riscoPsic,
    },
    juridico: {
      estado: riscoJur === 'critico' || riscoJur === 'alto'
        ? 'Violação de direitos identificada com necessidade de acionar órgãos de defesa.'
        : 'Segurança jurídica estável sem demandas agudas de mediação judicial.',
      fragilidades: fragJur,
      potencialidades: potJur,
      risco: riscoJur,
    },
    educacao: {
      estado: riscoEduc === 'medio'
        ? 'Necessidade de reinserção escolar ou acompanhamento de evasão escolar.'
        : 'Escolaridade estável, mas sem qualificação técnica ou inserção produtiva formal ativa.',
      fragilidades: fragEduc,
      potencialidades: potEduc,
      risco: riscoEduc,
    },
  };
}
