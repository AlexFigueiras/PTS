# Bloco 3 — Classificação de risco por horizonte temporal

Dependência: Blocos 1 e 2 concluídos.
Fonte da verdade: `PLANO_PTS_PIA_v2.md` §5.8.

## O que fazer

1. **Migration** — adicionar ao `Caso` (ou `Plano`):
   - `nivel_intensidade` enum (`intensivo`, `manutencao_semestral`, `manutencao_anual`, `alta_continuidade`)
   - Default: `intensivo` ao abrir o plano.

2. **Cadência de reavaliação derivada do nível** — o motor de prazos (Bloco 2) usa `nivel_intensidade` para calcular a frequência de reavaliação global do caso:
   - `intensivo` → mensal
   - `manutencao_semestral` → 6 meses
   - `manutencao_anual` → anual

3. **Sugestão de transição de nível** — ao concluir um período com todas as metas cumpridas, o sistema cria uma sinalização sugerindo esticar o intervalo (ex.: intensivo cumprido no trimestre → sugerir `manutencao_semestral`). Humano-no-loop: RT confirma. Usar o motor de sinalização existente.

4. **UI — visão de desafogo** — casos em `manutencao_*` ficam em uma lista separada da fila de casos `intensivos`. O profissional vê as duas visões, mas o foco da tela principal é nos intensivos.

5. **Alta por continuidade** — `alta_continuidade` é estado terminal. Ao atingi-lo, o caso é **arquivado** (flag `arquivado = true`), nunca deletado. Trilha de auditoria preservada.

## Pronto quando
- Um caso progride intensivo → semestral → anual → alta, com cadência mudando a cada transição confirmada pela RT.
- Casos em manutenção não poluem a fila intensiva.

## Não mudar
RLS, humano-no-loop, motor de sinalização (estender). Stack. Sem ORM.
