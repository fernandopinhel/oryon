import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Profile } from '@/lib/supabase'

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'
export type ProjectVisibility = 'public' | 'connections' | 'private'

export interface ProjectSummary {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  status: ProjectStatus
  visibility: ProjectVisibility
  owner_id: string
  due_date: string | null
  members_count: number
  tasks_count: number
  tags: string[]
  created_at: string
  updated_at: string
  owner: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>
  members: Array<{
    user_id: string
    role: string
    profile: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>
  }>
  my_role?: string | null
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning:  'Planejamento',
  active:    'Ativo',
  on_hold:   'Pausado',
  completed: 'Concluído',
  archived:  'Arquivado',
}

export { STATUS_LABELS }

export function useProjects() {
  const { user } = useAuthStore()
  const [projects, setProjects]   = useState<ProjectSummary[]>([])
  const [loading,  setLoading]    = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('projects')
      .select(`
        *,
        owner:profiles!owner_id(id, username, full_name, avatar_url),
        members:project_members(user_id, role, profile:profiles!user_id(id, username, full_name, avatar_url))
      `)
      .order('updated_at', { ascending: false })

    if (data) {
      const list = (data as unknown as ProjectSummary[]).map((p) => ({
        ...p,
        my_role:
          p.owner_id === user.id
            ? 'owner'
            : (p.members.find((m) => m.user_id === user.id)?.role ?? null),
      }))
      setProjects(list)
    }

    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  async function createProject(payload: {
    title: string
    description?: string
    cover_url?: string | null
    visibility: ProjectVisibility
    status: ProjectStatus
    due_date?: string
    tags: string[]
  }): Promise<string> {
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...payload, owner_id: user.id })
      .select('id')
      .single()

    if (error) throw error

    // O criador entra como owner
    await supabase.from('project_members').insert({
      project_id: data.id,
      user_id:    user.id,
      role:       'owner',
    })

    await fetch()
    return data.id
  }

  async function updateProject(
    id: string,
    payload: Partial<{
      title: string
      description: string | null
      cover_url: string | null
      status: ProjectStatus
      visibility: ProjectVisibility
      due_date: string | null
      tags: string[]
    }>,
  ): Promise<void> {
    const { error } = await supabase.from('projects').update(payload).eq('id', id)
    if (error) throw error
    await fetch()
  }

  async function deleteProject(id: string): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) throw error
    await fetch()
  }

  return { projects, loading, refresh: fetch, createProject, updateProject, deleteProject }
}
