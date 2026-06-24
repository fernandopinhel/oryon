-- ============================================================
-- ORYON — Row Level Security (RLS)
-- Migração: 002_rls_policies.sql
-- ============================================================
-- PRINCÍPIO: Negar tudo por padrão, liberar explicitamente.
-- Cada policy usa auth.uid() para identificar o usuário atual.
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS (usadas nas policies)
-- ============================================================

-- Verifica se dois usuários são conexões aceitas
CREATE OR REPLACE FUNCTION are_connected(user_a UUID, user_b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM connections
    WHERE status = 'accepted'
      AND (
        (requester_id = user_a AND addressee_id = user_b) OR
        (requester_id = user_b AND addressee_id = user_a)
      )
  );
$$;

-- Verifica se o usuário atual é membro de um grupo
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$;

-- Verifica se o usuário atual é membro de um projeto
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$;

-- Retorna o role do usuário atual em um projeto
CREATE OR REPLACE FUNCTION my_project_role(p_project_id UUID)
RETURNS project_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM project_members
  WHERE project_id = p_project_id AND user_id = auth.uid()
  LIMIT 1;
$$;

-- Retorna o role do usuário atual em um grupo
CREATE OR REPLACE FUNCTION my_group_role(p_group_id UUID)
RETURNS group_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM group_members
  WHERE group_id = p_group_id AND user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgpd_consents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: PROFILES
-- ============================================================

-- Leitura: respeita profile_privacy do usuário alvo
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  is_active = true AND (
    -- Próprio perfil: sempre visível
    id = auth.uid()
    OR
    -- Perfil público: visível para todos (inclusive anônimos)
    profile_privacy = 'public'
    OR
    -- Perfil para conexões: visível se são conexões
    (profile_privacy = 'connections' AND are_connected(id, auth.uid()))
    -- Perfil privado: só o próprio dono vê (coberto acima)
  )
);

-- Inserção: somente via trigger (handle_new_user), bloqueado para usuários
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (
  id = auth.uid()
);

-- Atualização: somente o próprio usuário edita seu perfil
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  id = auth.uid()
) WITH CHECK (
  id = auth.uid()
);

-- Exclusão: não permitida diretamente (usar soft delete via update)
-- Hard delete feito via Edge Function após 30 dias de solicitação LGPD
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (false);

-- ============================================================
-- RLS: LGPD_CONSENTS
-- ============================================================

CREATE POLICY "lgpd_select_own" ON lgpd_consents FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "lgpd_insert_own" ON lgpd_consents FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- Consentimentos não podem ser alterados ou deletados (imutabilidade auditável)
CREATE POLICY "lgpd_no_update" ON lgpd_consents FOR UPDATE USING (false);
CREATE POLICY "lgpd_no_delete" ON lgpd_consents FOR DELETE USING (false);

-- ============================================================
-- RLS: CONNECTIONS
-- ============================================================

-- Leitura: ambas as partes veem a conexão
CREATE POLICY "connections_select" ON connections FOR SELECT USING (
  requester_id = auth.uid() OR addressee_id = auth.uid()
);

-- Criação: usuário autenticado pode enviar pedido de conexão
CREATE POLICY "connections_insert" ON connections FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND requester_id = auth.uid()
  AND addressee_id <> auth.uid()
);

-- Atualização: apenas o destinatário aceita/rejeita; o solicitante pode cancelar
CREATE POLICY "connections_update" ON connections FOR UPDATE USING (
  -- Destinatário pode aceitar/rejeitar (mudar status)
  addressee_id = auth.uid()
  OR
  -- Solicitante pode cancelar (deletar é melhor, mas se atualizar, só ele)
  requester_id = auth.uid()
);

-- Exclusão: ambas as partes podem remover a conexão
CREATE POLICY "connections_delete" ON connections FOR DELETE USING (
  requester_id = auth.uid() OR addressee_id = auth.uid()
);

-- ============================================================
-- RLS: GROUPS
-- ============================================================

-- Leitura de grupos: público e privado são visíveis, secreto só para membros
CREATE POLICY "groups_select" ON groups FOR SELECT USING (
  is_active = true AND (
    privacy IN ('public', 'private')  -- nome/descrição visível
    OR
    is_group_member(id)               -- secreto: só membros
  )
);

-- Criação: usuário autenticado pode criar grupos
CREATE POLICY "groups_insert" ON groups FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND creator_id = auth.uid()
);

-- Atualização: admin do grupo pode editar
CREATE POLICY "groups_update" ON groups FOR UPDATE USING (
  my_group_role(id) = 'admin'
);

-- Exclusão: apenas o criador/admin pode deletar
CREATE POLICY "groups_delete" ON groups FOR DELETE USING (
  creator_id = auth.uid() OR my_group_role(id) = 'admin'
);

-- ============================================================
-- RLS: GROUP_MEMBERS
-- ============================================================

-- Leitura: membros de grupos públicos/privados veem outros membros
-- Grupos secretos: só membros
CREATE POLICY "group_members_select" ON group_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM groups g WHERE g.id = group_id AND (
      g.privacy IN ('public', 'private')
      OR is_group_member(group_id)
    )
  )
);

-- Entrar em grupo público: qualquer usuário autenticado
CREATE POLICY "group_members_insert" ON group_members FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = group_id AND g.privacy = 'public' AND g.is_active = true
  )
);

-- Moderadores e admins podem alterar roles
CREATE POLICY "group_members_update" ON group_members FOR UPDATE USING (
  my_group_role(group_id) IN ('admin', 'moderator')
);

-- Sair do grupo (próprio) ou admin removendo membro
CREATE POLICY "group_members_delete" ON group_members FOR DELETE USING (
  user_id = auth.uid()
  OR my_group_role(group_id) IN ('admin', 'moderator')
);

-- ============================================================
-- RLS: POSTS
-- ============================================================

CREATE POLICY "posts_select" ON posts FOR SELECT USING (
  is_hidden = false AND (
    -- Próprio post: sempre visível
    author_id = auth.uid()
    OR
    -- Post público
    visibility = 'public'
    OR
    -- Post para conexões: só conexões
    (visibility = 'connections' AND are_connected(author_id, auth.uid()))
    OR
    -- Post de grupo: só membros do grupo
    (visibility = 'group' AND group_id IS NOT NULL AND is_group_member(group_id))
    -- Post privado: só o autor (coberto acima)
  )
);

-- Qualquer usuário autenticado pode criar posts
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND author_id = auth.uid()
  -- Se for post em grupo, deve ser membro do grupo
  AND (group_id IS NULL OR is_group_member(group_id))
);

-- Apenas o autor pode editar (não comentários de outros)
CREATE POLICY "posts_update" ON posts FOR UPDATE USING (
  author_id = auth.uid()
) WITH CHECK (
  author_id = auth.uid()
);

-- Autor ou moderador do grupo pode deletar
CREATE POLICY "posts_delete" ON posts FOR DELETE USING (
  author_id = auth.uid()
  OR (group_id IS NOT NULL AND my_group_role(group_id) IN ('admin', 'moderator'))
);

-- ============================================================
-- RLS: REACTIONS
-- ============================================================

-- Vê reações se puder ver o post
CREATE POLICY "reactions_select" ON reactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts p WHERE p.id = post_id
    -- A policy de posts já filtra, mas precisamos do EXISTS para o join
    AND (
      p.author_id = auth.uid()
      OR p.visibility = 'public'
      OR (p.visibility = 'connections' AND are_connected(p.author_id, auth.uid()))
      OR (p.visibility = 'group' AND p.group_id IS NOT NULL AND is_group_member(p.group_id))
    )
    AND p.is_hidden = false
  )
);

-- Reagir: usuário autenticado, uma reação por post (UNIQUE garante)
CREATE POLICY "reactions_insert" ON reactions FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

-- Mudar tipo de reação
CREATE POLICY "reactions_update" ON reactions FOR UPDATE USING (
  user_id = auth.uid()
);

-- Remover própria reação
CREATE POLICY "reactions_delete" ON reactions FOR DELETE USING (
  user_id = auth.uid()
);

-- ============================================================
-- RLS: PROJECTS
-- ============================================================

CREATE POLICY "projects_select" ON projects FOR SELECT USING (
  -- Próprio projeto
  owner_id = auth.uid()
  OR
  -- Membro do projeto
  is_project_member(id)
  OR
  -- Projeto público
  visibility = 'public'
  OR
  -- Projeto compartilhado com conexões
  (visibility = 'connections' AND are_connected(owner_id, auth.uid()))
);

CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND owner_id = auth.uid()
);

-- Owner ou manager podem editar
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (
  owner_id = auth.uid() OR my_project_role(id) IN ('owner', 'manager')
);

-- Somente owner pode deletar
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (
  owner_id = auth.uid()
);

-- ============================================================
-- RLS: PROJECT_MEMBERS
-- ============================================================

CREATE POLICY "project_members_select" ON project_members FOR SELECT USING (
  is_project_member(project_id)
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);

CREATE POLICY "project_members_insert" ON project_members FOR INSERT WITH CHECK (
  -- Owner ou manager podem adicionar membros
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND (
      p.owner_id = auth.uid() OR
      my_project_role(project_id) IN ('owner', 'manager')
    )
  )
);

CREATE POLICY "project_members_update" ON project_members FOR UPDATE USING (
  my_project_role(project_id) IN ('owner', 'manager')
);

CREATE POLICY "project_members_delete" ON project_members FOR DELETE USING (
  -- Pode sair do projeto (próprio)
  user_id = auth.uid()
  OR
  -- Manager/owner pode remover
  my_project_role(project_id) IN ('owner', 'manager')
);

-- ============================================================
-- RLS: PROJECT_TASKS
-- ============================================================

CREATE POLICY "tasks_select" ON project_tasks FOR SELECT USING (
  is_project_member(project_id)
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);

CREATE POLICY "tasks_insert" ON project_tasks FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
  AND (is_project_member(project_id) OR
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid()))
);

-- Criador da tarefa, assignee, ou managers podem editar
CREATE POLICY "tasks_update" ON project_tasks FOR UPDATE USING (
  created_by = auth.uid()
  OR assignee_id = auth.uid()
  OR my_project_role(project_id) IN ('owner', 'manager')
);

CREATE POLICY "tasks_delete" ON project_tasks FOR DELETE USING (
  created_by = auth.uid()
  OR my_project_role(project_id) IN ('owner', 'manager')
);

-- ============================================================
-- RLS: DIRECT_MESSAGES
-- ============================================================

-- Apenas remetente e destinatário veem a mensagem
CREATE POLICY "dm_select" ON direct_messages FOR SELECT USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);

-- Usuário autenticado pode enviar (deve ser o sender)
CREATE POLICY "dm_insert" ON direct_messages FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND sender_id = auth.uid()
  -- Verifica se o destinatário não bloqueou o remetente
  AND NOT EXISTS (
    SELECT 1 FROM connections c
    WHERE c.status = 'blocked'
      AND c.requester_id = recipient_id
      AND c.addressee_id = auth.uid()
  )
);

-- Só o sender pode editar (dentro de 5 minutos, validar no frontend)
CREATE POLICY "dm_update" ON direct_messages FOR UPDATE USING (
  sender_id = auth.uid()
);

-- Ambas as partes podem "deletar" (soft delete via update no frontend)
CREATE POLICY "dm_delete" ON direct_messages FOR DELETE USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);

-- ============================================================
-- RLS: NOTIFICATIONS
-- ============================================================

-- Apenas o destinatário vê suas notificações
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (
  user_id = auth.uid()
);

-- Inserção apenas via funções de servidor (SECURITY DEFINER)
-- Bloqueado para o cliente diretamente
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (false);

-- Marcar como lida (apenas o destinatário)
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (
  user_id = auth.uid()
);

-- Limpar notificações
CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (
  user_id = auth.uid()
);

-- ============================================================
-- FUNÇÃO: Criar notificação (chamada por triggers SECURITY DEFINER)
-- Bypassa a policy de INSERT acima
-- ============================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id     UUID,
  p_actor_id    UUID,
  p_type        notification_type,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id   UUID DEFAULT NULL,
  p_message     TEXT DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Não notificar o próprio usuário de suas ações
  IF p_user_id = p_actor_id THEN RETURN; END IF;

  INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, message)
  VALUES (p_user_id, p_actor_id, p_type, p_entity_type, p_entity_id, p_message);
END;
$$;

-- Trigger: notificação ao receber pedido de conexão
CREATE OR REPLACE FUNCTION notify_connection_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending') THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM create_notification(
        NEW.addressee_id, NEW.requester_id,
        'connection_request', 'connection', NEW.id
      );
    ELSE
      PERFORM create_notification(
        NEW.requester_id, NEW.addressee_id,
        'connection_accepted', 'connection', NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_connection
  AFTER INSERT OR UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION notify_connection_request();

-- Trigger: notificação ao receber like
CREATE OR REPLACE FUNCTION notify_reaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_author UUID;
BEGIN
  SELECT author_id INTO v_author FROM posts WHERE id = NEW.post_id;
  PERFORM create_notification(
    v_author, NEW.user_id,
    'post_like', 'post', NEW.post_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_reaction
  AFTER INSERT ON reactions
  FOR EACH ROW EXECUTE FUNCTION notify_reaction();

-- Trigger: notificação ao receber comentário
CREATE OR REPLACE FUNCTION notify_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_author UUID;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO v_author FROM posts WHERE id = NEW.parent_id;
    PERFORM create_notification(
      v_author, NEW.author_id,
      'post_comment', 'post', NEW.parent_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION notify_comment();
