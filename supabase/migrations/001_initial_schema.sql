-- ============================================================
-- ORYON — Schema Inicial do Banco de Dados
-- Supabase / PostgreSQL
-- Migração: 001_initial_schema.sql
-- ============================================================

-- Habilitar extensões necessárias
-- uuid-ossp removido: gen_random_uuid() é nativo no PostgreSQL 13+ (Supabase padrão)
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- busca textual eficiente

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE privacy_level    AS ENUM ('public', 'connections', 'private');
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'blocked');
CREATE TYPE group_privacy    AS ENUM ('public', 'private', 'secret');
CREATE TYPE group_role       AS ENUM ('admin', 'moderator', 'member');
CREATE TYPE post_visibility  AS ENUM ('public', 'connections', 'private', 'group');
CREATE TYPE post_type        AS ENUM ('text', 'image', 'video', 'link', 'project_update', 'poll');
CREATE TYPE reaction_type    AS ENUM ('like', 'love', 'celebrate', 'insightful', 'curious');
CREATE TYPE project_status   AS ENUM ('planning', 'active', 'on_hold', 'completed', 'archived');
CREATE TYPE project_role     AS ENUM ('owner', 'manager', 'contributor', 'viewer');
CREATE TYPE task_status      AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE task_priority    AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE notification_type AS ENUM (
  'connection_request', 'connection_accepted',
  'post_like', 'post_comment', 'post_mention',
  'group_invite', 'group_post',
  'project_invite', 'project_update', 'task_assigned',
  'message'
);

-- ============================================================
-- TABELA: profiles
-- Extensão dos usuários do Supabase Auth
-- ============================================================

CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username         TEXT UNIQUE NOT NULL
                     CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  full_name        TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  avatar_url       TEXT,
  cover_url        TEXT,
  bio              TEXT CHECK (char_length(bio) <= 500),
  location         TEXT CHECK (char_length(location) <= 100),
  website_url      TEXT,
  occupation       TEXT CHECK (char_length(occupation) <= 100),

  -- Privacidade granular
  profile_privacy  privacy_level NOT NULL DEFAULT 'public',
  posts_privacy    privacy_level NOT NULL DEFAULT 'public',
  connections_privacy privacy_level NOT NULL DEFAULT 'connections',

  -- LGPD
  lgpd_accepted_at TIMESTAMPTZ,
  lgpd_version     TEXT,

  -- Gamificação / engajamento
  followers_count  INTEGER NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
  following_count  INTEGER NOT NULL DEFAULT 0 CHECK (following_count >= 0),
  posts_count      INTEGER NOT NULL DEFAULT 0 CHECK (posts_count >= 0),

  is_verified      BOOLEAN NOT NULL DEFAULT false,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  deactivated_at   TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para busca de usuários
CREATE INDEX idx_profiles_username    ON profiles USING btree (username);
CREATE INDEX idx_profiles_full_name   ON profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX idx_profiles_is_active   ON profiles (is_active) WHERE is_active = true;

-- ============================================================
-- TABELA: lgpd_consents
-- Rastreia consentimentos (obrigatório pela LGPD)
-- ============================================================

CREATE TABLE lgpd_consents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  version      TEXT NOT NULL,        -- ex: "v1.2", "2024-01-15"
  accepted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash      TEXT,                 -- SHA-256 do IP (não armazene o IP bruto)
  user_agent   TEXT,
  consent_type TEXT NOT NULL DEFAULT 'terms_and_privacy'  -- 'terms_and_privacy' | 'marketing'
);

CREATE INDEX idx_lgpd_consents_user ON lgpd_consents (user_id);

-- ============================================================
-- TABELA: connections
-- Seguidores/amizades bidirecionais
-- ============================================================

CREATE TABLE connections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       connection_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_connection CHECK (requester_id <> addressee_id),
  CONSTRAINT unique_connection  UNIQUE (requester_id, addressee_id)
);

CREATE INDEX idx_connections_requester ON connections (requester_id, status);
CREATE INDEX idx_connections_addressee ON connections (addressee_id, status);

-- ============================================================
-- TABELA: groups
-- ============================================================

CREATE TABLE groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL
                  CHECK (slug ~ '^[a-z0-9-]{3,60}$'),
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 100),
  description   TEXT CHECK (char_length(description) <= 2000),
  avatar_url    TEXT,
  cover_url     TEXT,
  creator_id    UUID NOT NULL REFERENCES profiles(id),
  privacy       group_privacy NOT NULL DEFAULT 'public',
  category      TEXT,
  tags          TEXT[] DEFAULT '{}',
  members_count INTEGER NOT NULL DEFAULT 0 CHECK (members_count >= 0),
  posts_count   INTEGER NOT NULL DEFAULT 0 CHECK (posts_count >= 0),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_slug     ON groups (slug);
CREATE INDEX idx_groups_privacy  ON groups (privacy) WHERE is_active = true;
CREATE INDEX idx_groups_name     ON groups USING gin (name gin_trgm_ops);
CREATE INDEX idx_groups_creator  ON groups (creator_id);

-- ============================================================
-- TABELA: group_members
-- ============================================================

CREATE TABLE group_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      group_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_group_member UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members (group_id, role);
CREATE INDEX idx_group_members_user  ON group_members (user_id);

-- ============================================================
-- TABELA: posts
-- Posts do feed, comentários, posts de grupos
-- ============================================================

CREATE TABLE posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES posts(id) ON DELETE CASCADE,  -- comentários

  content     TEXT CHECK (char_length(content) <= 10000),
  media_urls  JSONB DEFAULT '[]',  -- [{url, type, alt_text}]
  link_preview JSONB,              -- {url, title, description, image}

  visibility  post_visibility NOT NULL DEFAULT 'public',
  post_type   post_type NOT NULL DEFAULT 'text',

  -- Contadores desnormalizados para performance
  likes_count    INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  comments_count INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  shares_count   INTEGER NOT NULL DEFAULT 0 CHECK (shares_count >= 0),

  -- Moderação
  is_pinned      BOOLEAN NOT NULL DEFAULT false,
  is_hidden      BOOLEAN NOT NULL DEFAULT false,  -- moderação interna
  hidden_reason  TEXT,

  -- AI
  ai_summary     TEXT,  -- resumo gerado pelo agente IA
  ai_tags        TEXT[] DEFAULT '{}',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_author     ON posts (author_id, created_at DESC);
CREATE INDEX idx_posts_group      ON posts (group_id, created_at DESC) WHERE group_id IS NOT NULL;
CREATE INDEX idx_posts_parent     ON posts (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_posts_visibility ON posts (visibility, created_at DESC) WHERE is_hidden = false;
CREATE INDEX idx_posts_feed       ON posts (author_id, visibility, created_at DESC) WHERE parent_id IS NULL;

-- ============================================================
-- TABELA: reactions
-- ============================================================

CREATE TABLE reactions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id   UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type      reaction_type NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_reaction UNIQUE (post_id, user_id)
);

CREATE INDEX idx_reactions_post ON reactions (post_id, type);
CREATE INDEX idx_reactions_user ON reactions (user_id);

-- ============================================================
-- TABELA: projects
-- ============================================================

CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES groups(id) ON DELETE SET NULL,
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description TEXT CHECK (char_length(description) <= 5000),
  cover_url   TEXT,
  status      project_status NOT NULL DEFAULT 'planning',
  visibility  privacy_level NOT NULL DEFAULT 'private',
  tags        TEXT[] DEFAULT '{}',
  due_date    DATE,
  members_count INTEGER NOT NULL DEFAULT 1 CHECK (members_count >= 0),
  tasks_count   INTEGER NOT NULL DEFAULT 0 CHECK (tasks_count >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_owner  ON projects (owner_id, created_at DESC);
CREATE INDEX idx_projects_group  ON projects (group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_projects_status ON projects (status, visibility);

-- ============================================================
-- TABELA: project_members
-- ============================================================

CREATE TABLE project_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       project_role NOT NULL DEFAULT 'contributor',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members (project_id, role);
CREATE INDEX idx_project_members_user    ON project_members (user_id);

-- ============================================================
-- TABELA: project_tasks
-- Kanban
-- ============================================================

CREATE TABLE project_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by  UUID NOT NULL REFERENCES profiles(id),

  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  description TEXT CHECK (char_length(description) <= 5000),
  status      task_status NOT NULL DEFAULT 'todo',
  priority    task_priority NOT NULL DEFAULT 'medium',
  position    INTEGER NOT NULL DEFAULT 0,  -- ordenação dentro da coluna

  due_date    DATE,
  completed_at TIMESTAMPTZ,

  labels      TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_project  ON project_tasks (project_id, status, position);
CREATE INDEX idx_tasks_assignee ON project_tasks (assignee_id) WHERE assignee_id IS NOT NULL;

-- ============================================================
-- TABELA: direct_messages
-- Mensagens diretas entre usuários
-- ============================================================

CREATE TABLE direct_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
  media_url    TEXT,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_message CHECK (sender_id <> recipient_id)
);

CREATE INDEX idx_dm_sender    ON direct_messages (sender_id, created_at DESC);
CREATE INDEX idx_dm_recipient ON direct_messages (recipient_id, read_at, created_at DESC);
-- Índice para buscar conversas entre dois usuários
CREATE INDEX idx_dm_conversation ON direct_messages (
  LEAST(sender_id, recipient_id),
  GREATEST(sender_id, recipient_id),
  created_at DESC
);

-- ============================================================
-- TABELA: notifications
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- quem causou a notificação
  type        notification_type NOT NULL,
  entity_type TEXT,   -- 'post' | 'project' | 'group' | 'connection' | 'task'
  entity_id   UUID,   -- ID da entidade relacionada
  message     TEXT,   -- texto customizado opcional
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user   ON notifications (user_id, read_at, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Aplica trigger em todas as tabelas com updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNÇÃO: Cria perfil automaticamente após signup
-- Chamada via trigger do Supabase Auth
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    -- Gera username a partir do email (ex: "jose.silva@..." → "jose_silva")
    lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '_', 'g')) ||
      '_' || substr(NEW.id::text, 1, 6),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger no auth.users (Supabase Auth)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNÇÃO: Contadores desnormalizados (mantém consistência)
-- ============================================================

-- Atualiza followers_count e following_count ao aceitar conexão
CREATE OR REPLACE FUNCTION update_connection_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.requester_id;
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.addressee_id;
  ELSIF OLD.status = 'accepted' AND NEW.status <> 'accepted' THEN
    UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = NEW.requester_id;
    UPDATE profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = NEW.addressee_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_connection_counts
  AFTER INSERT OR UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_connection_counts();

-- Atualiza posts_count no perfil
CREATE OR REPLACE FUNCTION update_post_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NULL THEN
    UPDATE profiles SET posts_count = posts_count + 1 WHERE id = NEW.author_id;
    IF NEW.group_id IS NOT NULL THEN
      UPDATE groups SET posts_count = posts_count + 1 WHERE id = NEW.group_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NULL THEN
    UPDATE profiles SET posts_count = GREATEST(posts_count - 1, 0) WHERE id = OLD.author_id;
    IF OLD.group_id IS NOT NULL THEN
      UPDATE groups SET posts_count = GREATEST(posts_count - 1, 0) WHERE id = OLD.group_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_post_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_post_count();

-- Atualiza likes_count no post
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_likes_count
  AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- Atualiza members_count em grupos
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE groups SET members_count = members_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups SET members_count = GREATEST(members_count - 1, 0) WHERE id = OLD.group_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_group_member_count
  AFTER INSERT OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION update_group_member_count();
