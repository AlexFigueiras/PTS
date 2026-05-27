# SYSTEM — Plataforma de Governança Intersetorial de PTS

> Documento de referência para qualquer desenvolvedor (ou agente de IA) que
> precise entender como o sistema funciona **hoje**. Mantenha este arquivo
> atualizado a cada mudança arquitetural relevante.
>
> Última atualização: 2026-05-26.

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

### 7.5 Estratégia de domínio clínico — Híbrida

O domínio do PTS é modelado em **dois eixos**, cada um persistido conforme seu padrão de acesso:

- **Eixo Estático — Observações/SDoH (Módulo I).** Respostas de baseline e evolução vivem no payload JSONB de `pts_responses` / `pts_evolutions`. Evita tabelas gigantes hardcoded e migrations a cada nova pergunta de formulário. Mutações usam `jsonb_set` atômico no banco com checagem de True Idempotency (descarta duplicados em retry).
- **Eixo Dinâmico — Tasks/Encaminhamentos (Módulo III).** Tarefas intersetoriais vivem em tabela física normalizada (`intersectoral_tasks`) para garantir integridade referencial, travas concorrentes (`FOR UPDATE SKIP LOCKED`), histórico linear de auditoria (`history` append-only) e indexação GIN/B-Tree sub-milissegundo para as filas das unidades (CRAS/CREAS/CAPS). A transição entre estados é uma **FSM estrita** validada no `IntersectoralTaskService`.

Implementado em [modules/pts/services/intersectoral-task.service.ts](../modules/pts/services/intersectoral-task.service.ts) e [lib/db/schema/intersectoral-tasks.ts](../lib/db/schema/intersectoral-tasks.ts).

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

### 8.10 Sincronização Descentralizada Delta Relacional (Offline-First)

Para dar suporte aos aplicativos móveis em campo sem introduzir bancos NoSQL externos (como CouchDB ou MongoDB), o sistema opera uma esteira de sincronização delta relacional atômica e resiliente via `SyncService`:

- **Janela de Tolerância (Lookback Window)**: No `pullDelta`, subtraímos deterministicamente **1 minuto** da data de referência `lastPulledAt` enviada pelo cliente. Isso resolve o Limbo de Visibilidade de Transações do PostgreSQL (onde timestamps de registros herdam o início da transação lenta e podem ficar invisíveis durante commits concorrentes concorrendo com a query de pull). O cliente móvel é responsável por aplicar filtros de idempotência locais (deduplicação por ID).
- **Soft Delete / Tombstones**: Registros excluídos no campo ou no servidor não são deletados fisicamente do banco de dados (o que impediria os dispositivos offline de descobrirem a deleção). Em vez disso, marcamos a coluna `deleted_at` e atualizamos o `updated_at`. No `pullDelta`, varremos esses registros deletados no lookback e os retornamos na chave unificada `deleted: string[]` de IDs, permitindo a purga local no SQLite/WatermelonDB.
- **Upsert Inteligente no Push**: Na inserção de novos registros offline (`created`), usamos `.onConflictDoUpdate()` baseado no ID para evitar erros por falhas parciais de rede ou escritas secundárias concorrentes, assegurando que o estado local do profissional nunca seja silenciosamente descartado.
- **Motor de Fusão Lógica (Merge Payload)**: Quando há conflito de concorrência (`dbRecord.updatedAt > lastPulledAt`), realizamos uma mesclagem em memória de forma determinística:
  - *Campos de Texto (FHIR/RNDS Compativeis)*: Concatenam-se com marcadores claros (`[Servidor - Modificado em <data>]: ... \n\n [Dispositivo Offline - Profissional <id>]: ...`) e passam por **Truncamento Defensivo estrito a 4000 caracteres** para evitar estouro de limites do barramento federal RNDS (FHIR R4) e consequentes DLQs.
  - *Histórico (Estabilização de Clock Drift)*: Union dos históricos JSONB, normalizando e truncando os timestamps `changedAt` nos segundos (removendo milissegundos) para evitar que desvios menores inflassem o histórico, ordenando de forma cronológica ascendente.
  - *Metadados e Enums*: Matriz de severidade determina a precedência (Prioridade: `stat` > `asap` > `urgent` > `routine`; Status: encerramentos técnicos `completed` / `failed` / `cancelled` / `rejected` vencem o andamento, anexando o relatório consolidado de encerramento).
  - *Alinhamento de Estado (Protocolo WatermelonDB)*: O servidor retorna os registros mesclados diretamente dentro da chave `changes` no formato nativo proprietário do WatermelonDB (`changes: { <tabela>: { created: [], updated: [...], deleted: [] } }`), permitindo que a base SQLite local realize o overwrite de forma nativa e perfeita.
- **Salvaguarda de Integridade Relacional**: Se uma evolução gerada offline fizer referência a uma tarefa (`taskId`) que foi soft-deletada no servidor por outro profissional, capturamos essa exceção de integridade e re-vinculamos a evolução no prontuário do paciente (`patientId`) como uma nota geral de contingência autoexplicativa (removendo a FK e inserindo flag `isContingency: true` + notas de contingência no data JSONB).
- **Badge e Estado Offline (`useSyncExternalStore`)**: A contagem de mutações pendentes na IndexedDB é exposta à interface reativa do Next.js via hook `useSyncExternalStore` acoplado ao padrão observer estático da classe `OfflineStore`. Isso elimina hooks customizados baseados em intervalos e eventos de DOM globais, permitindo reatividade instantânea sem re-renders indesejados. Um lock de voo (Mutex `isSyncing`) impede múltiplos cliques concorrentes no badge de sincronismo manual, desativando ponteiros e animações de clique.

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

Uma infraestrutura de fila transacional baseada em banco de dados (`database-centric queue`) desenvolvida para isolar o fluxo síncrono do utilizador das oscilações, falhas e latências das integrações externas (como RNDS/MDS).

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
- ✅ **Preservação de Dados Locais vs. Limites Downstream**: Jamais mutile ou trunque dados clínicos/sociais salvos no PostgreSQL municipal (ex: truncamento de strings de 4000 caracteres dos perfis FHIR R4) na camada de sincronismo ou persistência do core (`SyncService`). As restrições e higienizações para satisfazer canos estreitos de terceiros devem residir **exclusivamente nas camadas de mapeamento final** (`RacMapper.toFhirBundle`).
- ❌ **Anti-spoofing**: Server Action **nunca** aceita `tenantId`, `activeUnitId`, `userId` ou `role` do cliente. Esses campos vêm exclusivamente da sessão (cookie httpOnly), nunca do payload.
- ❌ **Não use `getSession()`** para autorização — apenas `getUser()`.
- ❌ **Não rode `drizzle-kit migrate`** sem ler §10.4 — o ledger está inconsistente.
- ❌ **Não crie tela de signup de profissional** — o acesso é controlado por convite (§5). O `/signup` existente é só para bootstrap de Admin Geral.
- ❌ **Não acrescente o legado PEP** (prontuário, prescrição, exames, triagem de enfermagem). Foi removido na pivotagem 0012 — qualquer adição contradiz a identidade do produto.
- ❌ **Não confunda `tenant_members.role` (legado)** com `profiles.role` (canônico). RBAC lê `profiles.role`.
- ❌ **Não introduza microservices, event bus externo, Kubernetes ou realtime prematuro.** A arquitetura é deliberadamente simples: monolito Next.js + Postgres + fila relacional (`background_jobs`).

---

## 17. Fases de implementação

O sistema evolui em fases. Cada fase fecha um "loop" funcional antes da próxima abrir.

| Fase | Tema | Status |
|---|---|---|
| 1 | Fundação (Auth, multi-tenant, RBAC base) | ✅ Concluída |
| 2 | Convites controlados (fluxo inverso) | ✅ Concluída |
| 3 | Pivotagem intersetorial + Governança | ✅ Concluída |
| 3.1 | `IntersectoralTaskService` (FSM, RBAC, append atômico de auditoria) | ✅ Concluída em 2026-05-26 |
| 3.2 | Server Actions Zero-Trust + Transactional Outbox (RNDS) | ✅ Concluída em 2026-05-26 |
| 4 | Background jobs + integração RNDS + Motor de Alertas e Notificações | ✅ Concluída em 2026-05-27 |
| 5 | Frontend completo do Painel de Triagem + UI do Loop Fechado | ✅ Concluída em 2026-05-27 |
| 5.1 | Offline-First: Estrutura do Servidor para Sincronização Delta Relacional (Pull & Push API) | ✅ Concluída em 2026-05-27 |
| 5.2 | Motor de Resolução de Conflitos e Fusão Lógica (Merge Payload) | ✅ Concluída em 2026-05-27 |
| 5.3 | Acessibilidade de Campo, Touch Targets e Ergonomia na UI (UX/UI de Campo) | ✅ Concluída em 2026-05-27 |
| 5.4 | Sinalizadores de Fila Offline e Prevenção de Estado Órfão (Divulgação Progressiva) | ✅ Concluída em 2026-05-27 |
| 6 | Suite Playwright (e2e) | ⏳ Próxima |

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
