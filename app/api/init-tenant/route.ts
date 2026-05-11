import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const nextParam = request.nextUrl.searchParams.get('next') ?? '/dashboard';
    const next =
      nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard';

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log('[init-tenant] user=', user?.id ?? 'NOT AUTHENTICATED');

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Usa o cliente Supabase (REST via HTTPS) em vez de Drizzle/TCP direto
    const { data: memberships, error } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1);

    console.log('[init-tenant] memberships=', memberships, 'error=', error);

    const tenantId = memberships?.[0]?.tenant_id;

    if (!tenantId) {
      console.error('[init-tenant] no membership found for user', user.id, error);
      return NextResponse.redirect(new URL('/login', request.url));
    }

    console.log('[init-tenant] setting cookie tenant_id=', tenantId, 'redirecting to', next);

    const response = NextResponse.redirect(new URL(next, request.url));
    response.cookies.set('active_tenant_id', tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err) {
    console.error('[init-tenant] unhandled error:', err);
    return NextResponse.json(
      { error: 'init-tenant failed', detail: String(err) },
      { status: 500 },
    );
  }
}
