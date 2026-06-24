-- ============================================================
-- ORYON — Habilitar Realtime nas tabelas necessárias
-- Migração: 004_realtime.sql
-- ============================================================

-- Habilita Realtime para mensagens diretas e notificações.
-- Estas tabelas precisam de Realtime pois o frontend usa
-- supabase.channel().on('postgres_changes', ...) para escutar eventos.

ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- ÍNDICES ADICIONAIS DE PERFORMANCE
-- ============================================================

-- Acelera a busca de conversas de um usuário (useConversations)
CREATE INDEX IF NOT EXISTS idx_dm_sender    ON direct_messages (sender_id,    created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_recipient ON direct_messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_read      ON direct_messages (recipient_id) WHERE read_at IS NULL;

-- Acelera contagem de notificações não lidas (unread_counts view)
CREATE INDEX IF NOT EXISTS idx_notif_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

-- Acelera busca textual de profiles (Search page)
CREATE INDEX IF NOT EXISTS idx_profiles_fullname_trgm
  ON profiles USING GIN (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON profiles USING GIN (username gin_trgm_ops);

-- Acelera busca textual de grupos e projetos
CREATE INDEX IF NOT EXISTS idx_groups_name_trgm
  ON groups USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_title_trgm
  ON projects USING GIN (title gin_trgm_ops);
