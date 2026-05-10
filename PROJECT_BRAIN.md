# PROJECT BRAIN - SSOT (Single Source of Truth)

## Visão Geral

Este projeto está passando por uma migração massiva de um SPA Vite para uma arquitetura moderna baseada em **Next.js App Router, Supabase e Drizzle ORM**. O foco é um SaaS clínico multi-tenant, priorizando simplicidade, performance, segurança e escalabilidade.

## Stack Oficial

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **Backend:** Next.js Route Handlers, Server Actions, Services Layer, Repository Pattern.
- **Banco de Dados:** PostgreSQL (Supabase) + Drizzle ORM.
- **Autenticação:** Supabase Auth (SSR).
- **Storage:** Cloudflare R2 (AWS S3 SDK).
- **E-mail:** Resend.
- **Observabilidade:** Sentry, PostHog.
- **Testes:** Playwright.

## Arquitetura de Pastas

- `/app`: Rotas, Layouts e Server Components.
- `/components`: UI genérica e compartilhada.
- `/modules`: Domínios de negócio (Pacientes, Profissionais, PTS, etc).
- `/services`: Regras de negócio e orquestração.
- `/repositories`: Acesso exclusivo ao banco de dados (Drizzle).
- `/lib`: Configurações de infraestrutura (Supabase, DB, Sentry).
- `/hooks`: Custom hooks.
- `/types`: Tipagens globais.
- `/validations`: Schemas Zod compartilhados.

## Regras de Ouro

1. **Multi-Tenant:** `tenant_id` obrigatório em todas as tabelas e filtrado nos repositories.
2. **Server-First:** RSC por padrão, client components apenas para interatividade.
3. **Simplicidade:** Evitar overengineering e abstrações excessivas.
4. **Segurança:** Middleware de auth, rate limiting e auditoria em ações críticas.

## Status Atual

- [x] Fase 1: Infraestrutura Base (Concluída — Next.js 16.2.6 + TS strict + Tailwind v4 + shadcn/ui base-nova/neutral + ESLint + Prettier + alias `@/*`)
- [x] Fase 2: Banco e Arquitetura (Concluída — Drizzle ORM + postgres-js + schemas multi-tenant + RLS + repository/service base + DTO/mapper pattern. **Pendente:** apontar `.env.local` para Supabase real e rodar `npm run db:migrate`.)
- [x] Fase 3: Segurança (Concluída — Supabase SSR + proxy de auth + rate limit Upstash + logger pino + helpers de tenant context. **Pendente:** preencher Upstash em prod; rodar com Supabase real.)
- [x] Fase 4: Infraestrutura Externa (Parcial — Storage R2 + Email Resend concluídos. **Pendente:** PostHog analytics, antivirus scanning, background jobs.)
- [ ] Fase 5: Frontend (Pendente)
- [ ] Fase 6: Testes (Pendente)

## Notas de Migração

- Legado Vite preservado em `/PTS` (excluído do `tsconfig` e ESLint).
- Estrutura oficial criada: `/app /components /lib /modules /services /repositories /hooks /types /validations`.
- shadcn/ui inicializado: `components.json` (style `base-nova`, `baseColor` neutral, RSC, ícones lucide).
- Scripts npm: `dev`, `build`, `start`, `lint`, `lint:fix`, `typecheck`, `format`, `format:check`, `db:generate`, `db:migrate`, `db:push`, `db:studio`.

## Arquitetura de Dados (Fase 2)

### Schemas (`lib/db/schema/`)

- `tenants` — clínica/organização (id, name, slug).
- `profiles` — espelho de `auth.users` do Supabase (id = auth.uid).
- `tenant_members` — M2M usuário↔tenant + role (`owner | admin | professional | viewer`).
- `audit_logs` — auditoria por tenant (action, entity_type/id, metadata, IP, UA).

### Tenant Context

- `lib/tenant-context.ts` define `TenantContext` (`tenantId`, `userId`, `role`).
- `BaseTenantRepository` (`repositories/base.repository.ts`) recebe o ctx e expõe `this.tenantId` para subclasses — **toda query DEVE filtrar por `this.tenantId`**.
- `BaseService` (`services/base.service.ts`) recebe o mesmo ctx e instancia repositories.
- `TenantContext` **nunca** vem do client; deriva da sessão Supabase + `tenant_members` (Fase 3).

### DTO/Mapper Pattern

- Exemplo concreto: `modules/audit/`.
- `audit.dto.ts` (Zod schema + tipos), `audit.mapper.ts` (`row → DTO`), `audit.service.ts` (orquestra repo + mapper).
- Regra: **nunca** retornar a row do banco direto para a UI — sempre passar pelo mapper.

### RLS

- Migration `0001_rls_policies.sql` ativa RLS em todas as tabelas.
- App usa `DATABASE_URL` (role `postgres`, bypass RLS) — autorização é feita em código via `TenantContext`.
- RLS é **defense-in-depth**: protege contra acessos diretos via Supabase client (anon/authenticated keys).
- Trigger `set_updated_at()` em `tenants` e `profiles`.

### Conexão com banco

- `lib/db/client.ts` — postgres-js + drizzle, com cache global em dev (evita esgotar pool no HMR).
- `DATABASE_URL` (porta 6543, pooled/transaction mode) → runtime da app.
- `DATABASE_DIRECT_URL` (porta 5432) → drizzle-kit para DDL.

## Segurança e Observabilidade (Fase 3)

### Auth SSR (Supabase)

- `lib/supabase/server.ts` — `createSupabaseServerClient()` para Server Components, Server Actions, Route Handlers (lê `cookies()` do `next/headers`).
- `lib/supabase/client.ts` — `createSupabaseBrowserClient()` para Client Components.
- `lib/supabase/middleware.ts` — `updateSession()` para refresh dentro do proxy.
- **Regra de ouro:** sempre `supabase.auth.getUser()` (valida o JWT no Auth server). NUNCA confiar em `getSession()` para autorização.

### Helpers de Auth

- `lib/auth/get-user.ts` — `getAuthUser()` (cacheado por request) e `requireAuthUser()` (lança `UnauthorizedError`).
- `lib/auth/get-tenant-context.ts` — `getTenantContext(tenantId)` valida membro em `tenant_members`; `getActiveTenantContext()` lê cookie `active_tenant_id`.

### Proxy (`proxy.ts` na raiz) — INTENCIONALMENTE MÍNIMO

Responsabilidades permitidas:

- refresh da sessão Supabase (`auth.getUser`).
- redirect simples (público vs protegido).
- propagação de `x-request-id` (gerado se ausente).
- validações leves de URL.

**Proibido no proxy:**

- queries no banco (tenant lookup, role checks).
- chamadas externas extras (rate limit, telemetria, feature flags).
- lógica de negócio.
- autorização sofisticada (papel/permissão).

Public paths: `/login`, `/signup`, `/forgot-password`, `/auth/callback`.
Em Next.js 16 a convenção é `proxy.ts` (substituiu `middleware.ts`).

### Rate Limiting — fora do proxy

- `lib/rate-limit/index.ts` — interface `RateLimiter` + impl Upstash (Edge-safe). No-op fallback se `UPSTASH_REDIS_REST_URL/TOKEN` ausentes.
- `lib/rate-limit/enforce.ts` — `enforceRateLimit(bucket, identifier)` lança `RateLimitError`. Usar em Server Actions / Route Handlers.
- Buckets pré-configurados: `auth` (10/min), `api` (60/min), `mutation` (30/min).

### Logger Estruturado + Correlation IDs

- `lib/logger.ts` — base. Pino em Node, fallback console-JSON em Edge/browser. `redact` em `password`, `token`, `authorization`, `cookie`, `jwt`, `access_token`, `refresh_token`, `apiKey`. Inclui `appEnv` em todos os logs.
- `lib/request-id.ts` — `getRequestId()` lê o `x-request-id` injetado pelo proxy (cacheado por request).
- `lib/request-logger.ts` — `getRequestLogger()` retorna child logger com `{ requestId, userId, tenantId, appEnv }` automaticamente. **Use sempre em código server-side dentro de uma request**.
- Fora de request (jobs, scripts): use `logger` direto de `lib/logger`.

### Estratégia de Cache (React.cache)

- `React.cache(fn)` deduplica chamadas dentro do **render desta request**. Escopo: 1 request → 1 árvore de render.
- **Não há cache cross-request**, portanto **não há leak cross-user nem cross-tenant** por construção.
- Usado em: `getAuthUser`, `getTenantContext`, `getRequestId`, `getRequestLogger`.
- Para cache CROSS-request (Next.js fetch cache, `unstable_cache`, etc.) **toda chave/tag DEVE incluir `tenantId` e, quando aplicável, `userId`**. Sem exceção.
- Invalidação: `revalidateTag('tenant:<tenantId>')` ou `revalidatePath` na mesma request da mutação.

### Estratégia de Auditoria

Duas formas, na ordem de preferência:

1. **Declarativa via `withAudit` (`lib/audit/with-audit.ts`)** — envelopa funções de domínio (Service ou Server Action). Grava em sucesso, e em erro registra com `metadata.failed=true` e re-lança. Sem event bus, sem hooks de banco. Quando o volume justificar fila, troca-se a impl interna de `withAudit` mantendo a API.
2. **Manual via `AuditService.record()`** — para casos pontuais que não cabem em wrapper (ex.: efeitos colaterais em Route Handlers).

Sempre dentro do **service** ou na borda de uma **action**, nunca em repository.

### Anti-lock-in (provedores externos)

- Toda integração externa segue o padrão **interface + impl + ponto de troca único**:
  - DB: `Database` (Drizzle) — provedor é Postgres, troca de host é trivial.
  - Auth: tipos de domínio em `lib/auth/types.ts` (`AuthenticatedUser`, `AuthProvider`). Services nunca importam tipos do `@supabase/supabase-js`.
  - Rate limit: `RateLimiter` (Upstash + noop).
  - Storage / Email / Erro / Analytics (Fase 4): cada um terá sua interface em `lib/providers/<dominio>/` antes da impl concreta.
- O Supabase é "default" mas trocável: Auth e Storage têm interface; DB já é independente via Drizzle.

### Ambientes

- `APP_ENV` (`lib/app-env.ts`) é a fonte da verdade: `local | staging | production`. Independente de `NODE_ENV`.
- Arquivos: `.env.local`, `.env.staging.example`, `.env.production.example`.
- Em deploys (Vercel/Railway/etc.) configurar via painel, não em arquivo commitado.
- `appEnv` aparece em todos os logs.

## Infraestrutura Externa (Fase 4)

### Storage — Cloudflare R2

**Provider Pattern:** `lib/providers/storage/types.ts` define `StorageProvider`. A impl concreta (`lib/providers/storage/r2.ts`) usa o AWS S3 SDK apontando para o endpoint customizado do R2. A fachada `getStorageProvider()` em `lib/providers/storage/index.ts` é o único ponto de acesso — nunca importar `r2Provider` diretamente em código de domínio.

**Fluxo de upload (arquivo nunca passa pelo servidor Next.js):**

```
Browser → POST /api/storage/presigned-url → servidor valida + gera signed URL
Browser → PUT <signedUrl> → upload direto ao R2
```

**API Route:** `app/api/storage/presigned-url/route.ts`
- Autenticação obrigatória (`requireAuthUser`).
- Rate limit por `userId` (`enforceRateLimit('api', userId)`).
- Validação Zod: MIME type, tamanho (máx. 10 MB), entidade.
- Tenant validado via `getTenantContext(tenantId)`.
- Auditoria via `withAudit('upload')` no service.

**Key strategy — multi-tenant obrigatório:**
```
uploads/{tenantId}/{entity}/{yyyy}/{mm}/{uuid}.{ext}
```
- `tenantId` garante isolamento organizacional.
- UUID evita colisões e path traversal (filename do usuário nunca vira key).
- `{entity}` classifica o contexto: `patients`, `documents`, `avatars`, etc.

**Módulo de domínio:** `modules/storage/` — `StorageService` (estende `BaseService`), `presignedUrlRequestSchema` (Zod).

**Helper frontend:** `lib/storage/upload-file.ts` — `uploadFile({ tenantId, file, entity })` faz a coordenação dos 2 passos. Arquivo nunca passa pelo Next.js.

**Envs obrigatórias (server-only):** `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`.
**Env pública:** `NEXT_PUBLIC_R2_PUBLIC_URL` (URL base para montar URLs de acesso).

**CORS do bucket R2:** configurar `PUT` com `Content-Type` e `Content-Length` para as origins permitidas. Presigned URLs sempre apontam para o endpoint S3/API do R2 — nunca para custom domain.

**Preparado para produção:** trocar provider em `lib/providers/storage/index.ts`, ativar bucket privado (signed download URLs em `getFileUrl`), Worker proxy, antivirus scanning, metadata persistence.

---

### E-mail — Resend

**Provider Pattern:** `lib/providers/email/types.ts` define `EmailProvider` com `sendEmail(options: SendEmailOptions): Promise<{ id: string }>`. A impl concreta é `lib/providers/email/resend.ts`. A fachada `getEmailProvider()` em `lib/providers/email/index.ts` aplica o gate de ambiente: em `local` → noop (log no console, zero disparos reais); em `staging/prod` → Resend.

**EmailService (`modules/email/email.service.ts`)** — não estende `BaseService` porque e-mails de sistema (welcome, password reset) ocorrem antes ou fora de um contexto de tenant. Métodos disponíveis:

- `sendWelcomeEmail({ to, name, loginUrl })` — boas-vindas pós-cadastro.
- `sendPasswordResetEmail({ to, name, resetUrl, expiresInMinutes })` — reset de senha.
- `sendNotificationEmail({ to, name, title, body, ctaLabel?, ctaUrl?, note?, replyTo? })` — notificação genérica reutilizável.

**Templates (`modules/email/templates/`)** — funções puras que recebem variáveis e retornam `{ subject, html, text }`. HTML com inline styles (compatível com Gmail, Outlook, Apple Mail, Yahoo — sem dependências de runtime, sem JSX). Layout base em `templates/base.ts` fornece `emailLayout()`, `emailButton()` e `emailNote()` reutilizáveis.

**Como usar (Server Action ou Route Handler):**
```typescript
import { EmailService } from '@/modules/email';

await new EmailService().sendPasswordResetEmail({
  to: user.email,
  name: user.fullName,
  resetUrl: `https://app.bosyn.com.br/reset-password?token=${token}`,
  expiresInMinutes: 60,
});
```

**Remetente padrão:** `BOSYN <suporte@mail.bosyn.com.br>` (hard-coded como fallback seguro). Substituível via `NEXT_PUBLIC_FROM_EMAIL`. Domínio deve estar verificado no painel Resend.

**Envs:** `RESEND_API_KEY` (server-only, obrigatória em staging/prod), `NEXT_PUBLIC_FROM_EMAIL` (opcional).

**Preparado para:** múltiplos provedores com fallback, preview/sandbox por ambiente, templates adicionais (convite de membro, relatório semanal, etc.).

---

_Última atualização: 2026-05-09_
