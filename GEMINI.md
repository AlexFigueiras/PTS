# GEMINI.md — contexto enxuto para agentes IA

> Este arquivo é lido automaticamente por agentes Gemini (Antigravity, Jules).
> Mantenha-o **curto e factual** — direcione para os docs longos quando precisar.

## O que este projeto é

**Plataforma de Governança Intersetorial de PTS** — atende Saúde (CAPS/UBS),
Assistência Social (CRAS/CREAS), Educação e Setor Jurídico/Direitos por igual.

**Não é um Prontuário Eletrônico.** Não trate de prescrição, exames, triagem de
enfermagem ou evolução ambulatorial — esse legado foi removido na migração 0012.
O escopo é o **Ciclo do PTS**: Cadastro → Baseline multidomínio → Evolução (Radar) → Despacho.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript estrito · Drizzle ORM · Supabase
(Postgres + Auth) · Tailwind v4 + shadcn/ui · R2 (storage) · Resend · Sentry · Vitest.

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

## Regras de ouro

- **Multi-tenant é lei**: queries passam por `BaseTenantRepository` (filtra `tenantId` automaticamente).
- **DTO/Mapper sempre**: nunca devolva row do banco direto para a UI.
- **`getUser()`** valida JWT no Auth server; **nunca** use `getSession()` para autorização.
- **Active unit** carimba PTS — leia `ctx.activeUnitId` antes de gravar `pts_responses`/`pts_evolutions`.
- **Não rode `drizzle-kit migrate`** ingenuamente — o ledger está inconsistente. Aplique novas migrações via [scripts/apply-pending-migrations.mjs](scripts/apply-pending-migrations.mjs). Detalhes em [docs/SYSTEM.md](docs/SYSTEM.md) §10.4.

## Documentação de apoio

- [docs/SYSTEM.md](docs/SYSTEM.md) — referência completa do sistema (o lugar para começar).
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — desenhos arquiteturais.
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — tokens visuais (paleta, tipografia).
- [docs/VISUAL_GUIDE.md](docs/VISUAL_GUIDE.md) — guia de componentes.
- [docs/technical-debt.md](docs/technical-debt.md) — dívidas conhecidas.
- `.agent/skills/` — playbooks específicos (database-architect, drizzle-orm-expert, etc.).

## Pastas de domínio

```
/app/(app)         rotas autenticadas        /app/(auth)        ativação de convite (pública)
/app/(public)      login/signup              /app/api           route handlers
/components        UI (ui/, layout/, pts/, maps/)
/modules           domínios (patients, pts, invites, members, units, files, …)
/services          BaseService               /repositories      BaseTenantRepository
/lib               infra (auth, db, supabase, providers, logger, env)
/validations       Zod schemas               /drizzle/migrations  SQL + meta/
```
