import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export interface GroupSummary {
  id: string
  slug: string
  name: string
  description: string | null
  avatar_url: string | null
  cover_url: string | null
  privacy: 'public' | 'private' | 'secret'
  category: string | null
  members_count: number
  posts_count: number
  created_at: string
  // injetado após join
  is_member?: boolean
  my_role?: string | null
}

export function useGroups() {
  const { user } = useAuthStore()
  const [exploreGroups, setExploreGroups] = useState<GroupSummary[]>([])
  const [myGroups, setMyGroups] = useState<GroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [query, setQuery] = useState('')
  const PAGE = 12

  const fetchMyGroups = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('group_members')
      .select('role, groups(*)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    setMyGroups(
      (data ?? []).map((row) => ({
        ...(row.groups as unknown as GroupSummary),
        is_member: true,
        my_role: row.role,
      })),
    )
  }, [user])

  const fetchExplore = useCallback(
    async (reset = true) => {
      if (reset) setLoading(true)
      else setLoadingMore(true)

      const offset = reset ? 0 : exploreGroups.length

      let q = supabase
        .from('groups')
        .select('*')
        .eq('is_active', true)
        .in('privacy', ['public', 'private'])
        .order('members_count', { ascending: false })
        .range(offset, offset + PAGE - 1)

      if (query.trim()) {
        q = q.ilike('name', `%${query.trim()}%`)
      }

      const { data } = await q
      const rows = (data ?? []) as GroupSummary[]
      setExploreGroups((prev) => (reset ? rows : [...prev, ...rows]))
      setHasMore(rows.length === PAGE)
      setLoading(false)
      setLoadingMore(false)
    },
    [query, exploreGroups.length],
  )

  useEffect(() => {
    fetchMyGroups()
    fetchExplore(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Rebusca ao mudar o query (com debounce simples via useEffect)
  useEffect(() => {
    const t = setTimeout(() => fetchExplore(true), 350)
    return () => clearTimeout(t)
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  async function joinGroup(groupId: string): Promise<void> {
    if (!user) return
    await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id })
    await fetchMyGroups()
    // Atualiza o contador localmente
    setExploreGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, is_member: true, members_count: g.members_count + 1 } : g,
      ),
    )
  }

  async function leaveGroup(groupId: string): Promise<void> {
    if (!user) return
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id)
    setMyGroups((prev) => prev.filter((g) => g.id !== groupId))
    setExploreGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, is_member: false, members_count: Math.max(0, g.members_count - 1) } : g,
      ),
    )
  }

  return {
    exploreGroups,
    myGroups,
    loading,
    loadingMore,
    hasMore,
    query,
    setQuery,
    loadMore: () => fetchExplore(false),
    refresh: () => { fetchExplore(true); fetchMyGroups() },
    joinGroup,
    leaveGroup,
  }
}
