-- ================================================================
-- Row-Level Security (RLS) — defesa em profundidade.
-- A app filtra por tenant_id explicitamente via TenantContext, mas o
-- banco também garante isolamento caso o filtro seja burlado ou caso
-- alguém conecte com a anon/authenticated key direto via Supabase.
--
-- Premissas:
--   - Conexão server-side via DATABASE_URL usa role `postgres` (bypass RLS).
--     A app NÃO depende de RLS para autorização — ela é defense-in-depth.
--   - Acessos via Supabase client (anon/authenticated) PRECISAM passar nas
--     policies abaixo.
--   - auth.uid() resolve o UUID do usuário autenticado via JWT.
-- ================================================================

ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- profiles: usuário enxerga e atualiza apenas o próprio perfil.
-- ----------------------------------------------------------------
CREATE POLICY "profiles_self_select" ON "profiles"
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_self_update" ON "profiles"
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_self_insert" ON "profiles"
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ----------------------------------------------------------------
-- tenants: membros enxergam tenants em que pertencem.
-- Update: somente owner.
-- ----------------------------------------------------------------
CREATE POLICY "tenants_member_select" ON "tenants"
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "tenants_owner_update" ON "tenants"
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ----------------------------------------------------------------
-- tenant_members: usuário vê membros dos tenants em que participa.
-- Owner/admin podem inserir/atualizar/remover membros.
-- ----------------------------------------------------------------
CREATE POLICY "tenant_members_same_tenant_select" ON "tenant_members"
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "tenant_members_admin_insert" ON "tenant_members"
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tenant_members_admin_update" ON "tenant_members"
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tenant_members_admin_delete" ON "tenant_members"
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ----------------------------------------------------------------
-- audit_logs: somente membros do tenant leem; inserts via service role.
-- ----------------------------------------------------------------
CREATE POLICY "audit_logs_member_select" ON "audit_logs"
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
  );

-- ----------------------------------------------------------------
-- Trigger: atualizar updated_at automaticamente.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_set_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
