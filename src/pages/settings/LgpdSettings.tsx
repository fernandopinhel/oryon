import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Trash2, Loader2, AlertTriangle, CheckCircle, FileText, Shield, Cookie, BarChart2, MousePointer2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import SettingsShell from '@/components/settings/SettingsShell'
import { useConsentStore, type ConsentPreferences } from '@/store/consentStore'

interface Consent {
  id: string
  version: string
  consent_type: string
  created_at: string
}

const LGPD_RIGHTS = [
  'Confirmação da existência de tratamento (Art. 18, I)',
  'Acesso aos dados (Art. 18, II)',
  'Correção de dados incompletos ou desatualizados (Art. 18, IV)',
  'Portabilidade dos dados (Art. 18, V)',
  'Eliminação dos dados tratados com consentimento (Art. 18, VI)',
  'Revogação do consentimento (Art. 18, IX)',
]

function CookieToggle({ checked, onChange, id, label }: {
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

export default function LgpdSettings() {
  const { user, profile, signOut } = useAuthStore()
  const navigate                    = useNavigate()
  const { preferences, status, acceptAll, rejectAll, savePreferences } = useConsentStore()

  const [consents,    setConsents]    = useState<Consent[]>([])
  const [exporting,   setExporting]   = useState(false)
  const [exported,    setExported]    = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting,    setDeleting]    = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [localPrefs,  setLocalPrefs]  = useState<ConsentPreferences>(preferences)
  const [cookieSaved, setCookieSaved] = useState(false)

  function handleSaveCookies() {
    savePreferences(localPrefs)
    setCookieSaved(true)
    setTimeout(() => setCookieSaved(false), 3000)
  }

  useEffect(() => {
    if (!user) return
    supabase
      .from('lgpd_consents')
      .select('id, version, consent_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setConsents(data as Consent[]) })
  }, [user])

  // ── Exportar dados ────────────────────────────────────────────────────────

  async function handleExport() {
    if (!user) return
    setExporting(true)

    // Coleta todos os dados do usuário em paralelo
    const [profileRes, postsRes, reactionsRes, connectionsRes, groupsRes, projectsRes, messagesRes, consentsRes] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('posts').select('*').eq('author_id', user.id),
        supabase.from('reactions').select('*').eq('user_id', user.id),
        supabase.from('connections').select('*').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
        supabase.from('group_members').select('user_id, role, joined_at, group:groups(id, name)').eq('user_id', user.id),
        supabase.from('project_members').select('user_id, role, joined_at, project:projects(id, title)').eq('user_id', user.id),
        supabase.from('direct_messages').select('id, content, created_at, read_at, sender_id, recipient_id')
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`),
        supabase.from('lgpd_consents').select('*').eq('user_id', user.id),
      ])

    const payload = {
      exportedAt:         new Date().toISOString(),
      requestedBy:        user.email,
      legalBasis:         'Art. 18, III — Direito à portabilidade dos dados (LGPD)',
      profile:            profileRes.data,
      posts:              postsRes.data         ?? [],
      reactions:          reactionsRes.data     ?? [],
      connections:        connectionsRes.data   ?? [],
      groupMemberships:   groupsRes.data        ?? [],
      projectMemberships: projectsRes.data      ?? [],
      directMessages:     messagesRes.data      ?? [],
      lgpdConsents:       consentsRes.data      ?? [],
    }

    const blob     = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url      = URL.createObjectURL(blob)
    const anchor   = document.createElement('a')
    anchor.href    = url
    anchor.download = `oryon-meus-dados-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)

    setExporting(false)
    setExported(true)
    setTimeout(() => setExported(false), 5000)
  }

  // ── Excluir conta ─────────────────────────────────────────────────────────

  async function handleDelete() {
    if (deleteInput !== 'EXCLUIR' || !user) return
    setDeleting(true)
    setDeleteError(null)

    const { error } = await supabase.functions.invoke('user-delete', {
      body: { confirm: true },
    })

    if (error) {
      setDeleteError('Não foi possível excluir a conta. Tente novamente ou entre em contato com o suporte.')
      setDeleting(false)
      return
    }

    await signOut()
    navigate('/login')
  }

  return (
    <SettingsShell>
      {/* Seus direitos */}
      <section className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary-600" />
          <h2 className="font-semibold text-slate-900">Seus direitos (LGPD)</h2>
        </div>
        <ul className="space-y-1.5">
          {LGPD_RIGHTS.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      </section>

      {/* Consentimento atual */}
      <section className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-primary-600" />
          <h2 className="font-semibold text-slate-900">Seu consentimento</h2>
        </div>

        {profile?.lgpd_accepted_at ? (
          <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl mb-4">
            <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800">
                Termos aceitos — versão {profile.lgpd_version}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Aceito em {new Date(profile.lgpd_accepted_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">Nenhum consentimento registrado.</p>
          </div>
        )}

        {consents.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Histórico
            </h3>
            <div className="space-y-0">
              {consents.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 border-b border-surface-border last:border-0 text-xs text-muted-foreground"
                >
                  <span>Versão {c.version} — {c.consent_type.replace(/_/g, ' ')}</span>
                  <span>{new Date(c.created_at).toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Exportar dados */}
      <section className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-1">Exportar meus dados</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Você tem o direito de receber uma cópia de todos os seus dados pessoais (Art. 18, III, LGPD).
          O arquivo JSON incluirá perfil, posts, reações, conexões, grupos, projetos e mensagens.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary flex items-center gap-2 px-5"
          >
            {exporting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />
            }
            {exporting ? 'Preparando…' : 'Baixar meus dados'}
          </button>

          {exported && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              Exportado!
            </span>
          )}
        </div>
      </section>

      {/* Cookies e Telemetria */}
      <section className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Cookie className="w-4 h-4 text-primary-600" />
          <h2 className="font-semibold text-slate-900">Cookies e Telemetria</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Controle quais ferramentas de análise podem coletar dados durante o uso do Oryon.
          Você pode alterar sua escolha a qualquer momento — sem nenhuma penalidade.
        </p>

        <div className="space-y-3">
          {/* Essenciais */}
          <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-muted/50">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-sm font-medium text-slate-900">Cookies essenciais</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Sempre ativo</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Necessários para autenticação, manutenção de sessão e segurança da conta.
                Não podem ser desativados pois o sistema não funciona sem eles.
              </p>
            </div>
            <CookieToggle id="lgpd-essential" checked label="Cookies essenciais (sempre ativos)" onChange={() => {}} />
          </div>

          {/* Analytics */}
          <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-surface-border">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <BarChart2 className="w-3.5 h-3.5 text-primary-600" />
                <label htmlFor="lgpd-analytics" className="text-sm font-medium text-slate-900 cursor-pointer">
                  Analytics — Google Analytics (GA4) e GTM
                </label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-slate-600">O que coleta:</strong> páginas visitadas, tempo de sessão, tipo de dispositivo e localização aproximada (cidade).<br />
                <strong className="text-slate-600">Por que usamos:</strong> entender quais funcionalidades são mais usadas para melhorar o produto.<br />
                <strong className="text-slate-600">Garantia:</strong> dados anonimizados, nunca vendidos a terceiros. Você pode revogar a qualquer momento.
              </p>
            </div>
            <CookieToggle
              id="lgpd-analytics"
              label="Ativar Google Analytics"
              checked={localPrefs.analytics}
              onChange={(v) => setLocalPrefs((p) => ({ ...p, analytics: v, heatmaps: v ? p.heatmaps : false }))}
            />
          </div>

          {/* Heatmaps */}
          <div className={cn(
            'flex items-start justify-between gap-3 p-3 rounded-xl border border-surface-border transition-opacity',
            !localPrefs.analytics && 'opacity-50 pointer-events-none',
          )}>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <MousePointer2 className="w-3.5 h-3.5 text-violet-600" />
                <label htmlFor="lgpd-heatmaps" className={cn('text-sm font-medium cursor-pointer', localPrefs.analytics ? 'text-slate-900' : 'text-muted-foreground')}>
                  Heatmaps — Hotjar
                </label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-slate-600">O que coleta:</strong> onde você clica, até onde rola a página e gravações anônimas de sessão.<br />
                <strong className="text-slate-600">Por que usamos:</strong> identificar dificuldades de uso na interface e otimizar a experiência visual.<br />
                <strong className="text-slate-600">Garantia:</strong> campos de formulário e senhas são automaticamente mascarados. Requer analytics ativo.
              </p>
            </div>
            <CookieToggle
              id="lgpd-heatmaps"
              label="Ativar Hotjar"
              checked={localPrefs.heatmaps}
              onChange={(v) => setLocalPrefs((p) => ({ ...p, heatmaps: v }))}
            />
          </div>
        </div>

        {/* Status atual */}
        {status === 'decided' && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-muted/40 text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            Preferência atual: analytics {preferences.analytics ? 'ativo' : 'inativo'} · heatmaps {preferences.heatmaps ? 'ativo' : 'inativo'}
          </div>
        )}

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-surface-border">
          <button
            type="button"
            onClick={() => { rejectAll(); setLocalPrefs({ analytics: false, heatmaps: false }) }}
            className="btn-secondary px-4 text-sm"
          >
            Rejeitar tudo
          </button>
          <button
            type="button"
            onClick={() => { acceptAll(); setLocalPrefs({ analytics: true, heatmaps: true }) }}
            className="btn-secondary px-4 text-sm"
          >
            Aceitar tudo
          </button>
          <button
            type="button"
            onClick={handleSaveCookies}
            className="btn-primary px-5 text-sm flex items-center gap-2"
          >
            Salvar preferências
          </button>
          {cookieSaved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              Salvo!
            </span>
          )}
        </div>
      </section>

      {/* Excluir conta */}
      <section className="card p-5 border border-red-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="font-semibold text-red-700">Excluir minha conta</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Esta ação é <strong>irreversível</strong>. Todos os seus dados pessoais serão permanentemente
          removidos, em cumprimento ao direito de eliminação (Art. 18, VI, LGPD). Antes de prosseguir,
          recomendamos exportar seus dados.
        </p>

        <div className="bg-red-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-red-800">
            Para confirmar, digite{' '}
            <code className="font-bold bg-red-100 px-1.5 py-0.5 rounded tracking-wide">EXCLUIR</code>{' '}
            abaixo:
          </p>

          <input
            type="text"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            className="input text-sm"
            placeholder="EXCLUIR"
            aria-label="Confirmação de exclusão — digite EXCLUIR"
            autoComplete="off"
            spellCheck={false}
          />

          {deleteError && (
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {deleteError}
            </p>
          )}

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteInput !== 'EXCLUIR' || deleting}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-colors',
              deleteInput === 'EXCLUIR' && !deleting
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-200 text-red-400 cursor-not-allowed',
            )}
          >
            {deleting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Trash2 className="w-4 h-4" />
            }
            Excluir minha conta permanentemente
          </button>
        </div>
      </section>
    </SettingsShell>
  )
}
