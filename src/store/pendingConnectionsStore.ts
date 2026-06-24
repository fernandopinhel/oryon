import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface PendingConnectionsState {
  count: number
  fetch: (userId: string) => Promise<void>
  decrement: () => void
}

export const usePendingConnectionsStore = create<PendingConnectionsState>((set) => ({
  count: 0,

  fetch: async (userId) => {
    const { count } = await supabase
      .from('connections')
      .select('id', { count: 'exact', head: true })
      .eq('addressee_id', userId)
      .eq('status', 'pending')

    set({ count: count ?? 0 })
  },

  decrement: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}))
