import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Post, type Profile } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

const PAGE_SIZE = 10

export interface FeedPost extends Post {
  author: Pick<Profile, 'username' | 'full_name' | 'avatar_url' | 'is_verified'>
  user_reaction: string | null
}

export function useFeed() {
  const { user } = useAuthStore()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const offsetRef = useRef(0)

  const fetchPosts = useCallback(
    async (reset = false) => {
      if (!user) return
      const offset = reset ? 0 : offsetRef.current

      if (reset) setLoading(true)
      else setLoadingMore(true)

      try {
        const { data, error: fetchError } = await supabase
          .from('posts')
          .select('*, author:profiles!author_id(username, full_name, avatar_url, is_verified)')
          .is('parent_id', null)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)

        if (fetchError) throw fetchError

        const rows = (data ?? []) as FeedPost[]

        // Busca reações do usuário atual em lote (evita N+1)
        let userReactions: Record<string, string> = {}
        if (rows.length > 0) {
          const ids = rows.map((p) => p.id)
          const { data: reactions } = await supabase
            .from('reactions')
            .select('post_id, type')
            .eq('user_id', user.id)
            .in('post_id', ids)

          userReactions = Object.fromEntries(
            (reactions ?? []).map((r) => [r.post_id, r.type]),
          )
        }

        const enriched = rows.map((p) => ({
          ...p,
          user_reaction: userReactions[p.id] ?? null,
        }))

        setPosts((prev) => (reset ? enriched : [...prev, ...enriched]))
        offsetRef.current = offset + rows.length
        setHasMore(rows.length === PAGE_SIZE)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar posts')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [user],
  )

  useEffect(() => {
    offsetRef.current = 0
    fetchPosts(true)
  }, [fetchPosts])

  // Prepend de novo post (após criação)
  const prependPost = useCallback((post: FeedPost) => {
    setPosts((prev) => [post, ...prev])
    offsetRef.current += 1
  }, [])

  // Atualiza reação localmente (optimistic update)
  const updateReaction = useCallback(
    (postId: string, reaction: string | null, delta: number) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, user_reaction: reaction, likes_count: p.likes_count + delta }
            : p,
        ),
      )
    },
    [],
  )

  // Remove post localmente
  const removePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    offsetRef.current -= 1
  }, [])

  // Atualiza conteúdo e/ou mídia do post localmente
  const updatePost = useCallback((
    postId: string,
    content: string,
    mediaUrls?: Array<{ url: string; type: string; alt_text?: string }>,
  ) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, content, ...(mediaUrls !== undefined ? { media_urls: mediaUrls } : {}) }
          : p,
      ),
    )
  }, [])

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore: () => fetchPosts(false),
    refresh: () => { offsetRef.current = 0; fetchPosts(true) },
    prependPost,
    updateReaction,
    removePost,
    updatePost,
  }
}
