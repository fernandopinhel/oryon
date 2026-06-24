import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Profile } from '@/lib/supabase'
import type { ProjectSummary } from './useProjects'

export type TaskStatus   = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  project_id: string
  assignee_id: string | null
  created_by: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  position: number
  due_date: string | null
  completed_at: string | null
  labels: string[]
  created_at: string
  updated_at: string
  assignee?: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'> | null
}

export interface ProjectMember {
  id: string
  user_id: string
  role: 'owner' | 'manager' | 'contributor' | 'viewer'
  joined_at: string
  profile: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>
}

export type TasksByStatus = Record<TaskStatus, Task[]>

export function useProject(projectId: string) {
  const { user } = useAuthStore()

  const [project,  setProject]  = useState<ProjectSummary | null>(null)
  const [tasks,    setTasks]    = useState<Task[]>([])
  const [members,  setMembers]  = useState<ProjectMember[]>([])
  const [myRole,   setMyRole]   = useState<string | null>(null)

  const [loading,       setLoading]       = useState(true)
  const [tasksLoading,  setTasksLoading]  = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  // Carrega projeto + membros + tasks
  const loadAll = useCallback(async () => {
    if (!projectId) return
    setLoading(true)

    const [{ data: proj, error: projErr }, { data: memberData }, { data: taskData }] =
      await Promise.all([
        supabase
          .from('projects')
          .select('*, owner:profiles!owner_id(id, username, full_name, avatar_url), members:project_members(user_id, role, profile:profiles!user_id(id, username, full_name, avatar_url))')
          .eq('id', projectId)
          .single(),
        supabase
          .from('project_members')
          .select('id, user_id, role, joined_at, profile:profiles!user_id(id, username, full_name, avatar_url)')
          .eq('project_id', projectId)
          .order('joined_at'),
        supabase
          .from('project_tasks')
          .select('*, assignee:profiles!assignee_id(id, username, full_name, avatar_url)')
          .eq('project_id', projectId)
          .order('status')
          .order('position'),
      ])

    if (projErr || !proj) {
      setError('Projeto não encontrado.')
      setLoading(false)
      return
    }

    setProject(proj as unknown as ProjectSummary)
    setMembers((memberData as unknown as ProjectMember[]) ?? [])
    setTasks((taskData as unknown as Task[]) ?? [])

    const me = memberData?.find((m) => m.user_id === user?.id)
    setMyRole(
      (proj as unknown as ProjectSummary).owner_id === user?.id
        ? 'owner'
        : me?.role ?? null,
    )

    setLoading(false)
  }, [projectId, user?.id])

  useEffect(() => { loadAll() }, [loadAll])

  // Tasks agrupadas por status
  const tasksByStatus: TasksByStatus = {
    todo:        tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    review:      tasks.filter((t) => t.status === 'review'),
    done:        tasks.filter((t) => t.status === 'done'),
  }

  // Mover task entre colunas (optimistic)
  async function moveTask(taskId: string, newStatus: TaskStatus) {
    const maxPos = Math.max(0, ...tasks.filter((t) => t.status === newStatus).map((t) => t.position))
    const newPos = maxPos + 1000

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, position: newPos } : t,
      ),
    )

    await supabase
      .from('project_tasks')
      .update({
        status:   newStatus,
        position: newPos,
        ...(newStatus === 'done' ? { completed_at: new Date().toISOString() } : { completed_at: null }),
      })
      .eq('id', taskId)
  }

  // Criar tarefa
  async function createTask(payload: Partial<Task>): Promise<void> {
    if (!user) return
    setTasksLoading(true)

    const status = payload.status ?? 'todo'
    const maxPos = Math.max(0, ...tasks.filter((t) => t.status === status).map((t) => t.position))

    const { data, error: err } = await supabase
      .from('project_tasks')
      .insert({
        ...payload,
        project_id: projectId,
        created_by: user.id,
        position:   maxPos + 1000,
      })
      .select('*, assignee:profiles!assignee_id(id, username, full_name, avatar_url)')
      .single()

    if (!err && data) {
      setTasks((prev) => [...prev, data as unknown as Task])
      setProject((p) => p ? { ...p, tasks_count: p.tasks_count + 1 } : p)
    }

    setTasksLoading(false)
  }

  // Editar tarefa
  async function updateTask(taskId: string, payload: Partial<Task>): Promise<void> {
    const { data, error: err } = await supabase
      .from('project_tasks')
      .update(payload)
      .eq('id', taskId)
      .select('*, assignee:profiles!assignee_id(id, username, full_name, avatar_url)')
      .single()

    if (!err && data) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? (data as unknown as Task) : t)))
    }
  }

  // Excluir tarefa
  async function deleteTask(taskId: string): Promise<void> {
    await supabase.from('project_tasks').delete().eq('id', taskId)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setProject((p) => p ? { ...p, tasks_count: Math.max(0, p.tasks_count - 1) } : p)
  }

  // Adicionar membro
  async function addMember(userId: string, role: ProjectMember['role']): Promise<void> {
    const { data } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: userId, role })
      .select('id, user_id, role, joined_at, profile:profiles!user_id(id, username, full_name, avatar_url)')
      .single()

    if (data) {
      setMembers((prev) => [...prev, data as unknown as ProjectMember])
      setProject((p) => p ? { ...p, members_count: p.members_count + 1 } : p)
    }
  }

  // Remover membro
  async function removeMember(memberId: string): Promise<void> {
    await supabase.from('project_members').delete().eq('id', memberId)
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
    setProject((p) => p ? { ...p, members_count: Math.max(0, p.members_count - 1) } : p)
  }

  // Atualizar role de um membro
  async function updateMemberRole(memberId: string, role: ProjectMember['role']): Promise<void> {
    const { error } = await supabase
      .from('project_members')
      .update({ role })
      .eq('id', memberId)
    if (error) throw error
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m))
  }

  // Atualizar status do projeto
  async function updateProjectStatus(status: string): Promise<void> {
    await supabase.from('projects').update({ status }).eq('id', projectId)
    setProject((p) => p ? { ...p, status: status as ProjectSummary['status'] } : p)
  }

  // Atualizar projeto (campos gerais)
  async function updateProject(payload: Partial<ProjectSummary>): Promise<void> {
    const { error } = await supabase.from('projects').update(payload).eq('id', projectId)
    if (error) throw error
    setProject((p) => p ? { ...p, ...payload } : p)
  }

  // Excluir projeto
  async function deleteProject(): Promise<void> {
    await supabase.from('projects').delete().eq('id', projectId)
  }

  const canEdit = myRole === 'owner' || myRole === 'manager'
  const isMember = !!myRole

  return {
    project, tasks, tasksByStatus, members, myRole, canEdit, isMember,
    loading, tasksLoading, error,
    moveTask, createTask, updateTask, deleteTask,
    addMember, removeMember, updateMemberRole, updateProjectStatus, updateProject, deleteProject,
    refresh: loadAll,
  }
}
