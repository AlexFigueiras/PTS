# Dívida Técnica — packages/domain

## TD-DOMAIN-001: Unificação de Dimensões (Fase 1)

**Status:** pendente  
**Origem:** `lib/pts/intelligence-engine.ts` (PtsDomain, 6 eixos, capitalizados com acento)  
**Decisão travada:**

As 5 dimensões oficiais são: `saude | social | psiquico | juridico | educacao` (minúsculas, sem acento) — definidas em `packages/domain/src/dimensions.ts`.

`Autonomia` NÃO é uma 6ª dimensão. É uma **métrica transversal** mensurada pela IA dentro de cada uma das 5 dimensões (ex.: `saude.autonomia`, `social.autonomia`). O motor de IA avalia o nível de autonomia/dependência do sujeito por dimensão durante a análise de sensibilidade (plano §1.2).

**O que fazer na Fase 1:**
1. Remover `Autonomia` do enum `PtsDomain` em `intelligence-engine.ts`.
2. Adicionar um campo `autonomia?: number | 'alta' | 'parcial' | 'baixa'` (definir tipo exato na Fase 1) ao payload derivado de cada Dimensão.
3. Atualizar os dicionários internos do engine para produzir esse sub-score por dimensão.
4. Unificar os valores de string para minúsculas sem acento (alinhar com `packages/domain`).
5. A regra fixa de sensibilidade (plano §1.2) usará os 5 tipos de `packages/domain` como chave — sem `Autonomia` como chave de primeiro nível.

**Não fazer antes da Fase 1:** não tocar em `intelligence-engine.ts` agora (módulo ativo com I/O; mudança exige Fase 1 completa com testes).
