-- 0019_rls_domain_policies.sql
-- 
-- DÍVIDA TÉCNICA DA FASE 1:
-- As tabelas pts_clinico_geral, pts_geral, pts_enfermagem, pts_psicologia, pts_psiquiatria,
-- pts_nutricao, pts_servico_social, pts_terapia_ocupacional, pts_educacao_fisica possuem
-- apenas a coluna pts_id e não têm FK direta com tenant_id ou patient_id no momento.
-- Decisão travada para Fase 0: RLS habilitado com zero policies nestas tabelas (acesso bloqueado).
-- A unificação e reestruturação para expor tenant_id ou patient_id nessas tabelas será realizada na Fase 1.

-- ==========================================
-- 1. Table: patients
-- ==========================================
DROP POLICY IF EXISTS "patients_tenant_select" ON "patients";
CREATE POLICY "patients_tenant_select" ON "patients"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "patients_tenant_insert" ON "patients";
CREATE POLICY "patients_tenant_insert" ON "patients"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "patients_tenant_update" ON "patients";
CREATE POLICY "patients_tenant_update" ON "patients"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "patients_tenant_delete" ON "patients";
CREATE POLICY "patients_tenant_delete" ON "patients"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));

-- ==========================================
-- 2. Table: pts_documents
-- ==========================================
DROP POLICY IF EXISTS "pts_documents_tenant_select" ON "pts_documents";
CREATE POLICY "pts_documents_tenant_select" ON "pts_documents"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "pts_documents_tenant_insert" ON "pts_documents";
CREATE POLICY "pts_documents_tenant_insert" ON "pts_documents"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "pts_documents_tenant_update" ON "pts_documents";
CREATE POLICY "pts_documents_tenant_update" ON "pts_documents"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "pts_documents_tenant_delete" ON "pts_documents";
CREATE POLICY "pts_documents_tenant_delete" ON "pts_documents"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));

-- ==========================================
-- 3. Table: pts_evolutions
-- ==========================================
DROP POLICY IF EXISTS "pts_evolutions_tenant_select" ON "pts_evolutions";
CREATE POLICY "pts_evolutions_tenant_select" ON "pts_evolutions"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "pts_evolutions_tenant_insert" ON "pts_evolutions";
CREATE POLICY "pts_evolutions_tenant_insert" ON "pts_evolutions"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "pts_evolutions_tenant_update" ON "pts_evolutions";
CREATE POLICY "pts_evolutions_tenant_update" ON "pts_evolutions"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "pts_evolutions_tenant_delete" ON "pts_evolutions";
CREATE POLICY "pts_evolutions_tenant_delete" ON "pts_evolutions"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));

-- ==========================================
-- 4. Table: pts_responses
-- ==========================================
DROP POLICY IF EXISTS "pts_responses_tenant_select" ON "pts_responses";
CREATE POLICY "pts_responses_tenant_select" ON "pts_responses"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "pts_responses_tenant_insert" ON "pts_responses";
CREATE POLICY "pts_responses_tenant_insert" ON "pts_responses"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "pts_responses_tenant_update" ON "pts_responses";
CREATE POLICY "pts_responses_tenant_update" ON "pts_responses"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "pts_responses_tenant_delete" ON "pts_responses";
CREATE POLICY "pts_responses_tenant_delete" ON "pts_responses"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));

-- ==========================================
-- 5. Table: service_units
-- ==========================================
DROP POLICY IF EXISTS "service_units_tenant_select" ON "service_units";
CREATE POLICY "service_units_tenant_select" ON "service_units"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "service_units_tenant_insert" ON "service_units";
CREATE POLICY "service_units_tenant_insert" ON "service_units"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "service_units_tenant_update" ON "service_units";
CREATE POLICY "service_units_tenant_update" ON "service_units"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "service_units_tenant_delete" ON "service_units";
CREATE POLICY "service_units_tenant_delete" ON "service_units"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));

-- ==========================================
-- 6. Table: files
-- ==========================================
DROP POLICY IF EXISTS "files_tenant_select" ON "files";
CREATE POLICY "files_tenant_select" ON "files"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "files_tenant_insert" ON "files";
CREATE POLICY "files_tenant_insert" ON "files"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "files_tenant_update" ON "files";
CREATE POLICY "files_tenant_update" ON "files"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "files_tenant_delete" ON "files";
CREATE POLICY "files_tenant_delete" ON "files"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));

-- ==========================================
-- 7. Table: background_jobs
-- ==========================================
DROP POLICY IF EXISTS "background_jobs_tenant_select" ON "background_jobs";
CREATE POLICY "background_jobs_tenant_select" ON "background_jobs"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "background_jobs_tenant_insert" ON "background_jobs";
CREATE POLICY "background_jobs_tenant_insert" ON "background_jobs"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "background_jobs_tenant_update" ON "background_jobs";
CREATE POLICY "background_jobs_tenant_update" ON "background_jobs"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "background_jobs_tenant_delete" ON "background_jobs";
CREATE POLICY "background_jobs_tenant_delete" ON "background_jobs"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));

-- ==========================================
-- 8. Table: tenant_invites
-- ==========================================
DROP POLICY IF EXISTS "tenant_invites_tenant_select" ON "tenant_invites";
CREATE POLICY "tenant_invites_tenant_select" ON "tenant_invites"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "tenant_invites_tenant_insert" ON "tenant_invites";
CREATE POLICY "tenant_invites_tenant_insert" ON "tenant_invites"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "tenant_invites_tenant_update" ON "tenant_invites";
CREATE POLICY "tenant_invites_tenant_update" ON "tenant_invites"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "tenant_invites_tenant_delete" ON "tenant_invites";
CREATE POLICY "tenant_invites_tenant_delete" ON "tenant_invites"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));

-- ==========================================
-- 9. Table: inbox_notifications (Exceção: SELECT já existe)
-- ==========================================
DROP POLICY IF EXISTS "inbox_notifications_tenant_insert" ON "inbox_notifications";
CREATE POLICY "inbox_notifications_tenant_insert" ON "inbox_notifications"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "inbox_notifications_tenant_update" ON "inbox_notifications";
CREATE POLICY "inbox_notifications_tenant_update" ON "inbox_notifications"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "inbox_notifications_tenant_delete" ON "inbox_notifications";
CREATE POLICY "inbox_notifications_tenant_delete" ON "inbox_notifications"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));

-- ==========================================
-- 10. Table: pts_master (Baseada no patient_id -> patients.tenant_id)
-- ==========================================
DROP POLICY IF EXISTS "pts_master_tenant_select" ON "pts_master";
CREATE POLICY "pts_master_tenant_select" ON "pts_master"
  FOR SELECT TO authenticated
  USING (patient_id IN (
    SELECT id FROM patients WHERE tenant_id IN (SELECT get_my_tenant_ids())
  ));

DROP POLICY IF EXISTS "pts_master_tenant_insert" ON "pts_master";
CREATE POLICY "pts_master_tenant_insert" ON "pts_master"
  FOR INSERT TO authenticated
  WITH CHECK (patient_id IN (
    SELECT id FROM patients WHERE tenant_id IN (SELECT get_my_tenant_ids())
  ));

DROP POLICY IF EXISTS "pts_master_tenant_update" ON "pts_master";
CREATE POLICY "pts_master_tenant_update" ON "pts_master"
  FOR UPDATE TO authenticated
  USING (patient_id IN (
    SELECT id FROM patients WHERE tenant_id IN (SELECT get_my_tenant_ids())
  ));

DROP POLICY IF EXISTS "pts_master_tenant_delete" ON "pts_master";
CREATE POLICY "pts_master_tenant_delete" ON "pts_master"
  FOR DELETE TO authenticated
  USING (patient_id IN (
    SELECT id FROM patients WHERE tenant_id IN (SELECT get_my_admin_tenant_ids())
  ));
