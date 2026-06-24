import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { GroupSummary } from './useGroups'
import type { Post, Profile } from '@/lib/supabase'

export interface GroupMember {
  id: string
  user_id: string
  role: 'admin' | 'moderator' | 'member'
  joined_at: string
  profile: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url' | 'occupation' | 'is_verified'>
}

export type GroupPost = Post & {
  author: Pick<Profile, 'username' | 'full_name' | 'avatar_url' | 'is_verified'>
  user_reaction: string | null
}

export interface Membership {
  isMember: boolean
  role: 'admin' | 'moderator' | 'member' | null
  memberId: string | null
}

const PAGE = 10

export function useGroup(groupId: string) {
  const { user } = useAuthStore()

  const [group,      setGroup]      = useState<GroupSummary | null>(null)
  const [membership, setMembership] = useState<Membership>({ isMember: false, role: null, memberId: null })
  const [posts,      setPosts]      = useState<GroupPost[]>([])
  const [members,    setMembers]    = useState<GroupMember[]>([])

  const [loading,      setLoading]      = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [hasMore,      setHasMore]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  // Carrega grupo + membership
  useEffect(() => {
    if (!groupId) return
    setLoading(true)

    async function load() {
      const { data: groupData, error: groupErr } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (groupErr || !groupData) {
        setError('Grupo não encontrado ou você não tem acesso.')
        setLoading(false)
        return
      }

      setGroup(groupData as GroupSummary)

      if (user) {
        const { data: mem } = await supabase
          .from('group_members')
          .select('id, role')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle()

        setMembership({
          isMember: !!mem,
          role: (mem?.role as Membership['role']) ?? null,
          memberId: mem?.id ?? null,
        })
      }

      setLoading(false)
    }

    load()
  }, [groupId, user])

  // Carrega posts do grupo
  const fetchPosts = useCallback(
    async (reset = true) => {
      if (reset) setPostsLoading(true)
      else setLoadingMore(true)

      const offset = reset ? 0 : posts.length

      const { data, error: postsErr } = await supabase
        .from('posts')
        .select('*, author:profiles!author_id(username, full_name, avatar_url, is_verified)')
        .eq('group_id', groupId)
        .is('parent_id', null)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE - 1)

      if (!postsErr && data) {
        const rows = data as GroupPost[]

        // Reações do usuário em lote
        let userReactions: Record<string, string> = {}
        if (user && rows.length > 0) {
          const { data: reactions } = await supabase
            .from('reactions')
            .select('post_id, type')
            .eq('user_id', user.id)
            .in('post_id', rows.map((p) => p.id))
          userReactions = Object.fromEntries((reactions ?? []).map((r) => [r.post_id, r.type]))
        }

        const enriched = rows.map((p) => ({ ...p, user_reaction: userReactions[p.id] ?? null }))
        setPosts((prev) => (reset ? enriched : [...prev, ...enriched]))
        setHasMore(rows.length === PAGE)
      }

      setPostsLoading(false)
      setLoadingMore(false)
    },
    [groupId, user, posts.length],
  )

  useEffect(() => {
    if (!loading && group) fetchPosts(true)
  }, [loading, group]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega membros (lazy — chamado apenas na aba Membros)
  const fetchMembers = useCallback(async () => {
    setMembersLoading(true)
    const { data } = await supabase
      .from('group_members')
      .select('id, role, joined_at, user_id, profile:profiles!user_id(id, username, full_name, avatar_url, occupation, is_verified)')
      .eq('group_id', groupId)
      .order('role')
      .order('joined_at')
      .limit(50)

    setMembers((data as unknown as GroupMember[]) ?? [])
    setMembersLoading(false)
  }, [groupId])

  // Entrar no grupo
  async function join() {
    if (!user) return
    const { data } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: user.id })
      .select('id, role')
      .single()

    if (data) {
      setMembership({ isMember: true, role: 'member', memberId: data.id })
      setGroup((g) => g ? { ...g, members_count: g.members_count + 1 } : g)
    }
  }

  // Sair do grupo
  async function leave() {
    if (!user || !membership.memberId) return
    await supabase.from('group_members').delete().eq('id', membership.memberId)
    setMembership({ isMember: false, role: null, memberId: null })
    setGroup((g) => g ? { ...g, members_count: Math.max(0, g.members_count - 1) } : g)
  }

  // Adiciona post novo ao topo
  function prependPost(post: GroupPost) {
    setPosts((prev) => [post, ...prev])
    setGroup((g) => g ? { ...g, posts_count: g.posts_count + 1 } : g)
  }

  // Atualiza reação localmente
  function updateReaction(postId: string, reaction: string | null, delta: number) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, user_reaction: reaction, likes_count: p.likes_count + delta } : p,
      ),
    )
  }

  function removePost(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    setGroup((g) => g ? { ...g, posts_count: Math.max(0, g.posts_count - 1) } : g)
  }

  function updatePost(
    postId: string,
    content: string,
    mediaUrls?: Array<{ url: string; type: string; alt_text?: string }>,
  ) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, content, ...(mediaUrls !== undefined ? { media_urls: mediaUrls } : {}) }
          : p,
      ),
    )
  }

  // Promover / rebaixar membro
  async function updateMemberRole(memberId: string, role: 'admin' | 'moderator' | 'member') {
    await supabase.from('group_members').update({ role }).eq('id', memberId)
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)))
  }

  // Remover membro (admin)
  async function removeMember(memberId: string) {
    await supabase.from('group_members').delete().eq('id', memberId)
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
    setGroup((g) => g ? { ...g, members_count: Math.max(0, g.members_count - 1) } : g)
  }

  function updateGroupImages(patch: { cover_url?: string; avatar_url?: string }) {
    setGroup((g) => g ? { ...g, ...patch } : g)
  }

  return {
    group, membership, posts, members,
    loading, postsLoading, membersLoading, loadingMore, hasMore, error,
    fetchMembers,
    loadMore: () => fetchPosts(false),
    join, leave,
    prependPost, updateReaction, removePost, updatePost,
    updateMemberRole, removeMember,
    updateGroupImages,
  }
}
