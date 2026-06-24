-- ============================================================
-- ORYON — Chat media bucket + relaxar constraint de content
-- Migração: 005_chat_media.sql
-- ============================================================

-- Bucket para mídia de mensagens diretas (imagens, vídeos, arquivos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media', 'chat-media', true,
  52428800,  -- 50MB
  ARRAY[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime',
    'audio/mpeg','audio/ogg','audio/wav',
    'application/pdf','text/plain',
    'application/zip','application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
);

-- RLS: leitura pública
CREATE POLICY "chat_media_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-media');

-- RLS: apenas o remetente pode fazer upload (pasta = sender_id)
CREATE POLICY "chat_media_sender_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-media' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "chat_media_sender_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Adiciona colunas de mídia à tabela de mensagens
ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS media_name TEXT,
  ADD COLUMN IF NOT EXISTS media_size BIGINT,
  ADD COLUMN IF NOT EXISTS media_mime  TEXT;

-- Relaxa constraint para permitir conteúdo vazio em mensagens só-mídia
ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS direct_messages_content_check;
ALTER TABLE direct_messages
  ADD CONSTRAINT direct_messages_content_check CHECK (
    (char_length(TRIM(content)) > 0) OR (media_url IS NOT NULL)
  );
