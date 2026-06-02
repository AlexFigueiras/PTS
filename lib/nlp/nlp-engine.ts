export type SDohTag = 'B-MENTAL_HEALTH' | 'B-SDOH_HOUSING' | 'B-SDOH_FOOD' | 'B-SUBSTANCE_USE' | 'B-LEGAL_VIOLENCE' | 'B-CLINICAL_COMORBIDITY';

export interface NlpEntity {
  tag: SDohTag;
  label: string;
  matchedText: string;
}

const NLP_VOCABULARY: { tag: SDohTag; label: string; patterns: RegExp[] }[] = [
  {
    tag: 'B-MENTAL_HEALTH',
    label: 'Saúde Mental / Risco Psíquico',
    patterns: [
      /\b(?:depress|ansied|surt|crise|pânico|alucin|esquizo|trist|choro|desespero|suic|auto-extermin|auto-mut|cortar|morrer|sono|insônia|delír|caps|psiqu|psicól)\w*/gi
    ]
  },
  {
    tag: 'B-SDOH_HOUSING',
    label: 'Vulnerabilidade de Moradia (Rua)',
    patterns: [
      /\b(?:rua|sem-teto|abrigo|despej|aluguel\s+atras|morad|habita|invas|desabrig)\w*/gi
    ]
  },
  {
    tag: 'B-SDOH_FOOD',
    label: 'Insegurança Alimentar',
    patterns: [
      /\b(?:fome|aliment|comida|sem\s+comer|desnutr|refeição|cesta\s+básica)\w*/gi
    ]
  },
  {
    tag: 'B-SUBSTANCE_USE',
    label: 'Uso de Substâncias',
    patterns: [
      /\b(?:álcool|bebida|embria|alcool|drog|crack|cocaín|maconh|substânc|depend|abuso|recaíd)\w*/gi
    ]
  },
  {
    tag: 'B-LEGAL_VIOLENCE',
    label: 'Questão Judicial / Violência',
    patterns: [
      /\b(?:violênc|agress|políc|justiç|process|preso|cadeia|pena|judicial|ameaç|espanc|lei\s+maria\s+da\s+penha)\w*/gi
    ]
  },
  {
    tag: 'B-CLINICAL_COMORBIDITY',
    label: 'Comorbidade Clínica',
    patterns: [
      /\b(?:diabetes|glicem|hipertens|pressao|cardiac|clinica|organica|glicose)\w*/gi
    ]
  }
];

/**
 * Realiza a análise de texto clínico/social livre em português (Brasil)
 * e extrai entidades baseadas em determinantes sociais e saúde mental.
 * 
 * Fornece resultados instantâneos no cliente, servindo como uma alternativa
 * de zero latência offline e companion para o modelo híbrido BioBERTpt/Gemini.
 */
export function analyzeClinicalText(text: string): NlpEntity[] {
  if (!text || text.trim().length < 3) return [];

  const entities: NlpEntity[] = [];
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos para matching robusto

  NLP_VOCABULARY.forEach(({ tag, label, patterns }) => {
    patterns.forEach((pattern) => {
      let match;
      // Reseta RegExp state
      pattern.lastIndex = 0;
      
      // Procurando todas as ocorrências do padrão
      while ((match = pattern.exec(normalized)) !== null) {
        // Encontra o texto correspondente original no input (com acentos)
        const startIndex = match.index;
        const endIndex = pattern.lastIndex || (startIndex + match[0].length);
        const originalText = text.substring(startIndex, endIndex);

        // Evita duplicatas idênticas para a mesma tag
        if (!entities.some((e) => e.tag === tag && e.matchedText.toLowerCase() === originalText.toLowerCase())) {
          entities.push({
            tag,
            label,
            matchedText: originalText
          });
        }
      }
    });
  });

  return entities;
}
