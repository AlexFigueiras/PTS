import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { tenantMembers } from '@/lib/db/schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const nextParam = request.nextUrl.searchParams.get('next') ?? '/dashboard';
  // Garante que next é sempre um caminho relativo (evita open redirect)
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard';

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  console.log('[init-tenant] user=', user?.id ?? 'NOT AUTHENTICATED');

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const [membership] = await getDb()
    .select({ tenantId: tenantMembers.tenantId })
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, user.id))
    .limit(1);

  console.log('[init-tenant] membership=', membership ?? 'NONE');

  if (!membership) {
    console.error('[init-tenant] user has no tenant membership');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  console.log('[init-tenant] setting cookie, redirecting to', next);

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set('active_tenant_id', membership.tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
