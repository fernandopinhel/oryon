import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UnreadMessagesState {
  count:    number
  channel:  RealtimeChannel | null

  fetch:    (userId: string) => Promise<void>
  reset:    () => void
  init:     (userId: string) => void
  cleanup:  () => void
}

export const useUnreadMessagesStore = create<UnreadMessagesState>((set, get) => ({
  count:   0,
  channel: null,

  fetch: async (userId: string) => {
    const { count } = await supabase
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null)
    set({ count: count ?? 0 })
  },

  reset: () => set({ count: 0 }),

  init: (userId: string) => {
    const existing = get().channel
    if (existing) existing.unsubscribe()

    get().fetch(userId)

    const channel = supabase
      .channel(`unread-dm:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${userId}` },
        () => get().fetch(userId),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${userId}` },
        () => get().fetch(userId),
      )
      .subscribe()

    set({ channel })
  },

  cleanup: () => {
    get().channel?.unsubscribe()
    set({ channel: null, count: 0 })
  },
}))
