-- ============================================================
-- ORYON — Correções de RLS e funções SECURITY DEFINER
-- Migração: 006_fixes.sql
-- ============================================================

-- ============================================================
-- FIX 1: SECURITY DEFINER functions — adicionar SET search_path
-- Sem isso as funções podem silenciosamente falhar ao buscar
-- tabelas quando o search_path do caller não inclui public.
-- ============================================================

CREATE OR REPLACE FUNCTION are_connected(user_a UUID, user_b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM connections
    WHERE status = 'accepted'
      AND (
        (requester_id = user_a AND addressee_id = user_b) OR
        (requester_id = user_b AND addressee_id = user_a)
      )
  );
$$;

CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION my_project_role(p_project_id UUID)
RETURNS project_role LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM project_members
  WHERE project_id = p_project_id AND user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION my_group_role(p_group_id UUID)
RETURNS group_role LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM group_members
  WHERE group_id = p_group_id AND user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- FIX 2: projects_update — adicionar WITH CHECK
-- Sem WITH CHECK o PostgreSQL aceita rows que passam no USING
-- mas não valida a row após a escrita. Managers bloqueados aqui.
-- ============================================================

DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects FOR UPDATE
USING (
  owner_id = auth.uid() OR my_project_role(id) IN ('owner', 'manager')
)
WITH CHECK (
  owner_id = auth.uid() OR my_project_role(id) IN ('owner', 'manager')
);

-- ============================================================
-- FIX 3: dm_update — permitir recipient atualizar read_at
-- Antes só o sender podia fazer UPDATE; o recipient nunca
-- conseguia marcar mensagens como lidas → badge sempre aceso.
-- ============================================================

DROP POLICY IF EXISTS "dm_update" ON direct_messages;
CREATE POLICY "dm_update" ON direct_messages FOR UPDATE
USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
)
WITH CHECK (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);
