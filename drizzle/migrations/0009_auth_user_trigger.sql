-- Trigger automático: ao criar usuário em auth.users, cria
-- profile + tenant + tenant_members (role owner).
--
-- Convenções de metadata (raw_user_meta_data):
--   - full_name / name: nome do usuário (fallback: prefixo do email)
--   - tenant_name: nome do tenant (fallback: "<nome> - Clínica")
--   - invite_token: se presente, PULA criação de tenant — convite é
--     processado por AcceptInviteService que adiciona o membership.
--
-- Falha do trigger emite WARNING mas NÃO bloqueia o signup
-- (preferimos auth ok + tenant faltando do que signup quebrado).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_email text;
  v_full_name text;
  v_slug_base text;
  v_slug text;
BEGIN
  v_email := NEW.email;
  v_full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, v_email, v_full_name)
  ON CONFLICT (id) DO NOTHING;

  -- Convite: AcceptInviteService cuida do membership
  IF NEW.raw_user_meta_data ? 'invite_token' THEN
    RETURN NEW;
  END IF;

  -- Idempotência: se já tem qualquer membership, não cria tenant novo
  IF EXISTS (SELECT 1 FROM public.tenant_members WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_slug_base := regexp_replace(lower(split_part(v_email, '@', 1)), '[^a-z0-9]+', '-', 'g');
  v_slug := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'tenant_name', ''), v_full_name || ' - Clínica'),
    v_slug
  )
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (v_tenant_id, NEW.id, 'owner');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
