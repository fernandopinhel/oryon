import { create } from 'zustand'
import { supabase, type Notification } from '@/lib/supabase'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  fetch: (userId: string) => Promise<void>
  markAllRead: (userId: string) => Promise<void>
  markRead: (id: string) => Promise<void>
  subscribe: (userId: string) => () => void
}

export const useNotificationStore = create<NotificationState>((set, _get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetch: async (userId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:actor_id(username, full_name, avatar_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      const notifications = data as Notification[]
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.read_at).length,
        loading: false,
      })
    } else {
      set({ loading: false })
    }
  },

  markRead: async (id) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)

    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
  },

  markAllRead: async (userId) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)

    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        read_at: n.read_at ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    }))
  },

  // Escuta novas notificações via Supabase Realtime
  subscribe: (userId) => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification
          set((state) => ({
            notifications: [newNotif, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          }))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },
}))
