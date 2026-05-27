-- 0017_add_rls_notifications.sql
-- 1. Remover a trigger e a função nativa que criavam notificações para garantir tratamento humanizado via ErrorParser no NodeJS
DROP TRIGGER IF EXISTS trg_inbox_notification_on_job_failure ON background_jobs;
DROP FUNCTION IF EXISTS handle_job_failure_notification();

-- 2. Habilitar RLS estrito na tabela de notificações para evitar vazamento de dados
ALTER TABLE inbox_notifications ENABLE ROW LEVEL SECURITY;

-- 3. Definir a política de segurança baseada no ID autenticado do Supabase
DROP POLICY IF EXISTS "Profissionais só leem suas próprias notificações" ON inbox_notifications;
CREATE POLICY "Profissionais só leem suas próprias notificações" 
ON inbox_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Adicionar a tabela ao canal de replicação segura do Supabase Realtime (se a publicação existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Tenta adicionar a tabela. Se já estiver na publicação, ignora
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'inbox_notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE inbox_notifications;
    END IF;
  END IF;
END $$;
