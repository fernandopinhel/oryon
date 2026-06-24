import { useState, type FormEvent, type ChangeEvent } from 'react'
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import SettingsShell from '@/components/settings/SettingsShell'
import { useThemeStore } from '@/store/themeStore'

function Feedback({ type, text }: { type: 'ok' | 'err'; text: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2 text-sm rounded-lg px-3 py-2',
      type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
    )}>
      {type === 'ok'
        ? <CheckCircle className="w-4 h-4 shrink-0" />
        : <AlertCircle className="w-4 h-4 shrink-0" />
      }
      {text}
    </div>
  )
}

export default function AccountSettings() {
  const { user, profile, refreshProfile } = useAuthStore()
  const { theme, setTheme } = useThemeStore()

  // ── Informações pessoais ──────────────────────────────────────────────────
  const [fullName,   setFullName]   = useState(profile?.full_name ?? '')
  const [username,   setUsername]   = useState(profile?.username  ?? '')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMsg,    setInfoMsg]    = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function handleSaveInfo(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSavingInfo(true)
    setInfoMsg(null)

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), username: username.trim() })
      .eq('id', user.id)

    if (error) {
      const isUnique = error.message.includes('profiles_username_key')
      setInfoMsg({ type: 'err', text: isUnique ? 'Este nome de usuário já está em uso.' : error.message })
    } else {
      await refreshProfile()
      setInfoMsg({ type: 'ok', text: 'Informações atualizadas!' })
    }
    setSavingInfo(false)
  }

  // ── Alterar senha ─────────────────────────────────────────────────────────
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd,    setShowPwd]    = useState(false)
  const [savingPwd,  setSavingPwd]  = useState(false)
  const [pwdMsg,     setPwdMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'err', text: 'As senhas não coincidem.' })
      return
    }
    if (newPwd.length < 8) {
      setPwdMsg({ type: 'err', text: 'A senha deve ter pelo menos 8 caracteres.' })
      return
    }
    setSavingPwd(true)
    setPwdMsg(null)

    const { error } = await supabase.auth.updateUser({ password: newPwd })

    if (error) {
      setPwdMsg({ type: 'err', text: error.message })
    } else {
      setNewPwd('')
      setConfirmPwd('')
      setPwdMsg({ type: 'ok', text: 'Senha alterada com sucesso!' })
    }
    setSavingPwd(false)
  }

  return (
    <SettingsShell>
      {/* Informações pessoais */}
      <section className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Informações pessoais</h2>

        <form onSubmit={handleSaveInfo} className="space-y-4">
          <div>
            <label htmlFor="full-name" className="block text-sm font-medium text-slate-700 mb-1">
              Nome completo
            </label>
            <input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
              className="input"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label htmlFor="acc-username" className="block text-sm font-medium text-slate-700 mb-1">
              Nome de usuário
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
              <input
                id="acc-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                className="input pl-7"
                maxLength={30}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Apenas letras minúsculas, números, pontos e underlines.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              value={user?.email ?? ''}
              readOnly
              className="input bg-muted/50 cursor-not-allowed text-muted-foreground"
              aria-label="E-mail (somente leitura)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Para alterar o e-mail, entre em contato com o suporte.
            </p>
          </div>

          {infoMsg && <Feedback {...infoMsg} />}

          <button type="submit" disabled={savingInfo} className="btn-primary flex items-center gap-2 px-5">
            {savingInfo && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar alterações
          </button>
        </form>
      </section>

      {/* Aparência */}
      <section className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-1">Aparência</h2>
        <p className="text-sm text-muted-foreground mb-4">Escolha entre o tema claro ou escuro.</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={cn(
              'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors',
              theme === 'light'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-surface-border hover:border-muted-foreground/40 text-slate-600',
            )}
          >
            <Sun className="w-6 h-6" />
            <span className="text-sm font-medium">Claro</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={cn(
              'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors',
              theme === 'dark'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-surface-border hover:border-muted-foreground/40 text-slate-600',
            )}
          >
            <Moon className="w-6 h-6" />
            <span className="text-sm font-medium">Escuro</span>
          </button>
        </div>
      </section>

      {/* Alterar senha */}
      <section className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-1">Alterar senha</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Aplicável apenas a contas com login por e-mail e senha.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1">
              Nova senha
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPwd ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="input pr-10"
                minLength={8}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700 transition-colors"
                aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
              Confirmar nova senha
            </label>
            <input
              id="confirm-password"
              type={showPwd ? 'text' : 'password'}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className="input"
              placeholder="Repita a nova senha"
            />
          </div>

          {pwdMsg && <Feedback {...pwdMsg} />}

          <button
            type="submit"
            disabled={savingPwd || !newPwd}
            className="btn-primary flex items-center gap-2 px-5"
          >
            {savingPwd && <Loader2 className="w-4 h-4 animate-spin" />}
            Alterar senha
          </button>
        </form>
      </section>
    </SettingsShell>
  )
}
