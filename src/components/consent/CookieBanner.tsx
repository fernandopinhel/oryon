import { useState } from 'react'
import { Cookie, ChevronDown, ChevronUp, Shield } from 'lucide-react'
import { useConsentStore, type ConsentPreferences } from '@/store/consentStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

function Toggle({ checked, onChange, id, label }: {
  checked: boolean; onChange: (v: boolean) => void; id: string; label: string
}) {
  return (
    <label htmlFor={id} className="cursor-pointer shrink-0" title={label}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
        aria-label={label}
      />
      <div className={cn(
        'relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2',
        checked ? 'bg-primary-500' : 'bg-slate-300',
      )}>
        <span className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )} />
      </div>
    </label>
  )
}

type View = 'banner' | 'preferences'

export default function CookieBanner() {
  const { session } = useAuthStore()
  const { status, preferences, acceptAll, rejectAll, savePreferences, reset } = useConsentStore()

  const [view,       setView]       = useState<View>('banner')
  const [localPrefs, setLocalPrefs] = useState<ConsentPreferences>(preferences)

  // Usuário logado: gerenciamento de cookies fica em Configurações → Dados & LGPD
  if (session) return null

  // Já decidiu: mostra botão flutuante no canto inferior direito
  if (status === 'decided') {
    return (
      <button
        type="button"
        onClick={() => { reset(); setView('banner') }}
        aria-label="Gerenciar preferências de cookies"
        title="Gerenciar cookies"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-surface border border-surface-border rounded-full shadow-md text-muted-foreground hover:text-slate-900 hover:shadow-lg transition-all"
      >
        <Cookie className="w-3.5 h-3.5" />
        Cookies
      </button>
    )
  }

  // Ainda não decidiu: mostra banner
  return (
    <div
      role="dialog"
      aria-label="Preferências de cookies"
      aria-modal="false"
      className="fixed z-50 bottom-4 right-4 max-w-sm w-[calc(100%-2rem)]"
    >
      <div className="bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Cookie className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-none">Cookies e privacidade</p>
              <p className="text-xs text-muted-foreground mt-0.5">Oryon respeita sua privacidade</p>
            </div>
          </div>
          {view === 'preferences' && (
            <button
              type="button"
              onClick={() => setView('banner')}
              className="p-1 text-muted-foreground hover:text-slate-700 rounded-lg"
              aria-label="Voltar para o banner"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Banner */}
        {view === 'banner' && (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Usamos cookies para melhorar sua experiência e analisar o uso da plataforma.
              Leia nossa{' '}
              <a
                href="/politica-de-privacidade"
                className="text-primary-600 hover:underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                política de privacidade
              </a>.
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={acceptAll} className="btn-primary w-full py-2 text-sm">
                Aceitar tudo
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={rejectAll} className="btn-secondary flex-1 py-2 text-sm">
                  Rejeitar
                </button>
                <button
                  type="button"
                  onClick={() => { setLocalPrefs(preferences); setView('preferences') }}
                  className="btn-secondary flex-1 py-2 text-sm flex items-center justify-center gap-1"
                >
                  Personalizar
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preferences */}
        {view === 'preferences' && (
          <div className="px-4 pb-4 space-y-3">
            <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-900">Essenciais</span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Autenticação, sessão e segurança. Sempre ativos.
                </p>
              </div>
              <Toggle id="consent-essential" checked label="Cookies essenciais (sempre ativos)" onChange={() => {}} />
            </div>

            <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-surface-border">
              <div className="flex-1">
                <label htmlFor="consent-analytics" className="text-sm font-medium text-slate-900 block mb-0.5 cursor-pointer">
                  Analytics
                </label>
                <p className="text-xs text-muted-foreground leading-snug">
                  Google Analytics e GTM para entender como o Oryon é usado. Dados anonimizados.
                </p>
              </div>
              <Toggle
                id="consent-analytics"
                label="Ativar analytics"
                checked={localPrefs.analytics}
                onChange={(v) => setLocalPrefs((p) => ({ ...p, analytics: v, heatmaps: v ? p.heatmaps : false }))}
              />
            </div>

            <div className={cn(
              'flex items-start justify-between gap-3 p-3 rounded-xl border border-surface-border',
              !localPrefs.analytics && 'opacity-50 pointer-events-none',
            )}>
              <div className="flex-1">
                <label htmlFor="consent-heatmaps" className="text-sm font-medium text-slate-900 block mb-0.5 cursor-pointer">
                  Heatmaps
                </label>
                <p className="text-xs text-muted-foreground leading-snug">
                  Hotjar — mapas de calor anônimos. Requer analytics ativo.
                </p>
              </div>
              <Toggle
                id="consent-heatmaps"
                label="Ativar heatmaps"
                checked={localPrefs.heatmaps}
                onChange={(v) => setLocalPrefs((p) => ({ ...p, heatmaps: v }))}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={rejectAll} className="btn-secondary flex-1 py-2 text-sm">
                Rejeitar tudo
              </button>
              <button type="button" onClick={() => savePreferences(localPrefs)} className="btn-primary flex-1 py-2 text-sm">
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
