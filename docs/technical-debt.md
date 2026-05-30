# Technical Debt

## TD-001 — Ledger de migrações inconsistente

**Tabela:** `drizzle.__drizzle_migrations`  
**Status:** Aberto  
**Prioridade:** Alta

### Contexto

O journal local (`_journal.json`) tem 12+ entradas, mas o ledger no banco só registra 8. Migrações 0005, 0006, 0009–0011 foram aplicadas manualmente via scripts avulsos, quebrando a paridade.

### Impacto

- `drizzle-kit migrate` não pode ser usado com segurança — tentaria reaplicar DDL já existente.
- Novos devs que rodem `db:migrate` vão quebrar o banco.

### Mitigação atual

- Script `scripts/apply-pending-migrations.mjs` com lista manual de arquivos.
- Documentado em `docs/SYSTEM.md` §10.4.

### Resolução ideal

Reconciliar o ledger: inserir as linhas faltantes em `__drizzle_migrations` para que o journal e o banco fiquem em paridade.

---

## TD-002 — Criptografia a nível de coluna para dados sensíveis do PTS

**Tabela:** `pts_responses` (campos de domínio), `patients` (CPF, NIS, CNS)  
**Status:** Aberto  
**Prioridade:** Média

### Contexto

O Supabase aplica criptografia AES-256 em repouso no volume de disco. Porém, qualquer acesso direto ao banco (roles, backups, conexões de emergência) lê dados sensíveis sem restrição adicional.

Para dados sob LGPD (Art. 46), o nível de proteção esperado vai além da criptografia em volume.

### O que falta

- Criptografia a nível de coluna no serviço de aplicação antes de persistir.
- Alternativa: `pgsodium` (disponível no Supabase) com chaves gerenciadas pelo Vault.
- Decriptação centralizada no mapper para não vazar para a stack.

### Impacto de não endereçar

- Vazamento de dados sensíveis em caso de dump ou acesso indevido a credenciais.
- Risco de conformidade LGPD.

---

## TD-003 — `tenant_members.role` vestigial

**Tabela:** `tenant_members`  
**Status:** Aberto  
**Prioridade:** Baixa

### Contexto

O RBAC canônico usa `profiles.role` (enum `user_role`: ADMIN, MANAGER, PROFESSIONAL). O campo `tenant_members.role` (enum `tenant_role`: owner, admin, professional, assistant) é um legado da Fase 2 que ainda existe no schema mas **não é usado para autorização**.

### Impacto

- Confusão para novos devs — dois sistemas de roles no mesmo banco.
- O trigger `handle_new_user` ainda grava `tenant_members.role = 'owner'` no bootstrap.

### Resolução ideal

Migrar para remover a coluna `tenant_members.role` e o enum `tenant_role`, simplificando o schema.

---

## TD-DOMAIN-001 — Unificar fonte das Dimensões (Radar 6 → 5)

**Arquivos:** [packages/domain/src/dimensions.ts](../packages/domain/src/dimensions.ts), [components/pts/evolution-tracker.tsx](../components/pts/evolution-tracker.tsx)
**Status:** Aberto
**Prioridade:** Média — Fase 1

### Contexto

A fonte única canônica são **5 Dimensões** (`saude, social, psiquico, juridico, educacao` — plano §1.1, ver [SYSTEM.md §1.1](SYSTEM.md)). O Radar de evolução ainda renderiza **6 eixos**, tratando "Autonomia" como 6ª dimensão. Pelo plano, Autonomia é **métrica transversal** (sub-score dentro de cada dimensão), não uma dimensão.

### Resolução ideal

Consumir `DIMENSIONS` de `@pts/domain` no Radar; modelar Autonomia como sub-score por dimensão. Remover o `TODO Fase 1` em `dimensions.ts`.

---

## TD-RLS-001 — RLS real (desvio deliberado do "Sem ORM")

**Tabelas:** todas
**Status:** Aberto
**Prioridade:** Alta — Fase 0

### Contexto

O plano §2.1 fixou "Sem ORM" (supabase-js, RLS nativo). Decisão consciente do projeto = **manter Drizzle + postgres-js** (desvio deliberado e documentado, ver [SYSTEM.md §7.4](SYSTEM.md)). A contrapartida acordada ainda **não foi aplicada**: o app conecta como role `postgres` (bypassa RLS); o isolamento depende só do `TenantContext` em código.

### Resolução ideal

Client request-scoped operando como role `authenticated` com propagação de claims (`tenant_id`, `role`) por transação, ativando o RLS como camada real de defesa — não apenas defense-in-depth contra acesso externo.

---

## TD-LINT-001 — Módulos congelados fora do escopo do linter

**Status:** Aberto  
**Prioridade:** Baixa — Fase 0

### Contexto

Os módulos congelados (`modules/rnds`, `modules/jobs`, `modules/groups`, `modules/settings/ivc` e arquivos legados como `sync.service.ts` e `cadunico-etl.worker.ts`) foram removidos do escopo de análise do ESLint via `globalIgnores` para permitir a entrega da Fase 0 sem ruído de código herdado.

### Resolução ideal

Reabilitar o lint em cada módulo conforme ele for descongelado ou refatorado ao longo das Fases 1 a 4.

---

## TD-LINT-002 — Regra no-explicit-any rebaixada para advertência (warn)

**Status:** Aberto  
**Prioridade:** Média — Fase 1

### Contexto

A regra de TypeScript `@typescript-eslint/no-explicit-any` foi temporariamente rebaixada para `warn` na configuração do ESLint para viabilizar build verde e entrega rápida, evitando que anotações `any` em código vivo quebrem o deploy.

### Resolução ideal

Efetuar a tipagem estrita incrementalmente na Fase 1 (alinhada a TD-DOMAIN-001) e subsequentemente endurecer a restrição no CI passando `eslint --max-warnings=0` na Fase 4.

---

## TD-LINT-003 — Advertências remanescentes toleradas no gate atual

**Status:** Aberto  
**Prioridade:** Baixa — Fase 0

### Contexto

Diversas advertências (`warnings`) menores de ESLint (como `@typescript-eslint/no-unused-vars` e regras de acessibilidade `jsx-a11y/*`) foram mantidas e toleradas no gate de integração atual para evitar modificações arriscadas no código visual existente.

### Resolução ideal

Sanar as advertências em código vivo de forma incremental durante a evolução de design system e componentes visuais.

---

## Roadmap — conceitos do plano ainda não implementados (Fases 1–4)

Registrados como dívida/roadmap para não se perderem. **Não implementar fora da fase correspondente.**

| Ref | Conceito | Plano | Fase |
|---|---|---|---|
| RM-PIA | **PIA como 2º plano** com base legal própria (SINASE/ECA), dono distinto (CREAS), campo de medida protetiva + reavaliação. Protótipo usa plano único compartilhado. | §1.4 | 1+ |
| RM-VISIB | **Modelo de sensibilidade/visibilidade** (Dimensões compartilhadas; relato bruto não cruza esferas; Psíquico abstraído por regra fixa do sistema). Já documentado como invariante em [SYSTEM.md §1.2](SYSTEM.md). | §1.2–1.3 | 1–4 |
| RM-RAPS | **Catálogo de componentes da rede** (RAPS 7 componentes + SUAS) mapeado a tipos de necessidade; roteamento inteligente IA → componente correto, RT confirma em 1 clique. | §5.5 | 2 |
| RM-PDF | **Geração de documento legal** (PIA/PTS formal) — IA redige minuta a partir do relato-fonte → editor → export PDF via `@react-pdf/renderer`. | §6B | 3 |
| RM-TOKEN | **Tokenização de CPF/CNS** antes de enviar à IA (Gemini); tier de não-treino + DPA. Pseudonimização reduz, não elimina risco. Exigência da operação real. | §6C | 4 |

---

*Última atualização: 2026-05-30*
