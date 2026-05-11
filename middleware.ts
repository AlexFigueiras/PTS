import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const { response } = await updateSession(request, requestHeaders);
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
