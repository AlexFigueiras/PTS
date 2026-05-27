# Arquitetura — visão de bolso

Documento curto para desenvolvedores entrarem no projeto. Referência completa em [SYSTEM.md](SYSTEM.md).

---

## 1. Fluxo de Auth

```
Browser ──▶ Proxy ──▶ Supabase Auth ──▶ Server Component
   │            │            │
   │            │            └─ valida JWT (auth.getUser)
   │            └─ refresh cookies (sb-...)
   └─ sessão guardada em cookies httpOnly
```

- Login/signup chama Supabase pelo client — cookies vêm via `Set-Cookie`.
- Em todo request server-side: `getAuthUser()` revalida o JWT.
- Tipos da app não conhecem o Supabase: `AuthenticatedUser` é a interface de domínio.
- Logout limpa cookies via Server Action.

---

## 2. Fluxo Tenant-aware

```
cookie active_tenant_id ──▶ getActiveTenantContext()
                              │
                              ├─ valida user em tenant_members
                              └─ retorna TenantContext { tenantId, userId, role, activeUnitId }
                                          │
                                          ├─▶ Service (regras + audit)
                                          └─▶ Repository (filtra WHERE tenant_id)
```

- Cookie é setado pelo fluxo "trocar de tenant" da UI.
- `BaseTenantRepository` exige `TenantContext` no construtor — toda subclasse usa `this.tenantId`.
- RLS no banco é defesa em profundidade.

---

## 3. Fluxo do Proxy

`proxy.ts` (raiz) — Edge runtime, **mínimo**.

```
1. Lê/gera x-request-id.
2. Chama updateSession() → refresh cookies + auth.getUser.
3. Path público?     → libera com response refrescado.
4. Sem usuário?      → redirect /login?redirect=<path>.
5. Caso contrário    → libera response.
```

Nada de banco, rate limit, telemetria ou role check aqui.

---

## 4. Estratégia de Cache

Dois níveis distintos:

| Nível                    | Escopo               | Risco de leak              | Onde usar                    |
| ------------------------ | -------------------- | -------------------------- | ---------------------------- |
| `React.cache(fn)`        | 1 render / 1 request | nenhum (não cruza request) | dedupe dentro do render      |
| `unstable_cache` / fetch | cross-request        | **alto** se chave errada   | leituras estáveis por tenant |

**Regras:**

- Para `unstable_cache`/fetch, a chave/tag **sempre** inclui `tenantId` (e `userId` quando aplicável).
- Invalidar via `revalidateTag('tenant:<id>')` ou `revalidatePath` no mesmo Server Action que fez a mutação.
- Nunca cachear DTOs sensíveis (auditoria, dados clínicos brutos) cross-request sem tag explícita.

---

## 5. Estratégia de Logs

```
logger (base)
   │
   ├─ appEnv automático
   ├─ redact: password, token, jwt, cookie, …
   │
   └─ getRequestLogger() ── inclui ──▶ requestId, userId, tenantId
```

- Em código server-side de request: **`await getRequestLogger()`** — nunca `logger` direto.
- Fora de request (jobs, scripts): `logger` base.
- `requestId` vem do header `x-request-id` injetado pelo proxy.
- `LOG_LEVEL` controla verbosidade. `pino-pretty` em dev, JSON em staging/prod.

---

## 6. Estratégia de Auditoria

Ordem de preferência:

1. **`withAudit(descriptor, fn)`** — wrapper declarativo na borda do service/action. Grava em sucesso e em erro (`metadata.failed=true`).
2. **`AuditService.record(...)`** — chamada manual para casos fora de wrapper.

**Não usamos event bus.** Quando o volume justificar fila, só a impl interna do `withAudit` muda — a API pública permanece.

Auditar:

- mutações de domínio clínico (paciente, PTS, encaminhamento intersetorial).
- ações sensíveis (login/logout, export, mudança de role).

NÃO auditar:

- leituras simples.
- helpers internos sem efeito de domínio.

---

## 7. Ambientes

`APP_ENV` é a fonte da verdade (`local | staging | production`), separada de `NODE_ENV`.

| Ambiente   | Onde fica          | Quem preenche env         |
| ---------- | ------------------ | ------------------------- |
| local      | máquina do dev     | `.env.local` (gitignored) |
| staging    | deploy de pré-prod | painel da plataforma      |
| production | deploy oficial     | painel da plataforma      |

Cada ambiente tem **seu próprio** projeto Supabase, banco, Upstash, R2, Sentry, etc. Nada compartilhado.

---

## 8. Padrão de Provedores Externos

Toda integração externa segue:

```
lib/providers/<dominio>/
   ├─ types.ts       ← interface de domínio (independente do vendor)
   ├─ <vendor>.ts    ← implementação concreta
   └─ index.ts       ← factory que escolhe a impl baseado em env
```

Casos atuais:

- DB: Drizzle + postgres-js (vendor-agnóstico).
- Auth: `AuthenticatedUser` (`lib/auth/types.ts`); impl atual = Supabase.
- Rate limit: `RateLimiter` (Upstash + noop).
- Storage: R2 (S3-compatible).
- Email: Resend (com noop em local).

A regra: **services nunca importam SDKs de vendor diretamente**.

---

## 9. Camadas: Service / Repository

```
Server Action / Route Handler
    └── Service (regras de negócio, auditoria, RBAC fino)
            └── Repository (Drizzle, filtra por tenantId)
                    └── DB (postgres-js)
```

**Regras:**
- Repository só faz SQL. Sem lógica de negócio, sem chamadas externas.
- Service nunca faz SQL direto. Usa repositories.
- Server Action / Route Handler instanciam service com `TenantContext` validado.
- Nunca instanciar repository fora de um service.

---

## 10. Server Actions: Zero Trust

Server Actions são **controladores RPC finos** — orquestram entrada, delegam ao service, revalidam cache.

```
Client envia payload (Zod) ──▶ Server Action
                                  │
                                  ├─ ctx = await getTenantContext()   ← cookie httpOnly, nunca payload
                                  ├─ requireRole(ctx, 'PROFESSIONAL')
                                  ├─ service.metodo(ctx, dadosValidados)
                                  └─ revalidateTag('tenant:<id>')
```

**Anti-spoofing:** `tenantId`, `activeUnitId`, `userId` e `role` vêm **estritamente** do `TenantContext` derivado do cookie. Qualquer um desses campos no payload do cliente é ignorado.

---

## 11. Fronteiras Server / Client

| Onde                          | Tipo       | Regra                                         |
| ----------------------------- | ---------- | --------------------------------------------- |
| `app/**/layout.tsx`           | Server     | Busca dados, não importa hooks                |
| `app/**/page.tsx`             | Server     | Busca dados, passa props para Client islands  |
| `app/**/loading.tsx`          | Server     | Skeleton simples, sem busca de dados          |
| `components/layout/app-*.tsx` | Client     | Navegação, estado ativo, menus interativos    |
| `components/ui/*`             | Sem diretiva | RSC-safe; `'use client'` só se usar hooks  |
| Server Actions (`actions.ts`) | Server     | Mutações, revalidação, nunca retornam JSX     |

**Regras críticas:**
- Nunca importar `cookies()`, `headers()` em Client Components.
- Nunca passar `TenantContext` completo como prop para Client — passe só os campos necessários (ex.: `tenantId: string`).
- `getAuthUser()` e `getTenantContext()` são Server-only (usam `React.cache` + cookies).

---

## 12. Convenção de Schemas Zod

Schemas Zod vivem **próximos do domínio**, nunca em pasta global genérica.

| Contexto                        | Onde colocar                         |
| ------------------------------- | ------------------------------------ |
| Schema de input de um módulo    | `modules/<dominio>/<dominio>.dto.ts` |
| Schema de input de uma API      | junto ao route handler               |
| Tipo de paginação/filtro compartilhado | `lib/pagination/index.ts`     |

A pasta `validations/` existe mas **não deve crescer** — manter schemas perto do módulo que os usa. Se um schema for reutilizado por >2 módulos, promova para `lib/`.

---

## 13. Background Jobs e Transactional Outbox

```
Server Action (db.transaction(tx => { ... }))
   │
   ├─ persiste entidade clínica (pts_responses / intersectoral_tasks)
   └─ enfileira job em background_jobs   ← MESMA transação
                              │
                              v
Cron /api/jobs/process (Bearer CRON_SECRET)
   │
   ├─ Reaper: reseta jobs 'processing' > 5min para 'queued'
   ├─ pollNextJobForExecution (FOR UPDATE SKIP LOCKED, escopo global)
   ├─ injeta TenantContext do job no handler
   └─ executa handler (RNDS / e-mail / etc.)
       ├─ sucesso → marca completed
       ├─ erro fatal (RndsClinicalValidationError) → dead_letter
       └─ erro infra (timeout, mTLS) → retry com backoff exponencial + jitter
```

**Pontos críticos:**
- `BackgroundJobsRepository` **não** estende `BaseTenantRepository` nos métodos estáticos do worker — Cron varre todos os tenants.
- Após `pollNextJobForExecution`, o `TenantContext` é **reinjetado explicitamente** no handler.
- Jobs e mutações respeitam estritamente a referência `tx` local — sem vazamento de transação.

---

## 14. Helpers de Infraestrutura

| Helper                                  | Arquivo              | Uso                                    |
| --------------------------------------- | -------------------- | -------------------------------------- |
| `buildFilters(...conditions)`           | `lib/db/filters.ts`  | Compor WHERE sem repetir `and()`       |
| `getPaginationOffset(params)`           | `lib/pagination/`    | Offset para listagens paginadas        |
| `toPaginatedResult(data, total, params)`| `lib/pagination/`    | Montar resposta paginada padrão        |
| `getTenantTag(tenantId, resource)`      | `lib/cache.ts`       | Tag de cache tenant-aware              |
| `revalidateTenantResource(...)`         | `lib/cache.ts`       | Invalidar cache após mutação           |
| `useZodForm(schema, props?)`            | `lib/form.ts`        | RHF + Zod integrado (Client only)      |

---

## 15. Soft Delete — decisão futura

**Não implementado.** Quando necessário (ex.: pacientes, profissionais), seguir o padrão:

```ts
// Na migration:
deleted_at timestamp with time zone  // nullable, default null

// No repository — excluir deletados por padrão em TODAS as queries:
.where(buildFilters(
  eq(table.tenantId, this.tenantId),
  isNull(table.deletedAt),        // ← sempre presente
  ...filtrosAdicionais,
))

// Soft delete:
await db.update(table)
  .set({ deletedAt: new Date() })
  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)));
```

Nunca deletar registros clínicos — usar soft delete + auditoria.
