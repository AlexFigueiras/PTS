/**
 * Pseudonimização (tokenização) — §6C do plano.
 *
 * Substitui identificadores pessoais conhecidos por rótulos neutros
 * determinísticos-por-execução antes de qualquer chamada à IA.
 * O vínculo token↔cidadão vive apenas no servidor (tokenMap).
 *
 * No protótipo (dados fictícios) é demonstrativo; o código nasce correto
 * para que a troca fictício→real não exija refatoração da camada de IA.
 */

export type TokenMap = Record<string, string>; // token → identifier original

export type PseudonymizeResult = {
  masked: string;
  tokenMap: TokenMap;
};

const PATTERNS: Array<{ regex: RegExp; label: string }> = [
  // CPF: 000.000.000-00 ou 00000000000
  { regex: /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/g, label: 'CPF' },
  // CNS: 15 dígitos
  { regex: /\b\d{15}\b/g, label: 'CNS' },
  // Telefone: (XX) XXXXX-XXXX ou variações
  { regex: /\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}\b/g, label: 'TEL' },
  // Data nascimento: DD/MM/YYYY
  { regex: /\b\d{2}\/\d{2}\/\d{4}\b/g, label: 'NASCIMENTO' },
];

let _counter = 0;
function nextToken(): string {
  return `Cidadao_${String(++_counter).padStart(4, '0')}`;
}

/**
 * Pseudonimiza `text`, substituindo:
 * - Identificadores explícitos da lista `identifiers` pelo mesmo token neutro
 * - Padrões estruturais (CPF, CNS, telefone, data) por marcadores de tipo
 *
 * @param text        Texto bruto sensível
 * @param identifiers Lista de strings a substituir (nome, CPF, CNS, etc.)
 * @returns           { masked, tokenMap } — tokenMap mapeia token → original
 */
export function pseudonymize(text: string, identifiers: string[]): PseudonymizeResult {
  const tokenMap: TokenMap = {};
  let masked = text;

  // Substitui identificadores explícitos por um único token cidadão
  const knownIds = identifiers.filter((id) => id && id.trim().length > 0);
  if (knownIds.length > 0) {
    const citizen = nextToken();
    for (const id of knownIds) {
      tokenMap[citizen] = id;
      // escape para uso em RegExp
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      masked = masked.replace(new RegExp(escaped, 'gi'), citizen);
    }
  }

  // Substitui padrões estruturais
  for (const { regex, label } of PATTERNS) {
    masked = masked.replace(regex, (match) => {
      const token = `[${label}_REDACTED]`;
      // Não sobrescreve mapeamento de cidadão já feito
      if (!Object.values(tokenMap).includes(match)) {
        tokenMap[token] = match;
      }
      return token;
    });
  }

  return { masked, tokenMap };
}

/**
 * Reidrata `aiOutput` substituindo tokens de volta aos identificadores originais.
 * Usado para recompor contexto server-side após processar a saída da IA.
 */
export function rehydrate(aiOutput: string, tokenMap: TokenMap): string {
  let result = aiOutput;
  for (const [token, original] of Object.entries(tokenMap)) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), original);
  }
  return result;
}
