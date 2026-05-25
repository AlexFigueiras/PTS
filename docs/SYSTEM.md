# SYSTEM — Plataforma de Governança Intersetorial de PTS

> Documento de referência para qualquer desenvolvedor (ou agente de IA) que
> precise entender como o sistema funciona **hoje**. Mantenha este arquivo
> atualizado a cada mudança arquitetural relevante.
>
> Última atualização: 2026-05-25.

---

## 1. Identidade do produto

Plataforma de **Governança Intersetorial de Planos Terapêuticos Singulares (PTS)** para articulação de redes públicas — **Saúde** (CAPS/UBS), **Assistência Social** (CRAS/CREAS), **Educação** (escolas/NAAPA) e **Setor Jurídico/Direitos** (Conselhos, Defensoria, MP).

**Não é um Prontuário Eletrônico (PEP)** e **não trata de rotina clínica** (prescrição, exames, triagem de enfermagem, evolução ambulatorial). O escopo é exclusivamente o **Ciclo do PTS**:

```
Cadastro do cidadão  ➔  PTS Baseline multidomínio  ➔  Evolução (Radar)  ➔  Despacho intersetorial
```

O sistema é **multi-tenant** (cada município/organização é um tenant) e segue um modelo de **controle centralizado do Estado** com hierarquia clara de governança.

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), TypeScript estrito, Tailwind v4, shadcn/ui base-nova |
| Backend | Next.js Server Components + Server Actions + Route Handlers |
| ORM | Drizzle ORM + postgres-js |
| Banco | PostgreSQL (Supabase) — RLS ativo como defense-in-depth |
| Auth | Supabase Auth (SSR) + Admin API para fluxo de convite |
| Storage | Cloudflare R2 (AWS S3 SDK) com presigned URLs |
| E-mail | Resend (gate por ambiente: noop em local) |
| Observabilidade | Sentry, logger Pino estruturado, request IDs |
| IA | Gemini (Google Generative AI) via Vercel AI SDK |
| Testes | Vitest (unit) + Playwright (e2e, planejado) |

---

## 3. Hierarquia de Governança (RBAC)

Três níveis, **hierarquia estrita** `ADMIN > MANAGER > PROFESSIONAL`. O papel é **global por pessoa** (vive em `profiles.role`, `pgEnum user_role`).

| Papel | Quem é | O que faz |
|---|---|---|
| `ADMIN` | **Administrador Geral** (Município/Prefeitura) | Dono do tenant. Cria unidades intersetoriais (`service_units`) e convida Gerentes. |
| `MANAGER` | **Gerente de Unidade** (Coordenador CAPS / Diretor CRAS) | Gerencia a equipe local. Só convida **Profissionais Técnicos** para unidades em que ele próprio atua. |
| `PROFESSIONAL` | **Profissional Técnico** (Psicólogo, Assistente Social, etc.) | Opera cidadãos e ciclos de PTS. |

API de checagem em [lib/auth/authorization.ts](../lib/auth/authorization.ts):

```ts
hasRole(ctx.role, 'MANAGER')     // boolean, hierarquia inclusa
requireRole(ctx, 'PROFESSIONAL') // lança ForbiddenError se insuficiente
requireAnyRole(ctx, ['MANAGER', 'ADMIN'])
```

**Mapeamento operacional aplicado no retrofit:**
- Listar/ler cidadãos, arquivos, PTS → `PROFESSIONAL`
- Criar/editar cidadãos, upload de arquivos, gravar PTS → `PROFESSIONAL`
- Deletar arquivos, gerenciar membros, settings, convidar → `MANAGER`
- Conceder papel `ADMIN` a alguém, atualizar configurações do tenant → `ADMIN`

A página de equipe (`/settings/team`) só permite que um Gerente promova alguém a `ADMIN` se ele próprio for `ADMIN` (guarda em [member.actions.ts](../modules/members/member.actions.ts)).

---

## 4. Multi-tenant + Multi-vínculo

### 4.1 Tenant ativo

- O usuário pode pertencer a múltiplos tenants (`tenant_members` é M2M).
- O tenant ativo vive no cookie `active_tenant_id` (httpOnly, secure em prod).
- `getActiveTenantContext()` resolve o `TenantContext` a partir desse cookie. Sem cookie → cai para a primeira associação do usuário.
- Trocar de tenant = setar o cookie. O `/api/init-tenant` faz isso após login.

### 4.2 Unidade ativa (multi-vínculo)

A novidade desta arquitetura: um profissional pode atuar em **N unidades** (psicólogo no CAPS **e** no CRAS, por exemplo). Tabela pivô `professionals_to_units` com `is_primary`.

- Cookie `active_unit_id` carrega a unidade de atuação no momento.
- `TenantContext` agora carrega `activeUnitId: string | null`.
- O [UnitSwitcher](../components/layout/unit-switcher.tsx) no header exibe dropdown elegante quando há >1 vínculo; com 1 só, mostra estaticamente.
- A troca chama [setActiveUnitAction](../modules/units/unit.actions.ts), que **valida** que o usuário realmente tem vínculo antes de gravar o cookie.
- **Toda mutação do PTS** carimba a unidade ativa em `pts_responses.unitId / unitType` e `pts_evolutions.unitId / unitType` (rastreabilidade intersetorial — quem fez e a partir de qual setor).

```
[Header → UnitSwitcher] → setActiveUnitAction(unitId)
       → cookie active_unit_id
       → getTenantContext lê o cookie
       → ctx.activeUnitId
       → pts/actions.ts resolveOriginUnit(ctx) usa o activeUnitId
       → pts_responses/pts_evolutions gravam unit_id + unit_type
```

---

## 5. Fluxo de Convites Controlados (Fluxo Inverso)

**Não há auto-cadastro público de profissionais.** A organização "puxa" o usuário para dentro.

```
Admin/Gerente preenche dados                Profissional clica no link
─────────────────────────────                ─────────────────────────
sendProfessionalInvite                       /invite/[token] (público)
  ├─ admin.auth.admin.createUser              ├─ loadInviteForActivation
  │   (com invite_token em metadata,           │   (mostra Nome/CPF/E-mail
  │    trigger NÃO cria tenant novo)           │    bloqueados)
  ├─ profiles upsert {PENDING, role,           ├─ usuário escreve senha
  │  cpf, registry, jobTitle}                  └─ activateAccountAction
  ├─ tenant_members (vínculo ao tenant)          ├─ admin.updateUserById
  ├─ professionals_to_units (unidade)            │   { password }
  ├─ tenant_invites (token, 48h)                 ├─ profiles → ACTIVE
  └─ EmailService.sendInviteEmail                ├─ tenant_invites.acceptedAt
                                                 ├─ signInWithPassword
                                                 └─ redirect /dashboard
```

**Multi-vínculo:** se o e-mail já existir, o `SendProfessionalInviteService` **não** duplica conta — só adiciona a nova linha em `professionals_to_units` (ou avisa "já vinculado").

**Compensação:** se a parte de banco falhar após o `createUser` ter sucedido, a conta órfã do Supabase Auth é removida (`admin.deleteUser`).

**Restrição de papel:** um MANAGER só pode convidar PROFESSIONAL, e só para unidades em que ele próprio atue (`SendProfessionalInviteService` valida). Um ADMIN pode convidar MANAGER ou PROFESSIONAL para qualquer unidade do tenant.

---

## 6. O Ciclo do PTS

### 6.1 Cadastro do cidadão
Núcleo enxuto em [patients](../lib/db/schema/patients.ts): `fullName, socialName, motherName, birthDate, cpf, nis, cns, gender, phone, email, fullAddress, lat, lon, status`. **Sem dados clínicos.** O endereço + geolocalização viabiliza o trabalho territorial (mapa do território).

### 6.2 PTS Baseline (multidomínio)
[components/pts/pts-form.tsx](../components/pts/pts-form.tsx) — formulário multi-step com **etapas por domínio** (não por profissão):

1. **Cadastro** (admissão)
2. **Escuta Inicial** (anamnese genérica)
3. **Domínio Psíquico**
4. **Domínio Saúde** (acesso + autonomia, **sem prontuário**)
5. **Domínio Social / Renda**
6. **Domínio Jurídico / Direitos**
7. **Domínio Educação / Trabalho**
8. **Plano Terapêutico** (despacho com IA)

Cada domínio tem um `DomainIntro` deixando explícito que **qualquer profissional logado pontua o domínio** (`ScoreSelector` 0–4). O assistente social do CRAS pontua "Social/Renda" com a mesma naturalidade que o psicólogo do CAPS pontua "Psíquico".

### 6.3 Evolução (Radar)
[components/pts/evolution-tracker.tsx](../components/pts/evolution-tracker.tsx) — gráfico Radar (recharts) compara baseline × evolução atual em 6 domínios: `Psíquico, Saúde, Social, Jurídico, Educação, Autonomia`.

### 6.4 Apoio à Decisão (IA)
[lib/pts/ai-recommender.ts](../lib/pts/ai-recommender.ts) — Gemini analisa o PTS e devolve:
- `vulnerabilityIndex` (A–E)
- `potentialities[]` + `fragilities[]`
- `suggested_actions[]` (catálogo `predefined_actions`) com justificativa intersetorial
- `strategic_goals` (curto/médio/longo prazo)

Prompt é **intersetorial** — atende Saúde, Assistência Social, Jurídico e Educação por igual.

---

## 7. Arquitetura de Dados

### 7.1 Inventário de tabelas

```
tenants                  organização gestora (município/rede)
profiles                 espelho de auth.users + governança
                         (role, status, cpf, professional_registry, job_title)
tenant_members           M2M usuário↔tenant (existência confirma membership)
tenant_invites           token 48h, profile_id, unit_id, expiresAt, acceptedAt
audit_logs               auditoria por tenant
─────
service_units            unidades intersetoriais (type: HEALTH|SOCIAL|LEGAL|EDUCATION)
professionals_to_units   pivot M2M Profissionais × Unidades (is_primary)
─────
patients                 cidadão no território (núcleo enxuto, sem clínica)
─────
pts_responses            PTS baseline + rastreabilidade (professional_id, unit_id, unit_type)
pts_evolutions           ciclos de evolução + rastreabilidade
pts_documents            (legado paralelo, mantido)
predefined_actions       catálogo de ações p/ Despacho
─────
files                    arquivos (storage_key no R2)
─────
groups · group_facilitators · group_memberships · group_sessions · group_attendance
                         atividades em grupo (CAPS/CRAS)
```

### 7.2 Enums

| Enum | Valores | Onde vive |
|---|---|---|
| `user_role` | `ADMIN, MANAGER, PROFESSIONAL` | `profiles.role` |
| `profile_status` | `PENDING, ACTIVE, INACTIVE` | `profiles.status` |
| `service_unit_type` | `HEALTH, SOCIAL, LEGAL, EDUCATION` | `service_units.type`, `pts_responses.unit_type`, `pts_evolutions.unit_type` |
| `tenant_role` (legado) | `owner, admin, professional, assistant` | `tenant_members.role`, `tenant_invites.role` (vestigial — autorização real lê `profiles.role`) |
| `day_of_week` | `monday..sunday` | `groups.days_of_week` |

### 7.3 Trigger `handle_new_user`
[Migração 0009 + atualização em 0013] — `AFTER INSERT ON auth.users`:
- Cria `profiles` (`ON CONFLICT DO NOTHING`).
- Se `raw_user_meta_data` tem `invite_token` → **para aqui** (o `SendProfessionalInviteService` cuida do resto).
- Senão (signup normal) → cria `tenants`, `tenant_members` (role `owner`) e **marca o profile como ADMIN/ACTIVE** (o signup só é usado por Administrador Geral bootstrappando um município).

### 7.4 RLS
Migração 0001 ativa RLS em todas as tabelas. O app usa a role `postgres` (bypassa RLS) — autorização é feita em código via `TenantContext`. RLS é **defense-in-depth** contra acesso direto via Supabase anon/authenticated keys.

---

## 8. Camadas e padrões de código

### 8.1 Estrutura de pastas

```
/app                rotas, layouts, server components
   /(app)           rotas autenticadas (dashboard, patients, settings…)
   /(auth)          rotas de ativação de conta (públicas)
   /(public)        login, signup
   /api             route handlers
/components         UI compartilhada (layout, ui/, pts/, maps/)
/modules            domínios de negócio
   /patients
   /pts             (parte vive em app/(app)/patients/[id]/pts/)
   /invites
   /members
   /units           multi-vínculo
   /storage
   /email
   /tenants
   /audit
   /groups
   /files
/services           BaseService (orquestração)
/repositories       BaseTenantRepository (acesso ao banco)
/lib                infra (auth, db, supabase, providers, logger, env)
/validations        schemas Zod compartilhados (pts-schema.ts)
/types              tipagens globais
/hooks              custom hooks
/drizzle/migrations SQL + meta/ snapshots + _journal.json
/scripts            scripts utilitários (inspect-db.mjs, apply-pending-migrations.mjs)
/docs               documentação (este arquivo + ARCHITECTURE.md + technical-debt.md)
```

### 8.2 Padrão DTO/Mapper

Repositories devolvem rows do banco; **services convertem para DTOs** antes de entregar à UI. Exemplo canônico: `modules/audit/`. Regra: **nunca** retornar row do banco direto para Server Component / Client Component.

### 8.3 Repository + Service base

```ts
// repositories/base.repository.ts
abstract class BaseTenantRepository {
  protected readonly ctx: TenantContext;
  // toda query DEVE filtrar por this.tenantId
}

// services/base.service.ts
abstract class BaseService {
  protected readonly ctx: TenantContext;
  // orquestra repositories + auditoria + regras de negócio
}
```

`TenantContext` **nunca** vem do client — deriva sempre da sessão Supabase + checagem de `tenant_members`.

### 8.4 Provider pattern (anti-lock-in)

Toda integração externa segue **interface + impl + ponto de troca único**:
- `lib/providers/storage/{types,r2,index}.ts` — R2 hoje, trocável.
- `lib/providers/email/{types,resend,index}.ts` — Resend hoje, com noop em local.
- `lib/rate-limit/index.ts` — Upstash, com noop fallback.
- DB: Drizzle (Postgres) — host trocável.
- Auth: tipos em `lib/auth/types.ts` (`AuthenticatedUser`) — services nunca importam tipos do `@supabase/supabase-js`.

### 8.5 Caching

- **Por request:** `React.cache(fn)` deduplica chamadas dentro do render. Usado em `getAuthUser`, `getTenantContext`, `getRequestId`, `getRequestLogger`. Não vaza entre requests (logo, não vaza entre tenants/usuários).
- **Cross-request:** Next.js fetch cache / `unstable_cache` — **toda chave/tag DEVE incluir `tenantId`** (e `userId` quando aplicável).
- Invalidação: `revalidateTag('tenant:<id>')` ou `revalidatePath` na mesma request da mutação.

### 8.6 Auditoria

Duas formas, em ordem de preferência:
1. **`withAudit(meta, fn)`** declarativo, envelopa funções de domínio. Grava em sucesso; em erro registra com `metadata.failed=true` e re-lança.
2. **`AuditService.record()`** manual para casos pontuais.

Sempre dentro do service ou na borda de uma action — **nunca** em repository.

### 8.7 Logging + Request IDs

- `lib/logger.ts` — Pino em Node, JSON-console fallback em Edge. Redact em `password|token|authorization|cookie|jwt|access_token|refresh_token|apiKey`.
- O proxy gera/propaga `x-request-id`.
- `lib/request-logger.ts` → `getRequestLogger()` retorna child logger com `{requestId, userId, tenantId, appEnv}`.

---

## 9. Autenticação — fluxo completo

### 9.1 Cliente Supabase
- `lib/supabase/server.ts` — SSR (Server Components, Server Actions, Route Handlers).
- `lib/supabase/client.ts` — Client Components.
- `lib/supabase/middleware.ts` — `updateSession()` para refresh dentro do proxy.
- `lib/supabase/admin.ts` — **service role**, bypassa RLS, libera `auth.admin.*`. **Server-only**, usada apenas pelo fluxo de convite.

**Regra de ouro:** `supabase.auth.getUser()` (revalida JWT no Auth server). **Nunca** confiar em `getSession()` para autorização.

### 9.2 Proxy
[proxy.ts](../proxy.ts) — intencionalmente mínimo: refresh de sessão, redirect público/protegido, propagação de request-id. **Sem** queries no banco, **sem** lógica de negócio.

Public paths: `/login, /signup, /forgot-password, /auth/callback, /api/init-tenant, /invite`.

### 9.3 Rate limit
`lib/rate-limit/index.ts` (Upstash + noop fallback). Buckets: `auth` 10/min, `api` 60/min, `mutation` 30/min. Usado em Server Actions/Route Handlers via `enforceRateLimit(bucket, identifier)`.

---

## 10. Banco e migrações

### 10.1 Conexões
- `DATABASE_URL` (porta 6543, pooler transaction mode) → runtime da app.
- `DATABASE_DIRECT_URL` (porta 5432) → drizzle-kit para DDL (opcional; cai para `DATABASE_URL` se ausente).

### 10.2 drizzle.config.ts
Schema em `./lib/db/schema/index.ts` (barrel), saída em `./drizzle/migrations`, dialect `postgresql`, `strict: true`.

### 10.3 Histórico de migrações relevante

| Idx | Tag | Conteúdo |
|---|---|---|
| 0001 | `rls_policies` | ENABLE RLS em todas as tabelas |
| 0009 | `auth_user_trigger` | Trigger `handle_new_user` |
| 0011 | `conscious_baron_zemo` | `pts_evolutions` + locks/review |
| 0012 | `intersectoral_pivot` | Remove PEP (`clinical_records` + enums), cria `service_units`/`professionals_to_units`, enxuga `patients`, rastreabilidade em `pts_responses`/`pts_evolutions` |
| 0013 | `governance_rbac` | Enums `user_role`/`profile_status`, colunas em `profiles`/`tenant_invites`, data migration (owners→ADMIN) e atualização do trigger |

### 10.4 Como aplicar (importante)

⚠️ **O ledger `drizzle.__drizzle_migrations` deste projeto está inconsistente** com o `_journal.json` (8 linhas no DB vs. 12 no journal). Migrações 0005, 0006, 0009–0011 foram aplicadas manualmente via scripts. **Não rode `drizzle-kit migrate` ingenuamente** — ele replicaria DDL já aplicado e quebraria.

Workflow seguro deste projeto:
- `npm run db:generate` — sempre OK (offline, só toca arquivos locais).
- **Aplicar novas migrações:** use [scripts/apply-pending-migrations.mjs](../scripts/apply-pending-migrations.mjs) (transacional, idempotente em práticа) e ajuste a lista `FILES` ao adicionar uma nova.
- **Inspecionar estado do DB:** [scripts/inspect-db.mjs](../scripts/inspect-db.mjs).

### 10.5 Geração de migrações sem prompt interativo

`drizzle-kit generate` exige TTY para prompts de rename. Em ambientes não-interativos (CI, sandbox), evite **drops + adds na mesma tabela ou mesmo categoria de enum** em uma única geração. Se acontecer, gere em dois passos (drops-only, depois creates-only) e consolide manualmente o snapshot.

---

## 11. Storage (Cloudflare R2)

**Chave de objeto:**
```
uploads/{tenantId}/{entity}/{yyyy}/{mm}/{uuid}.{ext}
```

**Upload em duas etapas (arquivo nunca passa pelo servidor Next.js):**
```
Browser → POST /api/storage/presigned-url   (servidor valida + assina)
Browser → PUT  <signedUrl>                  (upload direto ao R2)
```

Helper de UI: [lib/storage/upload-file.ts](../lib/storage/upload-file.ts).

Envs: `CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME` (server-only) e `NEXT_PUBLIC_R2_PUBLIC_URL`.

---

## 12. E-mail (Resend)

Gate por ambiente em `lib/providers/email/index.ts`:
- `local` → noop (log no console).
- `staging | production` → Resend.

Templates HTML inline em `modules/email/templates/` (compatível com Gmail/Outlook/Apple/Yahoo).

Métodos: `sendWelcomeEmail`, `sendPasswordResetEmail`, `sendInviteEmail`, `sendNotificationEmail`.

Envs: `RESEND_API_KEY`, `NEXT_PUBLIC_FROM_EMAIL` (opcional; default `BOSYN <suporte@mail.bosyn.com.br>`).

---

## 13. Variáveis de ambiente

| Variável | Escopo | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | sim |
| `DATABASE_URL` | server | sim (pooler) |
| `DATABASE_DIRECT_URL` | server | recomendada (DDL) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | **sim** (fluxo de ativação de convites) |
| `GEMINI_API_KEY` | server | só p/ IA |
| `RESEND_API_KEY` | server | staging/prod |
| `CLOUDFLARE_R2_*` | server | upload de arquivos |
| `UPSTASH_REDIS_REST_URL/TOKEN` | server | rate limit (cai p/ noop sem) |
| `NEXT_PUBLIC_APP_URL` | público | URL base p/ links de convite |

Validação fail-fast em [lib/env.ts](../lib/env.ts) (Zod).

---

## 14. Dev local

```bash
npm install
# .env.local — copiar de .env.local.example e preencher
npm run dev           # next dev (Turbopack)
npm run typecheck     # tsc --noEmit
npm run build         # next build
npm run db:generate   # drizzle-kit generate (offline, seguro)
node scripts/inspect-db.mjs  # status do banco
```

Para **aplicar uma nova migração**: edite `scripts/apply-pending-migrations.mjs`, adicione o arquivo à lista `FILES`, rode. Aplica transacionalmente. **Não rode** `db:migrate` direto (ver §10.4).

---

## 15. Convenções e armadilhas (leia antes de mexer)

- ✅ **Server-First**: RSC por padrão; Client Component só quando há interatividade. Use `'use client'` apenas no menor escopo possível.
- ✅ **Multi-tenant é regra de ouro**: toda query passa por `BaseTenantRepository` (filtro automático `this.tenantId`). Nunca passe `tenantId` arbitrário.
- ✅ **Active unit** carimba toda mutação de PTS. Se o profissional tem multi-vínculo, lembre que o switcher do header altera essa unidade em tempo real (revalida o layout).
- ✅ **DTO/Mapper sempre**: row do banco nunca chega à UI.
- ✅ **withAudit em Service ou Action**, nunca em Repository.
- ✅ **Provider pattern** para qualquer integração externa nova.
- ❌ **Não use `getSession()`** para autorização — apenas `getUser()`.
- ❌ **Não rode `drizzle-kit migrate`** sem ler §10.4 — o ledger está inconsistente.
- ❌ **Não crie tela de signup de profissional** — o acesso é controlado por convite (§5). O `/signup` existente é só para bootstrap de Admin Geral.
- ❌ **Não acrescente o legado PEP** (prontuário, prescrição, exames, triagem de enfermagem). Foi removido na pivotagem 0012 — qualquer adição contradiz a identidade do produto.
- ❌ **Não confunda `tenant_members.role` (legado)** com `profiles.role` (canônico). RBAC lê `profiles.role`.

---

## 16. Roadmap conhecido / fora de escopo atual

- Tela de criação/gerência de `service_units` para o Admin Geral (CRUD).
- Refresh em tempo real do RoleProvider ao trocar de unidade (atualmente o `revalidatePath('/', 'layout')` cobre).
- Reconciliação completa do ledger `drizzle.__drizzle_migrations` com o `_journal.json`.
- PostHog (analytics), antivirus scanning em uploads, background jobs.
- Frontend completo (Fase 5 do PROJECT_BRAIN) + suite Playwright (Fase 6).

---

## 17. Onde achar o resto

- **`PROJECT_BRAIN.md`** — SSOT vivo, atualizado a cada turno (visão narrativa).
- **`docs/ARCHITECTURE.md`** — desenhos arquiteturais.
- **`docs/technical-debt.md`** — dívidas conhecidas.
- **`CLAUDE.md`** — contexto enxuto para agentes IA.
- **Skills** em `.agent/skills/` — playbooks específicos (database-architect, drizzle-orm-expert, uxui-principles, etc.).
