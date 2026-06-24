import { useState, type FormEvent } from 'react'
import { Loader2, CheckCircle, Globe, Users, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import SettingsShell from '@/components/settings/SettingsShell'

type Privacy = 'public' | 'connections' | 'private'

const OPTIONS: { value: Privacy; label: string; desc: string; Icon: typeof Globe }[] = [
  { value: 'public',      label: 'Público',  desc: 'Qualquer pessoa',      Icon: Globe  },
  { value: 'connections', label: 'Conexões', desc: 'Suas conexões',        Icon: Users  },
  { value: 'private',     label: 'Privado',  desc: 'Somente você',         Icon: Lock   },
]

interface PrivacyRowProps {
  label: string
  value: Privacy
  onChange: (v: Privacy) => void
}

function PrivacyRow({ label, value, onChange }: PrivacyRowProps) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>
      <div className="flex gap-2">
        {OPTIONS.map(({ value: v, label: l, desc, Icon }) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-xs transition-colors',
              value === v
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-surface-border text-slate-600 hover:border-muted-foreground/30',
            )}
          >
            <Icon className={cn('w-4 h-4', value === v ? 'text-primary-600' : 'text-muted-foreground')} />
            <span className="font-medium">{l}</span>
            <span className={cn('text-[10px]', value === v ? 'text-primary-500' : 'text-muted-foreground')}>{desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function PrivacySettings() {
  const { user, profile, refreshProfile } = useAuthStore()

  const [profilePrivacy,     setProfilePrivacy]     = useState<Privacy>(profile?.profile_privacy     ?? 'public')
  const [postsPrivacy,       setPostsPrivacy]       = useState<Privacy>(profile?.posts_privacy       ?? 'public')
  const [connectionsPrivacy, setConnectionsPrivacy] = useState<Privacy>(profile?.connections_privacy ?? 'public')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaved(false)

    await supabase
      .from('profiles')
      .update({
        profile_privacy:     profilePrivacy,
        posts_privacy:       postsPrivacy,
        connections_privacy: connectionsPrivacy,
      })
      .eq('id', user.id)

    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <SettingsShell>
      <section className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-1">Visibilidade</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Controle quem pode ver suas informações. Alterações são aplicadas imediatamente.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <PrivacyRow
            label="Quem pode ver seu perfil"
            value={profilePrivacy}
            onChange={setProfilePrivacy}
          />
          <PrivacyRow
            label="Quem pode ver seus posts"
            value={postsPrivacy}
            onChange={setPostsPrivacy}
          />
          <PrivacyRow
            label="Quem pode ver suas conexões"
            value={connectionsPrivacy}
            onChange={setConnectionsPrivacy}
          />

          <div className="flex items-center gap-3 pt-2 border-t border-surface-border">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-5"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar preferências
            </button>

            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 animate-fade-in">
                <CheckCircle className="w-4 h-4" />
                Salvo!
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Informativo LGPD */}
      <section className="card p-5 bg-muted/40">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Suas configurações de privacidade não afetam obrigações legais de retenção de dados. Para exercer
          seus direitos de portabilidade ou eliminação, acesse{' '}
          <a href="/configuracoes/lgpd" className="text-primary-600 hover:underline font-medium">
            Dados & LGPD
          </a>.
        </p>
      </section>
    </SettingsShell>
  )
}
