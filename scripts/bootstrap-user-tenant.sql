-- Bootstrap: cria tenant + profile + tenant_members para o usuário
-- alex@exemplo.com (auth.users id = 80cbc166-c02c-4fd9-b1f0-efc56be7979f).
-- Rodar UMA ÚNICA VEZ no Supabase SQL Editor.

DO $$
DECLARE
  v_user_id uuid := '80cbc166-c02c-4fd9-b1f0-efc56be7979f';
  v_email text := 'alex@exemplo.com';
  v_tenant_id uuid;
BEGIN
  INSERT INTO public.tenants (name, slug)
  VALUES ('CAPS', 'caps')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (v_user_id, v_email, 'Alex Figueiras')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (v_tenant_id, v_user_id, 'owner')
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'owner';

  RAISE NOTICE 'Bootstrap completo: tenant_id=%, user_id=%', v_tenant_id, v_user_id;
END $$;
