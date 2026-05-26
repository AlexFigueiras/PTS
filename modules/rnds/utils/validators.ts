/**
 * Utilitários de validação rigorosa para identificadores nacionais de saúde (DATASUS / RNDS).
 */

/**
 * Valida o Cadastro de Pessoas Físicas (CPF) utilizando algoritmo oficial de checksum.
 */
export function isValidCpf(cpf: string): boolean {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) return false;
  
  // Rejeita padrões conhecidos com todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;

  return true;
}

/**
 * Valida o Cartão Nacional de Saúde (CNS) utilizando algoritmo oficial DATASUS.
 * Suporta CNS iniciados com 1 ou 2 (antigos provisórios/definitivos) e 7, 8 ou 9 (novos).
 */
export function isValidCns(cns: string): boolean {
  const cleanCns = cns.replace(/\D/g, '');
  if (cleanCns.length !== 15) return false;

  // Validação de CNS começado com 1 ou 2
  if (/^[1-2]\d{14}$/.test(cleanCns)) {
    const pis = cleanCns.substring(0, 11);
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(pis.charAt(i)) * (15 - i);
    }
    const rest = sum % 11;
    let dv = 11 - rest;
    if (dv === 11) dv = 0;
    
    let result = '';
    if (dv === 10) {
      sum += 2;
      const newRest = sum % 11;
      let newDv = 11 - newRest;
      result = pis + '001' + String(newDv);
    } else {
      result = pis + '000' + String(dv);
    }
    return cleanCns === result;
  }

  // Validação de CNS começado com 7, 8 ou 9
  if (/^[7-9]\d{14}$/.test(cleanCns)) {
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      sum += parseInt(cleanCns.charAt(i)) * (15 - i);
    }
    return sum % 11 === 0;
  }

  return false;
}

/**
 * Valida o Cadastro Nacional de Estabelecimentos de Saúde (CNES).
 * Deve conter exatamente 7 dígitos numéricos.
 */
export function isValidCnes(cnes: string): boolean {
  const cleanCnes = cnes.replace(/\D/g, '');
  return cleanCnes.length === 7;
}

/**
 * Valida a Classificação Brasileira de Ocupações (CBO).
 * Deve conter exatamente 6 dígitos numéricos.
 */
export function isValidCbo(cbo: string): boolean {
  const cleanCbo = cbo.replace(/\D/g, '');
  return cleanCbo.length === 6;
}
