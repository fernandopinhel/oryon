import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

export const STATUS_CONFIG: Record<PresenceStatus, { label: string; color: string; dot: string }> = {
  online:  { label: 'Online',   color: 'text-emerald-600', dot: 'bg-emerald-500' },
  away:    { label: 'Ausente',  color: 'text-amber-600',   dot: 'bg-amber-400'   },
  busy:    { label: 'Ocupado',  color: 'text-red-600',     dot: 'bg-red-500'     },
  offline: { label: 'Offline',  color: 'text-slate-400',   dot: 'bg-slate-300'   },
}

interface PresenceState {
  myStatus:  PresenceStatus
  presence:  Record<string, PresenceStatus>   // userId → status
  channel:   RealtimeChannel | null

  init:      (userId: string) => void
  setStatus: (status: PresenceStatus) => void
  cleanup:   () => void
  getStatus: (userId: string) => PresenceStatus
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  myStatus: 'online',
  presence: {},
  channel:  null,

  init: (userId: string) => {
    const existing = get().channel
    if (existing) existing.unsubscribe()

    const channel = supabase.channel('oryon:presence', {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ status: PresenceStatus }>()
        const map: Record<string, PresenceStatus> = {}
        for (const [uid, entries] of Object.entries(state)) {
          map[uid] = entries[0]?.status ?? 'online'
        }
        set({ presence: map })
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const status = (newPresences as unknown as Array<{ status: PresenceStatus }>)[0]?.status ?? 'online'
        set((s) => ({ presence: { ...s.presence, [key]: status } }))
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        set((s) => {
          const next = { ...s.presence }
          delete next[key]
          return { presence: next }
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ status: get().myStatus })
        }
      })

    set({ channel })
  },

  setStatus: async (status: PresenceStatus) => {
    set({ myStatus: status })
    await get().channel?.track({ status })
  },

  cleanup: () => {
    get().channel?.unsubscribe()
    set({ channel: null, presence: {} })
  },

  getStatus: (userId: string): PresenceStatus => {
    return get().presence[userId] ?? 'offline'
  },
}))
