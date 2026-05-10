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

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/auth/callback'];

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

  if (isPublicPath(pathname)) return response;

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)).*)',
  ],
};
