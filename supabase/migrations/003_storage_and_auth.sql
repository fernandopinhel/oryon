-- ============================================================
-- ORYON — Storage Buckets e Configurações de Auth
-- Migração: 003_storage_and_auth.sql
-- ============================================================

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Avatares de usuários (público — visível sem autenticação)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Capas de perfil e grupos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers', 'covers', true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Mídia de posts (imagens e vídeos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media', 'post-media', true,
  52428800,  -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
);

-- Anexos de projetos e tarefas (privado — requer auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files', 'project-files', false,
  20971520,  -- 20MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
        'text/plain', 'application/zip']
);

-- ============================================================
-- STORAGE RLS POLICIES
-- ============================================================

-- AVATARS: leitura pública, escrita somente para o próprio usuário
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL AND
    -- O nome do arquivo deve começar com o UUID do usuário
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- COVERS: mesma lógica que avatars
CREATE POLICY "covers_public_read"   ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "covers_owner_insert"  ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'covers' AND auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "covers_owner_update"  ON storage.objects FOR UPDATE
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "covers_owner_delete"  ON storage.objects FOR DELETE
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- POST-MEDIA: leitura pública, escrita por usuário autenticado
CREATE POLICY "post_media_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'post-media');
CREATE POLICY "post_media_auth_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'post-media' AND auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "post_media_owner_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- PROJECT-FILES: somente membros do projeto
-- O caminho deve ser: project-files/{project_id}/{filename}
CREATE POLICY "project_files_member_read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files' AND
    is_project_member((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "project_files_member_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files' AND
    auth.uid() IS NOT NULL AND
    is_project_member((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "project_files_member_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-files' AND
    (
      (storage.foldername(name))[2] = auth.uid()::text OR  -- uploader
      my_project_role((storage.foldername(name))[1]::uuid) IN ('owner', 'manager')
    )
  );

-- ============================================================
-- VIEWS ÚTEIS (sem RLS — usam SECURITY INVOKER implícito)
-- ============================================================

-- Feed do usuário atual: posts de conexões + próprios posts públicos
CREATE OR REPLACE VIEW my_feed AS
SELECT p.*, pr.username, pr.full_name, pr.avatar_url
FROM posts p
JOIN profiles pr ON pr.id = p.author_id
WHERE
  p.parent_id IS NULL AND
  p.is_hidden = false AND
  (
    p.author_id = auth.uid() OR
    (p.visibility = 'public') OR
    (p.visibility = 'connections' AND are_connected(p.author_id, auth.uid()))
  )
ORDER BY p.created_at DESC;

-- Contagem de não-lidas do usuário atual
CREATE OR REPLACE VIEW unread_counts AS
SELECT
  (SELECT COUNT(*) FROM notifications WHERE user_id = auth.uid() AND read_at IS NULL) AS notifications,
  (SELECT COUNT(*) FROM direct_messages WHERE recipient_id = auth.uid() AND read_at IS NULL) AS messages,
  (SELECT COUNT(*) FROM connections WHERE addressee_id = auth.uid() AND status = 'pending') AS connection_requests;

-- ============================================================
-- CONFIGURAÇÃO DE AUTH (referência — feita no Dashboard Supabase)
-- ============================================================
-- As configurações abaixo NÃO são SQL; são instruções para o Dashboard:
--
-- 1. Authentication > Providers:
--    - Email: HABILITAR, "Confirm email" = true
--    - Google OAuth: HABILITAR com Client ID/Secret
--    - GitHub OAuth: HABILITAR com Client ID/Secret
--
-- 2. Authentication > Email Templates:
--    - Personalizar templates em Português (BR)
--    - Confirm signup: mencionar Oryon, link expirar em 24h
--    - Magic Link: para login sem senha
--    - Reset password: link expirar em 1h
--
-- 3. Authentication > URL Configuration:
--    - Site URL: https://seu-dominio.com.br
--    - Redirect URLs:
--        https://seu-dominio.com.br/auth/callback
--        http://localhost:5173/auth/callback (desenvolvimento)
--
-- 4. Authentication > Advanced:
--    - JWT Expiry: 3600 (1 hora)  — refresh token: 7 dias
--    - Enable "leaked password protection"
--    - OTP Expiry: 3600 seconds
--
-- 5. Database > Realtime:
--    - Habilitar Realtime para tabelas: notifications, direct_messages
--    - (posts e reactions podem usar polling para economizar conexões)
-- ============================================================
