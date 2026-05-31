-- 0022_adjust_cases_rls.sql
DROP POLICY IF EXISTS "pts_cases_tenant_select" ON "pts_cases";
CREATE POLICY "pts_cases_tenant_select" ON "pts_cases"
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT get_my_tenant_ids())
    AND (
      -- 1. Permite durante a criação (antes de existir qualquer plano para o caso)
      NOT EXISTS (
        SELECT 1 FROM "pts_plans" p WHERE p.case_id = "pts_cases".id
      )
      -- 2. Utilizador pertence a uma unidade associada ao caso (unidade do RT do plano)
      OR EXISTS (
        SELECT 1 
        FROM "pts_plans" p
        JOIN "professionals_to_units" ptu_owner ON p.owner_id = ptu_owner.professional_id
        JOIN "professionals_to_units" ptu_user ON ptu_owner.unit_id = ptu_user.unit_id
        WHERE p.case_id = "pts_cases".id 
          AND ptu_user.professional_id = auth.uid()
      )
      -- 3. Ou se houver uma sinalização activa/trâmite direccionada à unidade dele
      OR EXISTS (
        SELECT 1 
        FROM "pts_signals" s
        JOIN "professionals_to_units" ptu ON s.destination_unit_id = ptu.unit_id
        WHERE s.case_id = "pts_cases".id 
          AND ptu.professional_id = auth.uid()
          AND s.status NOT IN ('descartada', 'resolvida')
      )
    )
  );
