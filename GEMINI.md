# GEMINI.md — contexto enxuto para agentes IA

> Este arquivo é lido automaticamente por agentes Gemini (Antigravity, Jules).
> Mantenha-o **curto e factual** — direcione para os docs longos quando precisar.

## O que este projeto é

**Plataforma de Governança Intersetorial de PTS** — atende Saúde (CAPS/UBS),
Assistência Social (CRAS/CREAS), Educação e Setor Jurídico/Direitos por igual.

**Não é um Prontuário Eletrônico.** Não trate de prescrição, exames, triagem de
enfermagem ou evolução ambulatorial — esse legado foi removido na migração 0012.
O escopo é o **Ciclo do PTS**: Cadastro → Baseline multidomínio → Evolução (Radar) → Despacho.

**Sistema online-only** (sem offline-first/WatermelonDB — removido na Fase 0).
**Não envia dados ao governo federal** — RNDS é módulo congelado/pós-contrato (ver Regras de ouro).

## As 5 Dimensões e o modelo de visibilidade (LGPD)

5 Dimensões oficiais (fonte única em
[packages/domain/src/dimensions.ts](packages/domain/src/dimensions.ts)):
**Saúde · Social · Psíquico · Jurídico · Educação**. Autonomia é métrica
transversal (sub-score), não 6ª dimensão.

**Princípio que rege tudo:** compartilha-se a *necessidade de coordenação*, nunca o
*dado bruto que a justifica*. Dimensões (derivadas, read-only) são visíveis a todos
os profissionais do caso; o **relato clínico/assistencial bruto nunca atravessa
esferas** (fica na origem, só alimenta a IA na ingestão); conteúdo psiquiátrico
sensível sai **abstraído** na Dimensão Psíquico, por **regra fixa do sistema — nunca
decidida pela IA**. Detalhes em [docs/SYSTEM.md](docs/SYSTEM.md) §1.1–1.2.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript estrito · **Drizzle ORM** · Supabase
(Postgres + Auth) · Tailwind v4 + shadcn/ui · R2 (storage) · Resend · Sentry · Vitest.

Monorepo NPM Workspaces (`apps/*`, `packages/*`). Drizzle é decisão travada — desvio
**deliberado e documentado** do "Sem ORM" do plano §2.1; RLS real ainda pendente
([docs/technical-debt.md](docs/technical-debt.md) TD-RLS-001).

## RBAC de 3 níveis

`UserRole = 'ADMIN' | 'MANAGER' | 'PROFESSIONAL'` — papel **global** em
`profiles.role`. Hierarquia estrita `ADMIN > MANAGER > PROFESSIONAL`.

- `ADMIN` = Administrador Geral (Município/Prefeitura, dono do tenant)
- `MANAGER` = Gerente de Unidade (CAPS/CRAS)
- `PROFESSIONAL` = Profissional Técnico (ponta)

Use `requireRole(ctx, 'MANAGER')` / `hasRole(ctx.role, 'PROFESSIONAL')` de
[lib/auth/authorization.ts](lib/auth/authorization.ts). O legado
`tenant_members.role` (owner/admin/professional/assistant) está vestigial — **não**
o use para autorização.

## Convites são controlados (fluxo inverso)

Não há auto-cadastro de profissionais. O `SendProfessionalInviteService`
pré-cadastra (`profiles` PENDING + `tenant_members` + `professionals_to_units` +
`tenant_invites` com token 48h) usando o cliente admin do Supabase. O profissional
ativa em `/invite/[token]` (público) definindo a senha.

## Multi-vínculo + unidade ativa

Profissional pode atuar em N unidades (`professionals_to_units`). Cookie
`active_unit_id` controla qual unidade carimba as mutações de PTS. O switcher
no header revalida o layout ao trocar.

## Após concluir mudança (OBRIGATÓRIO)

Antes de finalizar a resposta ao usuário, **atualize `docs/SYSTEM.md`** na
seção pertinente:
- Feature/fase concluída → linha nova ou atualização na **tabela §17**.
- Mudança arquitetural → seção correspondente (§7 dados, §8 padrões, §13 jobs, etc.).
- Mudança trivial (typo, comentário) → declarar explicitamente na resposta, sem alterar doc.

Git pre-commit valida isso. Bypass só com `--no-verify` explícito.

## Regras de ouro

- **Multi-tenant é lei**: queries passam por `BaseTenantRepository` (filtra `tenantId` automaticamente).
- **DTO/Mapper sempre**: nunca devolva row do banco direto para a UI.
- **`getUser()`** valida JWT no Auth server; **nunca** use `getSession()` para autorização.
- **Active unit** carimba PTS — leia `ctx.activeUnitId` antes de gravar `pts_responses`/`pts_evolutions`.
- **Server Action é Zero Trust**: nunca aceite `tenantId`, `activeUnitId`, `userId` ou `role` do payload do cliente — leia do `TenantContext` (cookie httpOnly).
- **Transactional Outbox**: mutações que enfileiram job (e-mail, notificações) persistem entidade e job em `background_jobs` na **mesma transação** (`db.transaction(tx => {...})`).
- **RNDS é congelado / pós-contrato**: integração federal está neutralizada via flag `RNDS_ENABLED=false` (server-only). Não é regra de ouro nem invariante — só reativar após contrato/credenciamento. Não remover, não investir, não pode quebrar o build.
- **Não rode `drizzle-kit migrate`** ingenuamente — o ledger está inconsistente. Aplique novas migrações via [scripts/apply-pending-migrations.mjs](scripts/apply-pending-migrations.mjs). Detalhes em [docs/SYSTEM.md](docs/SYSTEM.md) §10.4.

## Documentação de apoio

- [docs/SYSTEM.md](docs/SYSTEM.md) — referência completa do sistema (o lugar para começar).
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — desenhos arquiteturais.
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — tokens visuais (paleta, tipografia).
- [docs/VISUAL_GUIDE.md](docs/VISUAL_GUIDE.md) — guia de componentes.
- [docs/technical-debt.md](docs/technical-debt.md) — dívidas conhecidas.
- [docs/research/](docs/research/) — leitura de fundo (base clínica de domínio, não-operacional).
- `.agent/skills/` — playbooks específicos (database-architect, drizzle-orm-expert, etc.).

## Pastas de domínio

Monorepo NPM Workspaces. **Web continua na raiz** (não em `apps/web` — estado de transição).

```text
packages/domain    @pts/domain — regras puras, sem I/O. Fonte única das DIMENSIONS (5).
packages/adapters  @pts/adapters — ingestão plugável e ISOLADA (núcleo nunca conhece a fonte). STUB hoje.
apps/mobile        @pts/mobile — stub do app de campo.
─── web na raiz (transição) ───
/app/(app)         rotas autenticadas        /app/(auth)        ativação de convite (pública)
/app/(public)      login/signup              /app/api           route handlers
/components        UI (ui/, layout/, pts/, maps/)
/modules           domínios (patients, pts, invites, members, units, files, …)
/services          BaseService               /repositories      BaseTenantRepository
/lib               infra (auth, db, supabase, providers, logger, env)
/validations       Zod schemas               /drizzle/migrations  SQL + meta/
```
