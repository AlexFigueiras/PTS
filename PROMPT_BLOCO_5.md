# Bloco 5 — Ajustes menores (roteamento, seletividade do PTS, documento)

Dependência: Blocos 1–4 concluídos.
Fonte da verdade: `PLANO_PTS_PIA_v2.md` §5.5, §6, §6B.

## O que fazer

1. **Roteamento — comorbidade clínica** — no catálogo de componentes (§5.5) e no prompt da IA, adicionar a regra: comorbidade clínica (diabetes, hipertensão, condição orgânica) em paciente psíquico → rotear para **Atenção Básica / eSF** (vaga clínica), não para CAPS (vaga psiquiátrica). Ajustar o texto de instrução/regra enviado ao Gemini.

2. **Seletividade do PTS** — no prompt/regra da IA para indicação de PTS: incluir critérios explícitos de caso crítico (reinternações repetidas, caso travado, risco iminente). A IA não deve indicar PTS para todo caso — apenas os que se enquadram. Ajustar instrução enviada ao Gemini.

3. **Documento legal (6B) — compromissos da rede** — no template do documento gerado (PIA/PTS formal), adicionar seção *"Compromissos pactuados"*: lista de unidades/responsáveis, ação acordada e prazo. Popular a partir das `acoes` com status `pactuada` do caso.

## Pronto quando
- Glicemia descompensada da dona Maria roteia para UBS/eSF, não para CAPS.
- A IA só indica PTS para casos que se enquadram nos critérios críticos.
- O documento gerado inclui a tabela de compromissos com responsáveis e prazos.

## Não mudar
Stack, RLS, motor de sinalização, humano-no-loop.
