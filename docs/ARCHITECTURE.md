# Arquitetura — visão de bolso

Documento curto para desenvolvedores entrarem no projeto. Detalhes profundos em `PROJECT_BRAIN.md`.

---

## 1. Fluxo de Auth

```
Browser ──▶ Proxy ──▶ Supabase Auth ──▶ Server Component
   │            │            │
   │            │            └─ valida JWT (auth.getUser)
   │            └─ refresh cookies (sb-...)
   └─ sessão guardada em cookies httpOnly
```

- Login/signup (Fase 5) chama Supabase pelo client — cookies vêm via `Set-Cookie`.
- Em todo request server-side: `getAuthUser()` revalida o JWT.
- Tipos da app não conhecem o Supabase: `AuthenticatedUser` é a interface de domínio.
- Logout limpa cookies via Server Action.

---

## 2. Fluxo Tenant-aware

```
cookie active_tenant_id ──▶ getActiveTenantContext()
                              │
                              ├─ valida user em tenant_members
                              └─ retorna TenantContext { tenantId, userId, role }
                                          │
                                          ├─▶ Service (regras + audit)
                                          └─▶ Repository (filtra WHERE tenant_id)
```

- Cookie é setado pelo fluxo "trocar de tenant" da UI (Fase 5).
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

- mutações de domínio clínico (paciente, prontuário, profissional, PTS).
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
- (Fase 4) Storage, Email, Error tracking, Analytics — cada um com interface antes da impl.

A regra: **services nunca importam SDKs de vendor diretamente**.
