-- Fix: infinite recursion in tenant_members RLS policies.
--
-- The original policies referenced tenant_members from within tenant_members policies,
-- causing PostgreSQL to loop indefinitely. Solution: SECURITY DEFINER functions
-- that bypass RLS, used as the basis for the policies themselves.

CREATE OR REPLACE FUNCTION public.get_my_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_admin_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin');
$$;

DROP POLICY IF EXISTS "tenant_members_same_tenant_select" ON "tenant_members";
DROP POLICY IF EXISTS "tenant_members_admin_insert" ON "tenant_members";
DROP POLICY IF EXISTS "tenant_members_admin_update" ON "tenant_members";
DROP POLICY IF EXISTS "tenant_members_admin_delete" ON "tenant_members";

CREATE POLICY "tenant_members_same_tenant_select" ON "tenant_members"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

CREATE POLICY "tenant_members_admin_insert" ON "tenant_members"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_admin_tenant_ids()));

CREATE POLICY "tenant_members_admin_update" ON "tenant_members"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));

CREATE POLICY "tenant_members_admin_delete" ON "tenant_members"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));
