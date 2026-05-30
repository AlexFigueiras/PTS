# SYSTEM — Plataforma de Governança Intersetorial de PTS

> Documento de referência para qualquer desenvolvedor (ou agente de IA) que
> precise entender como o sistema funciona **hoje**. Mantenha este arquivo
> atualizado a cada mudança arquitetural relevante.
>
> Última atualização: 2026-05-30.

---

## 1. Identidade do produto

Plataforma de **Governança Intersetorial de Planos Terapêuticos Singulares (PTS)** para articulação de redes públicas — **Saúde** (CAPS/UBS), **Assistência Social** (CRAS/CREAS), **Educação** (escolas/NAAPA) e **Setor Jurídico/Direitos** (Conselhos, Defensoria, MP).

**Não é um Prontuário Eletrônico (PEP)** e **não trata de rotina clínica** (prescrição, exames, triagem de enfermagem, evolução ambulatorial). O escopo é exclusivamente o **Ciclo do PTS**:

```
Cadastro do cidadão  ➔  PTS Baseline multidomínio  ➔  Evolução (Radar)  ➔  Despacho intersetorial
```

O sistema é **multi-tenant** (cada município/organização é um tenant) e segue um modelo de **controle centralizado do Estado** com hierarquia clara de governança.

---

## 1.1 As 5 Dimensões (fonte única)

O PTS clássico (Política Nacional de Humanização) olha três âmbitos — orgânico, psicológico e social. Este sistema adota uma **adaptação intersetorial deliberada** desse modelo, com **5 Dimensões** (não 6):

```
Saúde · Social · Psíquico · Jurídico · Educação
```

Fonte única canônica em [packages/domain/src/dimensions.ts](../packages/domain/src/dimensions.ts) (`DIMENSIONS = ['saude','social','psiquico','juridico','educacao']`).

**Autonomia não é uma 6ª dimensão** — é uma **métrica transversal** (sub-score) avaliada dentro de cada dimensão. O Radar histórico ([components/pts/evolution-tracker.tsx](../components/pts/evolution-tracker.tsx)) ainda renderiza 6 eixos por legado; a unificação para as 5 dimensões oficiais está pendente na Fase 1 (ver [technical-debt.md](technical-debt.md) TD-DOMAIN-001).

> Apresentar sempre como **"adaptação intersetorial do PTS"**, nunca como protocolo oficial fechado.

## 1.2 Modelo de visibilidade e sensibilidade (coração LGPD)

Princípio que rege tudo: **compartilha-se a necessidade de coordenação, não o dado clínico que a justifica.**

Duas camadas de dado:

- **Camada-fonte (sensível, bruta):** o relato clínico/assistencial original de cada rede. Alimenta a IA na ingestão; **fica restrita à esfera de origem e nunca entra no PTS compartilhado.**
- **Camada-derivada (Dimensão):** abstração read-only produzida pela IA — estado, fragilidade, potencialidade, risco. É o que o PTS exibe e compartilha.

Regras fixas de visibilidade:

1. **Dimensões → visíveis a todos os profissionais do caso** (Saúde, Social, Jurídico, Educação). É o coração do PTS interdisciplinar.
2. **Relato bruto → nunca atravessa esferas.** A evolução detalhada, o registro de sessão, o relato do CRAS ficam na esfera de origem. Só alimentam a IA no momento da ingestão.
3. **Exceção estreita — conteúdo psiquiátrico sensível:** diagnóstico nominal, medicação e conteúdo de sessão **não** aparecem crus na Dimensão Psíquico. Ela exibe apenas a **vulnerabilidade e a necessidade de ação**, de forma abstraída.

**A regra de sensibilidade é fixa, decidida pelo sistema — nunca pela IA** — para ser previsível e auditável. Um alerta ao CRAS diz *"risco aumentado de reinternação, articular suporte social"*, nunca *"médico relatou surto em tal data"*.

> Princípio de produto, ainda não implementado em código (Fases 1–4). Documentado aqui como invariante de design — toda feature de Dimensão/alerta/ingestão deve respeitá-lo.

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
[components/pts/evolution-tracker.tsx](../components/pts/evolution-tracker.tsx) — gráfico Radar (recharts) compara baseline × evolução atual nas **5 Dimensões oficiais** (`Saúde, Social, Psíquico, Jurídico, Educação` — ver §1.1). **Autonomia** é métrica transversal (sub-score dentro de cada dimensão), não um 6º eixo. O componente ainda renderiza 6 eixos por legado; unificação pendente na Fase 1 ([technical-debt.md](technical-debt.md) TD-DOMAIN-001).

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

> **Desvio deliberado e documentado do plano §2.1.** O plano fixou "Sem ORM" (supabase-js direto, RLS nativo). A decisão consciente do projeto foi **manter Drizzle + postgres-js** (preserva o código que funciona e a type-safety) — não é desvio acidental nem deve ser revertido. A contrapartida acordada é **tornar o RLS real**: client request-scoped operando como role `authenticated` com propagação de claims por transação, em vez de conectar como `postgres`. Essa aplicação do RLS real está **pendente na Fase 0**. Até lá, o isolamento depende exclusivamente do `TenantContext` em código.

### 7.5 Estratégia de domínio clínico — Híbrida

O domínio do PTS é modelado em **dois eixos**, cada um persistido conforme seu padrão de acesso:

- **Eixo Estático — Observações/SDoH (Módulo I).** Respostas de baseline e evolução vivem no payload JSONB de `pts_responses` / `pts_evolutions`. Evita tabelas gigantes hardcoded e migrations a cada nova pergunta de formulário. Mutações usam `jsonb_set` atômico no banco com checagem de True Idempotency (descarta duplicados em retry).
- **Eixo Dinâmico — Tasks/Encaminhamentos (Módulo III).** Tarefas intersetoriais vivem em tabela física normalizada (`intersectoral_tasks`) para garantir integridade referencial, travas concorrentes (`FOR UPDATE SKIP LOCKED`), histórico linear de auditoria (`history` append-only) e indexação GIN/B-Tree sub-milissegundo para as filas das unidades (CRAS/CREAS/CAPS). A transição entre estados é uma **FSM estrita** validada no `IntersectoralTaskService`.

Implementado em [modules/pts/services/intersectoral-task.service.ts](../modules/pts/services/intersectoral-task.service.ts) e [lib/db/schema/intersectoral-tasks.ts](../lib/db/schema/intersectoral-tasks.ts).

---

## 8. Camadas e padrões de código

### 8.1 Estrutura de pastas

**Monorepo via NPM Workspaces** (`package.json` raiz: `workspaces: ["apps/*","packages/*"]`). Criado na Fase 0 (30/05). Estado de transição: o **app web Next.js continua na raiz** (não foi movido para `apps/web`).

```
packages/domain    @pts/domain — regras puras, sem I/O. Fonte única das DIMENSIONS (5).
packages/adapters  @pts/adapters — ingestão plugável e ISOLADA (depende de @pts/domain).
                   STUB hoje; ingestão real entra na Fase 3 (plano §7). Princípio
                   inegociável: o núcleo nunca conhece a fonte (plano §2).
apps/mobile        @pts/mobile — stub do app de campo (futuro).
─── (web na raiz — estado de transição) ───
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

### 8.8 Server Actions: Zero Trust (Anti-Spoofing)

Server Actions são **controladores RPC finos** — orquestram entrada, delegam à camada de serviço e revalidam cache. Toda a inteligência de negócio vive no service.

**Proteção obrigatória contra Client-Input Spoofing:** Server Actions **nunca** aceitam `tenantId`, `activeUnitId`, `userId` ou `role` vindos do cliente. Esses metadados são lidos **estritamente** da sessão segura via:

```ts
const ctx = await getTenantContext();   // lê cookie httpOnly + valida em tenant_members
requireRole(ctx, 'PROFESSIONAL');        // política RBAC
```

Mesmo que o cliente envie esses campos no payload, o service os ignora — apenas o `TenantContext` derivado do cookie é fonte da verdade. O Zod schema valida apenas dados de domínio (texto, IDs de entidades-filhas, etc.).

### 8.9 Worker de background: exceção de escopo

Workers de fila (`background_jobs`) e o Reaper rodam em **escopo global de superusuário** — não há `TenantContext` na borda externa do Cron. O `BackgroundJobsRepository` por isso **não** estende `BaseTenantRepository` para os métodos estáticos (`pollNextJobForExecution`, `reapStuckJobs`), que precisam varrer todos os tenants via `FOR UPDATE SKIP LOCKED`. O `TenantContext` é então **reinjetado explicitamente** no handler de cada job antes da execução da lógica de negócio — restabelecendo o isolamento dentro de um worker que precisa enxergar a fila inteira.

### 8.10 Sincronização offline — REMOVIDA

> **O sistema é online-only** (decisão travada, alinhada ao plano §2). Não há offline-first, WatermelonDB, IndexedDB, `OfflineStore` nem `SyncService` de merge. A pasta `lib/offline/` foi removida na Fase 0. O PTS salva diretamente via Server Action. Não reintroduzir sincronização offline — está fora de escopo inclusive na operação real.

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

## 13. Background Jobs (Filas Relacionais e Resiliência)

> ⚠️ **RNDS é módulo CONGELADO / pós-contrato.** O plano §0 é categórico: o sistema **não envia dados ao governo federal** — integração federal (RNDS/MDS) é caminho futuro, só após contrato e credenciamento (plano, apêndice "Integração real"). Hoje está **neutralizada via flag `RNDS_ENABLED=false`** (server-only). **Não é regra de ouro nem invariante de arquitetura.** A infraestrutura de fila descrita abaixo (`background_jobs`, Outbox, Reaper, Notificações) **é real e em uso** — porém para consumidores vivos (e-mail, notificações in-app). O handler RNDS permanece congelado: não remover, não investir, não pode quebrar o build.

Uma infraestrutura de fila transacional baseada em banco de dados (`database-centric queue`) que isola o fluxo síncrono do utilizador das oscilações, falhas e latências de jobs assíncronos (e-mail, notificações; e, quando reativado pós-contrato, RNDS/MDS).

### 13.1 Arquitetura da Fila
- **Tabela canônica**: `background_jobs` no PostgreSQL.
- **Transacionalidade e Concorrência**: Busca de tarefas no banco usando a estratégia PostgreSQL `SELECT FOR UPDATE SKIP LOCKED` nativa do Drizzle, garantindo concorrência perfeita e execução livre de race conditions mesmo com múltiplos workers rodando em paralelo.
- **Trabalho Tenant-Aware e Desacoplamento de Herança**: O `BackgroundJobsRepository` é desacoplado da herança do `BaseTenantRepository`. Isso elimina o **Paradoxo do Cron Global** (onde um worker global executando sem tenant ativo falharia ao tentar filtrar queries com `WHERE tenant_id = NULL`). A classe recebe e isola o `tenantId` apenas para operações de instância geradas pela aplicação (como `enqueueJob` e `listJobs`), enquanto os métodos estáticos do Worker de Background (`pollNextJobForExecution`, `reapStuckJobs`) operam de forma global na base de dados para processar e recuperar jobs de todos os inquilinos sequencialmente.
- **Transactional Outbox**: Para garantir consistência indestrutível, as Server Actions (como criação ou evolução do PTS) e o enfileiramento das integrações correspondentes (como a RNDS) rodam na mesma transação atômica (`db.transaction(async (tx) => { ... })`). Se o PTS falhar em salvar, o job nunca é enfileirado. Se o job falhar em enfileirar, a mutação clínica sofre rollback atômico. Todas as queries de fila internas respeitam estritamente a referência `tx` local sem vazamentos de transação ou de conexões.

### 13.2 Retry Engine e Backoff Exponencial
Diferenciação clara entre falhas temporárias (rede/infraestrutura) e falhas permanentes (negócio/semântica):
- **Erros Fatais (Clínicos/Semânticos)**: Erros como `RndsClinicalValidationError` (validações FHIR que retornam `OperationOutcome`) são fatais. O job é movido imediatamente para `dead_letter` (DLQ) para análise humana e re-enfileiramento.
- **Erros Retentáveis (Infraestrutura/Rede)**: Erros de conexão, timeouts de socket, handshakes mTLS do ICP-Brasil (`RndsInfrastructureError` ou erros da biblioteca `undici`) sofrem retentativa automática.
- **Backoff Exponencial + Jitter**: A retentativa é agendada de forma exponencial com cálculo de jitter aleatório para evitar colisões no barramento (thundering herd):
  $$backoff = \min(30s \times 2^{retryCount - 1}, 3600s)$$
  $$jitter = [0, 20\% \times backoff]$$

### 13.3 Invocação e Triggering
- **API Endpoint**: `/api/jobs/process` protegida em produção via token no header `Authorization: Bearer <CRON_SECRET>`.
- **Lote Limitado**: Processa um lote controlado de até 15 jobs por chamada para evitar timeouts e respeitar limites serverless.
- **Cron**: Disparado periodicamente (ex: a cada minuto) via Vercel Cron.

### 13.4 Reaper (Mecanismo Antizumbi)
Em ambientes serverless, processos de execução de API ou de workers em background podem sofrer interrupções abruptas por limites de tempo (`timeouts`), faltas de memória ou restarts. Para evitar que tarefas fiquem presas indefinidamente no status `'processing'` (estados zumbis):
- **Mecanismo de Reaper**: A cada início da execução da rota do cron (`/api/jobs/process`), o método `BackgroundJobsRepository.reapStuckJobs` busca atomicamente todas as tarefas marcadas como `'processing'` há mais de 5 minutos.
- **Recuperação e Resiliência**: Essas tarefas são resetadas atomicamente de volta para `'queued'`. O log de erros é atualizado com informações sobre o shutdown abrupto e o contador de tentativas (`retries`) é incrementado. Caso as tentativas tenham se esgotado, a tarefa é despachada para a DLQ (`dead_letter`).

### 13.5 Motor de Alertas e Notificações (Loop Fechado em Tempo Real)
Para fechar o loop de feedback assíncrono de tarefas que falham no background:
- **Camada de Dados**: Tabela `inbox_notifications` mapeia alertas críticos (`type: 'info' | 'warning' | 'error'`) sob isolamento multi-tenant (`tenantId`) e vinculados a usuários específicos (`userId`).
- **Geração Humanizada de Alertas (TypeScript)**: O processamento de falhas ocorre inteiramente no ecossistema da aplicação (`JobProcessorService`). Quando um job é movido para o status `'dead_letter'`, invocamos o `ErrorParser.toHumanMessage(job.errorLog)` para traduzir diagnósticos de validação clínica e técnica em explicações amigáveis em português antes de salvar a notificação via `NotificationService.createNotification()`.
- **Segurança Zero-Trust e RLS Estrito**: A tabela `inbox_notifications` possui Row Level Security (RLS) habilitado. Uma política estrita garante que os usuários (`auth.uid() = user_id`) só possam visualizar ou escutar suas próprias notificações.
- **Realtime Sync Seguro**: O canal de replicação do Supabase Realtime para a tabela `inbox_notifications` passa obrigatoriamente pela validação das políticas RLS no banco de dados. O componente `NotificationListener` no client-side subscreve-se de maneira segura, recebendo notificações instantaneamente via WebSocket, exibindo toasts (`sonner`) e atualizando o `NotificationBell` com baixa latência.

---

## 14. Variáveis de ambiente

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
| `CRON_SECRET` | server | token secreto para proteger trigger de background jobs |

Validação fail-fast em [lib/env.ts](../lib/env.ts) (Zod).

---

## 15. Dev local

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

## 16. Convenções e armadilhas (leia antes de mexer)

- ✅ **Server-First**: RSC por padrão; Client Component só quando há interatividade. Use `'use client'` apenas no menor escopo possível.
- ✅ **Multi-tenant é regra de ouro**: toda query passa por `BaseTenantRepository` (filtro automático `this.tenantId`). Nunca passe `tenantId` arbitrário.
- ✅ **Active unit** carimba toda mutação de PTS. Se o profissional tem multi-vínculo, lembre que o switcher do header altera essa unidade em tempo real (revalida o layout).
- ✅ **DTO/Mapper sempre**: row do banco nunca chega à UI.
- ✅ **withAudit em Service ou Action**, nunca em Repository.
- ✅ **Provider pattern** para qualquer integração externa nova.
- ✅ **Server Action é controlador RPC fino**: Zod no input, ler `TenantContext` do cookie, delegar ao service. Lógica de negócio mora no service.
- ✅ **Transactional Outbox**: mutações que disparam integração externa (RNDS/MDS) enfileiram o job em `background_jobs` **dentro da mesma transação** (`db.transaction(tx => {...})`) da entidade clínica.
- ✅ **Preservação de Dados Locais vs. Limites Downstream**: Jamais mutile ou trunque dados clínicos/sociais salvos no PostgreSQL municipal (ex: truncamento de strings de 4000 caracteres dos perfis FHIR R4) na camada de persistência do core. As restrições para satisfazer canos estreitos de terceiros devem residir **exclusivamente nas camadas de mapeamento final** (`RacMapper.toFhirBundle`). _Nota: `SyncService` (sync offline/delta) e o `RacMapper`/FHIR são **código congelado** (`@ts-nocheck`) — sync offline foi removido (§8.10) e RNDS é pós-contrato (§13). Esta convenção só volta a valer se/quando reativados._
- ❌ **Anti-spoofing**: Server Action **nunca** aceita `tenantId`, `activeUnitId`, `userId` ou `role` do cliente. Esses campos vêm exclusivamente da sessão (cookie httpOnly), nunca do payload.
- ❌ **Não use `getSession()`** para autorização — apenas `getUser()`.
- ❌ **Não rode `drizzle-kit migrate`** sem ler §10.4 — o ledger está inconsistente.
- ❌ **Não crie tela de signup de profissional** — o acesso é controlado por convite (§5). O `/signup` existente é só para bootstrap de Admin Geral.
- ❌ **Não acrescente o legado PEP** (prontuário, prescrição, exames, triagem de enfermagem). Foi removido na pivotagem 0012 — qualquer adição contradiz a identidade do produto.
- ❌ **Não confunda `tenant_members.role` (legado)** com `profiles.role` (canônico). RBAC lê `profiles.role`.
- ❌ **Não introduza microservices, event bus externo, Kubernetes ou realtime prematuro.** A arquitetura é deliberadamente simples: monolito Next.js + Postgres + fila relacional (`background_jobs`).

---

## 17. Fases de implementação

**As fases canônicas são as do plano (`PLANO_PTS_PIA`), numeradas 0–4** — o plano é a fonte da verdade do destino. A Fase 4 (Segurança/LGPD) é **transversal e contínua**, corre em paralelo desde o início. Ordem: 0 → 1 → 2 → 3, com 4 em paralelo.

| Fase | Tema (plano) | Status real |
|---|---|---|
| **0** | **Fundação** — monorepo, Supabase+Next, multi-tenant, RBAC base, convites controlados, pivotagem intersetorial, CI/lint, RLS de tenant | 🟡 Em fechamento |
| **1** | **Núcleo PTS/PIA** — domínio Caso/Plano/Dimensão/Objetivo/Meta/Ação + FSM, CRUD+RBAC, onboarding cascata, UI dimensões read-only + metas/ações + caixa de sinalizações | 🟡 Parcial |
| **2** | **Motor de Sinalização Cruzada** — catálogo RAPS+SUAS→necessidade, severidade graduada, roteamento ao componente certo, fila+distribuição, estados+auditoria | 🟡 Parcial |
| **3** | **Ingestão simulada + IA (a demo)** — 2 fontes fictícias + endpoint adapter, normalização→Dimensão, IA deriva/sugere/sinaliza, 3 telas split, [opcional] minuta PDF | 🔴 Não iniciada |
| **4** | **Segurança, LGPD e conformidade** (transversal) — base legal, minimização, cifragem, tokenização CPF/CNS, auditoria imutável, regra fixa de sensibilidade | 🟡 Contínua |

### 17.1 Status por fase (estado real do código)

- **Fase 0 — 🟡 em fechamento.** ✅ Monorepo (NPM Workspaces, `@pts/domain`/`@pts/adapters`/`@pts/mobile`), Supabase+Next, multi-tenant, RBAC base, convites controlados, pivotagem intersetorial (mig. 0012/0013), higiene de repo, online-only. ⏳ Pendente: gate de CI/lint verde (TD-LINT-*), **RLS real** (TD-RLS-001), tokenização CPF/CNS (compartilhada com Fase 4).
- **Fase 1 — 🟡 parcial.** ✅ PTS baseline multidomínio, CRUD+RBAC, onboarding cascata (Resend), UI de triagem/loop fechado, `IntersectoralTaskService` (FSM). ⏳ Pendente: **PIA como 2º plano** (RM-PIA), unificação das 5 Dimensões (TD-DOMAIN-001).
- **Fase 2 — 🟡 parcial.** ✅ Fila de unidade + distribuição, estados+auditoria (FSM), motor de notificações/loop fechado. ⏳ Pendente: **catálogo RAPS+SUAS e roteamento por necessidade** (RM-RAPS), severidade graduada completa.
- **Fase 3 — 🔴 não iniciada.** Adapter existe como **stub** (`@pts/adapters`) e há `ai-recommender` (Gemini sugere). Faltam: fontes fictícias, ingestão real→Dimensão, 3 telas split, minuta PDF (RM-PDF).
- **Fase 4 — 🟡 contínua.** ✅ Auditoria, logging redatado, RLS defense-in-depth, anti-spoofing. ⏳ Pendente: cifragem de coluna (TD-002), tokenização IA (RM-TOKEN), modelo de sensibilidade em código (RM-VISIB, já documentado em §1.2).

### 17.2 Marcos entregues (histórico)

| Data | Entrega |
|---|---|
| — | Fundação (Auth, multi-tenant, RBAC base) · Convites controlados · Pivotagem intersetorial + Governança |
| 2026-05-26 | `IntersectoralTaskService` (FSM, RBAC, append atômico de auditoria) · Server Actions Zero-Trust + Transactional Outbox |
| 2026-05-27 | Background jobs + Motor de Alertas e Notificações · Painel de Triagem + UI do Loop Fechado · Correção de Prototype Pollution |
| 2026-05-30 | Higiene de repositório (scripts ad-hoc, JSONs FHIR→docs/schemas/, remoção de offline-first, .env.example) · Migração para monorepo (NPM Workspaces) |

> **Nota:** entregas datadas foram realizadas antes da adoção da numeração de fases do plano; acima estão **remapeadas** para as Fases 0–2 conforme o tema. A suíte Playwright (e2e) entra como parte do gate de qualidade da Fase 0/contínuo.

**Decisões arquiteturais fixadas (Fase 0):**
- Sistema é **online-only**: sem IndexedDB, sem fila de sync cliente. `lib/offline/` removida. PTS salva diretamente via server action.
- Módulos RNDS, files/R2, groups e settings/ivc estão **congelados**: não remover, não investir, não podem quebrar o build.
- JSONs FHIR de referência (BRIndividuo, BRContatoAssistencial, BRRegistroAtendimentoClinico) residem em `docs/schemas/` — referência documental, não importados em runtime.
- Disparo RNDS neutralizado via `RNDS_ENABLED` (feature flag server-only, default `false`). Os três branches `HEALTH` em `savePtsDocument`, `createPtsEvolution` e `createTaskAudited` agora exigem `rndsEnabled && ...`. Habilitar requer contrato RNDS ativo. `intersectoral-task.service.ts` marcado `@ts-nocheck` (LIGADO a código vivo, branch RNDS pós-contrato).

**Fora de escopo / backlog:**
- Tela de criação/gerência de `service_units` para o Admin Geral (CRUD).
- Refresh em tempo real do RoleProvider ao trocar de unidade (atualmente `revalidatePath('/', 'layout')` cobre).
- Reconciliação completa do ledger `drizzle.__drizzle_migrations` com `_journal.json` ([technical-debt.md](technical-debt.md) TD-001).
- PostHog (analytics), antivirus scanning em uploads.

---

## 18. Onde achar o resto

- **`docs/ARCHITECTURE.md`** — diagramas de bolso (auth, cache, auditoria, providers).
- **`docs/DESIGN_SYSTEM.md`** — tokens visuais (paleta OKLCH, geometria, tipografia).
- **`docs/VISUAL_GUIDE.md`** — guia de componentes (sidebar, formulários, especificações Tailwind).
- **`docs/technical-debt.md`** — dívidas técnicas conhecidas.
- **`docs/research/`** — leitura de fundo (não-operacional):
  - [`pts-clinical-guidelines.md`](research/pts-clinical-guidelines.md) — diretrizes clínico-tecnológicas do PTS (metodologia, matriz multidimensional, fluxos intersetoriais). Base conceitual de domínio — não dita arquitetura técnica.
- **`CLAUDE.md`** — cheatsheet para agentes Claude.
- **`GEMINI.md`** — cheatsheet para agentes Gemini.
- **Skills** em `.agent/skills/` — playbooks específicos (database-architect, drizzle-orm-expert, uxui-principles, etc.).
