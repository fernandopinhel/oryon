import { create } from 'zustand'
import { type Session, type User } from '@supabase/supabase-js'
import { supabase, type Profile } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean

  // Actions
  initialize: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGitHub: () => Promise<void>
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  acceptLgpd: (version: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    // Recupera sessão existente
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      set({ session, user: session.user })
      await get().refreshProfile()
    }

    set({ initialized: true })

    // Escuta mudanças de auth em tempo real
    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null })
      if (session) {
        await get().refreshProfile()
      } else {
        set({ profile: null })
      }
    })
  },

  signInWithEmail: async (email, password) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } finally {
      set({ loading: false })
    }
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) throw error
  },

  signInWithGitHub: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  },

  signUpWithEmail: async (email, password, fullName) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null })
  },

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!error && data) {
      set({ profile: data as Profile })
    }
  },

  acceptLgpd: async (version) => {
    const { user } = get()
    if (!user) throw new Error('Usuário não autenticado')

    const now = new Date().toISOString()

    // Registra o consentimento
    const { error: consentError } = await supabase.from('lgpd_consents').insert({
      user_id: user.id,
      version,
      consent_type: 'terms_and_privacy',
    })
    if (consentError) throw consentError

    // Atualiza o perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ lgpd_accepted_at: now, lgpd_version: version })
      .eq('id', user.id)
    if (profileError) throw profileError

    await get().refreshProfile()
  },
}))
