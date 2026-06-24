import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Profile } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Conversation {
  otherId: string
  otherProfile: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>
  lastMessage: {
    id: string
    content: string
    sender_id: string
    created_at: string
    read_at: string | null
  }
  unreadCount: number
}

interface RawDM {
  id: string
  content: string
  created_at: string
  read_at: string | null
  sender_id: string
  recipient_id: string
  sender: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>
  recipient: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>
}

function buildList(messages: RawDM[], userId: string): Conversation[] {
  const seen = new Map<string, Conversation>()

  for (const msg of messages) {
    const isSender = msg.sender_id === userId
    const otherId  = isSender ? msg.recipient_id : msg.sender_id
    const other    = isSender ? msg.recipient    : msg.sender

    if (!seen.has(otherId)) {
      seen.set(otherId, {
        otherId,
        otherProfile: other,
        lastMessage: {
          id:         msg.id,
          content:    msg.content,
          sender_id:  msg.sender_id,
          created_at: msg.created_at,
          read_at:    msg.read_at,
        },
        unreadCount: 0,
      })
    }

    if (msg.recipient_id === userId && !msg.read_at) {
      seen.get(otherId)!.unreadCount++
    }
  }

  return Array.from(seen.values())
}

export function useConversations() {
  const { user }                           = useAuthStore()
  const [conversations, setConversations]  = useState<Conversation[]>([])
  const [loading, setLoading]              = useState(true)
  const channelRef                         = useRef<RealtimeChannel | null>(null)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('direct_messages')
      .select(`
        id, content, created_at, read_at, sender_id, recipient_id,
        sender:profiles!sender_id(id, username, full_name, avatar_url),
        recipient:profiles!recipient_id(id, username, full_name, avatar_url)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(300)

    if (data) setConversations(buildList(data as unknown as RawDM[], user.id))
    setLoading(false)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  // Realtime: novo incoming → refresca lista
  useEffect(() => {
    if (!user) return

    channelRef.current = supabase
      .channel(`conv-list:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${user.id}` },
        () => { refresh() },
      )
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [user, refresh])

  // Chamado quando enviamos uma mensagem — atualiza preview sem refetch
  function updateLastMessage(
    msg: { id: string; content: string; sender_id: string; created_at: string; read_at: string | null },
    otherId: string,
    otherProfile: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>,
  ) {
    const lm = { id: msg.id, content: msg.content, sender_id: msg.sender_id, created_at: msg.created_at, read_at: msg.read_at }
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.otherId === otherId)
      if (idx !== -1) {
        const updated = { ...prev[idx], lastMessage: lm }
        return [updated, ...prev.filter((_, i) => i !== idx)]
      }
      return [{ otherId, otherProfile, lastMessage: lm, unreadCount: 0 }, ...prev]
    })
  }

  // Zera badge de não-lidas ao abrir a conversa
  function markConversationRead(otherId: string) {
    setConversations((prev) =>
      prev.map((c) => (c.otherId === otherId ? { ...c, unreadCount: 0 } : c)),
    )
  }

  return { conversations, loading, refresh, updateLastMessage, markConversationRead }
}
