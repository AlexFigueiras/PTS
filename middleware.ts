import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const isRsc = request.headers.has('rsc') || request.nextUrl.searchParams.has('_rsc');
  const { response, user } = await updateSession(request, requestHeaders);

  console.log(
    `[middleware] ${request.method} ${request.nextUrl.pathname}${isRsc ? ' (RSC)' : ''} | user=${user?.id ?? 'anon'} | active_tenant_id=${request.cookies.get('active_tenant_id')?.value ?? 'NOT_SET'}`,
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas exceto arquivos estáticos
     * e rotas internas do Next.js (_next/static, _next/image, favicon).
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
