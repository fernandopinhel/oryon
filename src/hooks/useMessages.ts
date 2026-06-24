import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Profile } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface DirectMessage {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  media_url:  string | null
  media_name: string | null
  media_mime: string | null
  media_size: number | null
  read_at: string | null
  created_at: string
  sender: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>
}

export function useMessages(otherId: string) {
  const { user }                    = useAuthStore()
  const [messages, setMessages]     = useState<DirectMessage[]>([])
  const [loading,  setLoading]      = useState(true)
  const [sending,  setSending]      = useState(false)
  const channelRef                  = useRef<RealtimeChannel | null>(null)

  const fetch = useCallback(async () => {
    if (!user || !otherId) return
    setLoading(true)

    const { data } = await supabase
      .from('direct_messages')
      .select(`
        id, sender_id, recipient_id, content,
        media_url, media_name, media_mime, media_size,
        read_at, created_at,
        sender:profiles!sender_id(id, username, full_name, avatar_url)
      `)
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),` +
        `and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`,
      )
      .order('created_at', { ascending: true })
      .limit(100)

    if (data) {
      setMessages(data as unknown as DirectMessage[])

      // Marca mensagens recebidas como lidas (fire-and-forget)
      supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('sender_id', otherId)
        .is('read_at', null)
        .then(({ error }) => {
          if (!error) {
            setMessages((prev) =>
              prev.map((m) =>
                m.recipient_id === user.id && m.sender_id === otherId && !m.read_at
                  ? { ...m, read_at: new Date().toISOString() }
                  : m,
              ),
            )
          }
        })
    }

    setLoading(false)
  }, [user, otherId])

  useEffect(() => { fetch() }, [fetch])

  // Realtime: mensagens incoming desta conversa
  useEffect(() => {
    if (!user || !otherId) return

    channelRef.current = supabase
      .channel(`dm:${user.id}:${otherId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          const msg = payload.new as DirectMessage
          if (msg.sender_id !== otherId) return

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })

          // Marcar como lida imediatamente (estamos na conversa)
          supabase
            .from('direct_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', msg.id)
            .then(({ error }) => {
              if (!error) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msg.id ? { ...m, read_at: new Date().toISOString() } : m,
                  ),
                )
              }
            })
        },
      )
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [user, otherId])

  async function sendMessage(
    content: string,
    media?: { url: string; name: string; mime: string; size: number },
  ): Promise<DirectMessage | null> {
    if (!user || (!content.trim() && !media) || sending) return null
    setSending(true)

    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id:    user.id,
        recipient_id: otherId,
        content:      content.trim() || '',
        media_url:    media?.url  ?? null,
        media_name:   media?.name ?? null,
        media_mime:   media?.mime ?? null,
        media_size:   media?.size ?? null,
      })
      .select(`
        id, sender_id, recipient_id, content,
        media_url, media_name, media_mime, media_size,
        read_at, created_at,
        sender:profiles!sender_id(id, username, full_name, avatar_url)
      `)
      .single()

    setSending(false)
    if (error || !data) return null

    const msg = data as unknown as DirectMessage
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg]
    })

    return msg
  }

  return { messages, loading, sending, sendMessage }
}
