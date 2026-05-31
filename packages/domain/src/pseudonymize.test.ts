import { describe, it, expect } from 'vitest';
import { pseudonymize, rehydrate } from './pseudonymize';

describe('pseudonymize', () => {
  it('substitui o nome do cidadão por token neutro', () => {
    const { masked } = pseudonymize('Paciente Maria da Silva compareceu.', ['Maria da Silva']);
    expect(masked).not.toContain('Maria da Silva');
    expect(masked).toMatch(/Cidadao_\d{4}/);
  });

  it('substitui CPF por marcador estrutural', () => {
    const { masked } = pseudonymize('CPF: 123.456.789-00', []);
    expect(masked).not.toContain('123.456.789-00');
    expect(masked).toContain('[CPF_REDACTED]');
  });

  it('nenhum identificador conhecido sobrevive no masked', () => {
    const identifiers = ['Maria da Conceição Santos', '000.000.000-00', '(11) 91234-5678'];
    const text = `Paciente Maria da Conceição Santos, CPF 000.000.000-00, tel (11) 91234-5678.`;
    const { masked } = pseudonymize(text, identifiers);
    for (const id of identifiers) {
      expect(masked).not.toContain(id);
    }
  });

  it('rehydrate reassocia corretamente o token ao original', () => {
    const { masked, tokenMap } = pseudonymize('Paciente Maria tem HAS.', ['Maria']);
    const rehydrated = rehydrate(masked, tokenMap);
    expect(rehydrated).toContain('Maria');
  });

  it('texto sem identificadores permanece inalterado em conteúdo semântico', () => {
    const text = 'Paciente apresenta hipertensão arterial sistêmica.';
    const { masked } = pseudonymize(text, []);
    expect(masked).toBe(text);
  });
});
