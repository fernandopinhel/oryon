import { useState, useEffect } from 'react'
import { supabase, type Profile, type Post } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export type ConnectionStatus =
  | 'none'
  | 'pending_sent'      // eu enviei, aguardando resposta
  | 'pending_received'  // eles enviaram, aguardando minha resposta
  | 'connected'
  | 'blocked'

export interface ConnectionInfo {
  status: ConnectionStatus
  connectionId: string | null
}

export interface ProfilePageData {
  profile: Profile | null
  connectionInfo: ConnectionInfo
  posts: Array<Post & { author: Pick<Profile, 'username' | 'full_name' | 'avatar_url' | 'is_verified'> }>
  loading: boolean
  postsLoading: boolean
  error: string | null
  removePost: (postId: string) => void
  updatePost: (postId: string, content: string, mediaUrls?: Array<{ url: string; type: string; alt_text?: string }>) => void
}

export function useProfile(username: string): ProfilePageData {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    status: 'none',
    connectionId: null,
  })
  const [posts, setPosts] = useState<ProfilePageData['posts']>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!username) return
    setLoading(true)
    setError(null)

    async function load() {
      // Busca perfil por username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single()

      if (profileError || !profileData) {
        setError('Perfil não encontrado.')
        setLoading(false)
        return
      }

      setProfile(profileData as Profile)

      // Busca status de conexão (se não for o próprio perfil)
      if (user && user.id !== profileData.id) {
        const { data: conn } = await supabase
          .from('connections')
          .select('id, status, requester_id, addressee_id')
          .or(
            `and(requester_id.eq.${user.id},addressee_id.eq.${profileData.id}),` +
            `and(requester_id.eq.${profileData.id},addressee_id.eq.${user.id})`,
          )
          .maybeSingle()

        if (conn) {
          let status: ConnectionStatus = 'none'
          if (conn.status === 'blocked') {
            status = 'blocked'
          } else if (conn.status === 'accepted') {
            status = 'connected'
          } else if (conn.status === 'pending') {
            status = conn.requester_id === user.id ? 'pending_sent' : 'pending_received'
          }
          setConnectionInfo({ status, connectionId: conn.id })
        } else {
          setConnectionInfo({ status: 'none', connectionId: null })
        }
      }

      setLoading(false)

      // Busca posts do perfil separadamente
      setPostsLoading(true)
      const { data: postsData } = await supabase
        .from('posts')
        .select('*, author:profiles!author_id(username, full_name, avatar_url, is_verified)')
        .eq('author_id', profileData.id)
        .is('parent_id', null)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(20)

      setPosts((postsData as ProfilePageData['posts']) ?? [])
      setPostsLoading(false)
    }

    load()
  }, [username, user])

  function removePost(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
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

  return { profile, connectionInfo, posts, loading, postsLoading, error, removePost, updatePost }
}
