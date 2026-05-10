import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresh da sessão Supabase no proxy.
 *
 * IMPORTANTE: este helper só pode fazer o estritamente necessário —
 * proxy deve permanecer LEVE (sem queries pesadas, sem chamadas externas
 * adicionais, sem autorização sofisticada). Tenant lookup, audit, business
 * logic etc. ficam fora daqui (Server Components / Actions).
 *
 * Aceita `requestHeaders` para que o proxy injete cabeçalhos extras
 * (ex.: x-request-id) e eles sejam propagados para o Server Component.
 */
export async function updateSession(request: NextRequest, requestHeaders: Headers) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request: { headers: requestHeaders } });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
