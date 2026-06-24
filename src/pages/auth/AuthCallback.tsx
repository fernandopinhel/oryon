import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Tenta sessão já processada (token no hash já foi consumido pelo SDK)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/feed', { replace: true })
        return
      }

      // Fallback: aguarda o evento SIGNED_IN (OAuth ainda processando)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          navigate('/feed', { replace: true })
        } else if (event === 'SIGNED_OUT') {
          navigate('/login', { replace: true })
        }
      })

      return () => subscription.unsubscribe()
    })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Autenticando…</span>
      </div>
    </div>
  )
}
