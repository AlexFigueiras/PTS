/**
 * Interface representing a parsed diagnostic issue from FHIR OperationOutcome.
 */
export interface ParsedDiagnosticIssue {
  index: number;
  severity: string;
  code: string;
  details: string;
  friendlyExplanation?: string;
}

/**
 * Interface representing a fully parsed job error state.
 */
export interface ParsedJobError {
  isFhirValidationError: boolean;
  isInfrastructureError: boolean;
  rawMessage: string;
  summary: string;
  issues: ParsedDiagnosticIssue[];
  stackTrace?: string;
}

// Map of common FHIR technical diagnostics to human-friendly Portuguese explanations
const FHIR_FRIENDLY_MAP: Record<string, string> = {
  "CNS do profissional solicitante não está ativo no CNES informado": 
    "O cartão SUS (CNS) do profissional que solicitou o atendimento não está ativo ou vinculado à unidade de saúde (CNES) informada no cadastro.",
  "Profissional não cadastrado no CNES": 
    "O profissional solicitante não foi localizado no cadastro oficial do CNES da unidade ativa.",
  "Estabelecimento de saúde inativo": 
    "O CNES informado para a unidade de saúde está marcado como inativo no banco de dados do DATASUS.",
  "CBO incompatível": 
    "O código de ocupação (CBO) informado para o profissional não é compatível com os procedimentos permitidos no CNES desta unidade.",
  "Cidadão não localizado na base nacional": 
    "Não foi possível localizar o paciente na base nacional de usuários do SUS. Verifique se o CPF ou CNS foi digitado corretamente.",
  "CNS inválido": 
    "O número do cartão nacional de saúde (CNS) do paciente informado está incorreto ou é inválido.",
  "CPF inválido": 
    "O número de CPF informado do paciente está incorreto ou é inválido.",
  "Data de nascimento divergente": 
    "A data de nascimento informada difere do registro oficial associado a este CPF/CNS na base federal.",
};

/**
 * Attempts to match a raw diagnostic message against known issues to return a friendly Portuguese explanation.
 */
export function getFriendlyExplanation(details: string): string {
  for (const [key, val] of Object.entries(FHIR_FRIENDLY_MAP)) {
    if (details.toLowerCase().includes(key.toLowerCase())) {
      return val;
    }
  }
  return details;
}

/**
 * Parses raw background job error log strings into a highly readable structured object.
 * Varre o array de issue da RNDS e traduz o campo diagnostics em texto amigável para o operador.
 */
export function parseJobErrorLog(errorLog: string | null | undefined): ParsedJobError {
  if (!errorLog) {
    return {
      isFhirValidationError: false,
      isInfrastructureError: false,
      rawMessage: '',
      summary: 'Sem registros de erro no momento.',
      issues: [],
    };
  }

  // Separate the error message from stack trace if present
  const lines = errorLog.split('\n');
  const rawMessage = lines[0] || errorLog;
  const stackLines = lines.slice(1).join('\n');
  const stackTrace = stackLines.trim() ? stackLines : undefined;

  // Check if it is a FHIR validation error
  const isFhirValidationError = rawMessage.includes('RndsClinicalValidationError') || rawMessage.includes('Erro de validação clínica na RNDS');

  // Check if it is an infrastructure error
  const isInfrastructureError = 
    rawMessage.includes('RndsInfrastructureError') || 
    rawMessage.includes('ECONNRESET') || 
    rawMessage.includes('ETIMEDOUT') || 
    rawMessage.includes('UND_ERR') ||
    rawMessage.includes('timeout') ||
    rawMessage.includes('connection');

  let summary = rawMessage;
  const issues: ParsedDiagnosticIssue[] = [];

  if (isFhirValidationError) {
    // Rnds error looks like: "Erro de validação clínica na RNDS: [Issue 1] Severity: error, Code: invalid, Details: O cartão SUS (CNS) ... | [Issue 2] ..."
    const partsStartIndex = rawMessage.indexOf('RNDS:');
    const issuesString = partsStartIndex !== -1 ? rawMessage.slice(partsStartIndex + 5).trim() : rawMessage;

    // Split the issues by pipe divider
    const issueParts = issuesString.split(' | ');

    issueParts.forEach((part, index) => {
      // RegEx pattern to parse: [Issue 1] Severity: error, Code: invalid, Details: message text
      const regex = /^\[Issue \d+\]\s+Severity:\s*([^,]+),\s*Code:\s*([^,]+),\s*Details:\s*(.*)$/i;
      const match = part.trim().match(regex);

      if (match) {
        const severity = match[1]?.trim() || 'error';
        const code = match[2]?.trim() || 'invalid';
        const details = match[3]?.trim() || 'Erro desconhecido';
        
        issues.push({
          index: index + 1,
          severity,
          code,
          details,
          friendlyExplanation: getFriendlyExplanation(details),
        });
      } else {
        // Fallback parser if format slightly differs
        issues.push({
          index: index + 1,
          severity: 'error',
          code: 'unknown',
          details: part.trim(),
          friendlyExplanation: getFriendlyExplanation(part.trim()),
        });
      }
    });

    if (issues.length > 0) {
      summary = issues.map(i => i.friendlyExplanation || i.details).join('; ');
    }
  } else if (isInfrastructureError) {
    summary = 'Erro temporário de conexão com o barramento do Ministério da Saúde. O sistema tentará retransmitir em breve.';
  } else {
    // Default system error parsing
    if (rawMessage.startsWith('Error:')) {
      summary = rawMessage.slice(6).trim();
    }
  }

  return {
    isFhirValidationError,
    isInfrastructureError,
    rawMessage,
    summary,
    issues,
    stackTrace,
  };
}

export const ErrorParser = {
  toHumanMessage(errorLog: string | null | undefined): string {
    const parsed = parseJobErrorLog(errorLog);
    return parsed.summary || 'Erro desconhecido no barramento governamental.';
  }
};
