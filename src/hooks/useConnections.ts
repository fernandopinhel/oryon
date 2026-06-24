import { useState, useEffect, useCallback } from 'react'
import { supabase, type Profile } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export interface ConnectionUser {
  connectionId: string
  status: 'accepted' | 'pending'
  role: 'requester' | 'addressee'
  profile: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url' | 'occupation' | 'followers_count' | 'is_verified'>
}

export function useConnections() {
  const { user } = useAuthStore()
  const [connections, setConnections] = useState<ConnectionUser[]>([])
  const [pendingReceived, setPendingReceived] = useState<ConnectionUser[]>([])
  const [suggestions, setSuggestions] = useState<Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url' | 'occupation' | 'followers_count' | 'is_verified'>[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Conexões aceitas e pedidos enviados/recebidos
    const { data: rawConns } = await supabase
      .from('connections')
      .select(`
        id, status, requester_id, addressee_id,
        requester:profiles!requester_id(id, username, full_name, avatar_url, occupation, followers_count, is_verified),
        addressee:profiles!addressee_id(id, username, full_name, avatar_url, occupation, followers_count, is_verified)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .neq('status', 'blocked')
      .order('created_at', { ascending: false })

    const accepted: ConnectionUser[] = []
    const pending: ConnectionUser[] = []

    for (const c of rawConns ?? []) {
      const isRequester = c.requester_id === user.id
      const otherProfile = isRequester
        ? (c.addressee as unknown as ConnectionUser['profile'])
        : (c.requester as unknown as ConnectionUser['profile'])

      const item: ConnectionUser = {
        connectionId: c.id,
        status: c.status,
        role: isRequester ? 'requester' : 'addressee',
        profile: otherProfile,
      }

      if (c.status === 'accepted') accepted.push(item)
      // Só pedidos RECEBIDOS (não os que eu enviei) ficam em pendingReceived
      else if (c.status === 'pending' && !isRequester) pending.push(item)
    }

    setConnections(accepted)
    setPendingReceived(pending)

    // IDs de todos os usuários já conectados ou com pedido
    const knownIds = new Set([
      user.id,
      ...(rawConns ?? []).map((c) =>
        c.requester_id === user.id ? c.addressee_id : c.requester_id,
      ),
    ])

    // Sugestões: perfis públicos mais populares fora das conexões existentes
    const { data: suggestData } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, occupation, followers_count, is_verified')
      .eq('is_active', true)
      .eq('profile_privacy', 'public')
      .not('id', 'in', `(${[...knownIds].join(',')})`)
      .order('followers_count', { ascending: false })
      .limit(10)

    setSuggestions(suggestData ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Enviar pedido de conexão
  async function sendRequest(addresseeId: string): Promise<void> {
    if (!user) return
    await supabase.from('connections').insert({
      requester_id: user.id,
      addressee_id: addresseeId,
    })
    await fetchAll()
  }

  // Aceitar pedido recebido
  async function acceptRequest(connectionId: string): Promise<void> {
    await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId)
    await fetchAll()
  }

  // Rejeitar ou cancelar pedido
  async function removeConnection(connectionId: string): Promise<void> {
    await supabase.from('connections').delete().eq('id', connectionId)
    await fetchAll()
  }

  return {
    connections,
    pendingReceived,
    suggestions,
    loading,
    refresh: fetchAll,
    sendRequest,
    acceptRequest,
    removeConnection,
  }
}
