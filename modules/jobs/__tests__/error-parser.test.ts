import { describe, it, expect } from 'vitest';
import { parseJobErrorLog } from '../utils/error-parser';

describe('OperationOutcome Error Parser Utility', () => {
  it('deve lidar corretamente com valores vazios ou nulos', () => {
    const parsedNull = parseJobErrorLog(null);
    expect(parsedNull.isFhirValidationError).toBe(false);
    expect(parsedNull.summary).toBe('Nenhum detalhe de falha registrado.');
    expect(parsedNull.issues).toHaveLength(0);

    const parsedEmpty = parseJobErrorLog('');
    expect(parsedEmpty.summary).toBe('Nenhum detalhe de falha registrado.');
  });

  it('deve parsear com sucesso strings de erro com padrão OperationOutcome da RNDS', () => {
    const rawError = `Erro de validação clínica na RNDS: [Issue 1] Severity: error, Code: processing, Details: CNS do profissional solicitante não está ativo no CNES informado | [Issue 2] Severity: warning, Code: invalid, Details: Telefone celular no formato inválido
    at processRndsTask (...)`;

    const parsed = parseJobErrorLog(rawError);
    expect(parsed.isFhirValidationError).toBe(true);
    expect(parsed.isInfrastructureError).toBe(false);
    expect(parsed.summary).toBe('Rejeição clínica FHIR retornada pelo barramento RNDS (2 issue(s) encontrada(s)).');
    expect(parsed.issues).toHaveLength(2);

    // Issue 1
    expect(parsed.issues[0]).toEqual({
      index: 1,
      severity: 'error',
      code: 'processing',
      details: 'CNS do profissional solicitante não está ativo no CNES informado',
      friendlyExplanation: 'O Cartão Nacional de Saúde (CNS) do profissional que solicitou o PTS não está ativo ou vinculado à unidade de atendimento informada (CNES).'
    });

    // Issue 2
    expect(parsed.issues[1]).toEqual({
      index: 2,
      severity: 'warning',
      code: 'invalid',
      details: 'Telefone celular no formato inválido',
      friendlyExplanation: 'Os dados fornecidos contêm uma informação inválida ou em formato incorreto.'
    });
  });

  it('deve identificar falhas de infraestrutura e rede', () => {
    const rawError = 'Erro de rede ou conexão: RndsInfrastructureError: Network connection timeout at handshake TLS';
    const parsed = parseJobErrorLog(rawError);

    expect(parsed.isFhirValidationError).toBe(false);
    expect(parsed.isInfrastructureError).toBe(true);
    expect(parsed.summary).toBe('Falha técnica temporária de conectividade ou infraestrutura governamental.');
  });

  it('deve retornar falha genérica caso a string não dê match em nenhum padrão conhecido', () => {
    const rawError = 'Something went completely wrong with Drizzle query!';
    const parsed = parseJobErrorLog(rawError);

    expect(parsed.isFhirValidationError).toBe(false);
    expect(parsed.isInfrastructureError).toBe(false);
    expect(parsed.summary).toBe('Erro inesperado durante a execução da tarefa.');
    expect(parsed.rawMessage).toBe(rawError);
  });
});
