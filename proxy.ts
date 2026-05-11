import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Proxy (Next.js 16) — intencionalmente MÍNIMO.
 *
 * Responsabilidades permitidas:
 *   - refresh da sessão Supabase (auth.getUser)
 *   - redirect simples (público vs protegido)
 *   - validações leves de URL
 *   - propagação de x-request-id para correlação de logs
 *
 * NÃO fazer aqui:
 *   - queries no banco (tenant lookup, role checks etc.)
 *   - chamadas externas extras (rate limit, telemetria, …)
 *   - lógica de negócio
 *   - autorização sofisticada (papel/permissão)
 *
 * Rate limit, audit, autorização avançada → Server Actions / Route Handlers.
 */

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/auth/callback', '/api/init-tenant'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  const { response, user } = await updateSession(request, requestHeaders);
  response.headers.set('x-request-id', requestId);

  const { pathname } = request.nextUrl;
  const isRsc = request.headers.has('rsc') || request.nextUrl.searchParams.has('_rsc');
  const activeTenantId = request.cookies.get('active_tenant_id')?.value;

  console.log(
    `[proxy] ${request.method} ${pathname}${isRsc ? ' (RSC)' : ''} | user=${user?.id ?? 'anon'} | active_tenant_id=${activeTenantId ?? 'NOT_SET'}`,
  );

  if (isPublicPath(pathname)) return response;

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    console.log(`[proxy] unauthenticated → redirect /login`);
    return NextResponse.redirect(loginUrl);
  }

  // Usuário autenticado mas sem cookie de tenant → inicializa via route handler
  if (!activeTenantId && !pathname.startsWith('/api/')) {
    const initUrl = request.nextUrl.clone();
    initUrl.pathname = '/api/init-tenant';
    initUrl.searchParams.set('next', pathname);
    console.log(`[proxy] no active_tenant_id → redirect /api/init-tenant`);
    return NextResponse.redirect(initUrl, { status: 302 });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)).*)',
  ],
};
