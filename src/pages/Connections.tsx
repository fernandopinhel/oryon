import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus, UserCheck, UserX, Users, Sparkles, BadgeCheck } from 'lucide-react'
import { useConnections, type ConnectionUser } from '@/hooks/useConnections'
import { usePendingConnectionsStore } from '@/store/pendingConnectionsStore'
import { useAuthStore } from '@/store/authStore'
import { getInitials, cn } from '@/lib/utils'
import type { Profile } from '@/lib/supabase'

type Tab = 'connections' | 'pending' | 'suggestions'

export default function Connections() {
  const {
    connections, pendingReceived, suggestions,
    loading, sendRequest, acceptRequest, removeConnection,
  } = useConnections()

  const { user } = useAuthStore()
  const { fetch: fetchPending } = usePendingConnectionsStore()

  const [activeTab, setActiveTab] = useState<Tab>('connections')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'connections', label: 'Conexões',  count: connections.length },
    { key: 'pending',     label: 'Pedidos',   count: pendingReceived.length },
    { key: 'suggestions', label: 'Sugeridos' },
  ]

  const filteredConnections = connections.filter((c) =>
    !query ||
    c.profile.full_name.toLowerCase().includes(query.toLowerCase()) ||
    c.profile.username.toLowerCase().includes(query.toLowerCase()),
  )

  async function handleAccept(conn: ConnectionUser) {
    setBusyId(conn.connectionId)
    await acceptRequest(conn.connectionId)
    if (user?.id) fetchPending(user.id)
    setBusyId(null)
  }

  async function handleRemove(conn: ConnectionUser) {
    setBusyId(conn.connectionId)
    await removeConnection(conn.connectionId)
    if (user?.id && activeTab === 'pending') fetchPending(user.id)
    setBusyId(null)
  }

  async function handleSendRequest(userId: string) {
    setBusyId(userId)
    await sendRequest(userId)
    setBusyId(null)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Conexões</h1>

      {/* Tabs */}
      <div className="card">
        <div className="flex overflow-x-auto border-b border-surface-border">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-muted-foreground hover:text-slate-700',
              )}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                  activeTab === key
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-muted text-muted-foreground',
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Busca (só na aba conexões) */}
        {activeTab === 'connections' && (
          <div className="p-3 border-b border-surface-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar nas suas conexões…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input pl-9 text-sm"
                aria-label="Buscar conexões"
              />
            </div>
          </div>
        )}

        {/* Conteúdo da aba */}
        <div className="divide-y divide-surface-border">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-36" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
              </div>
            ))
          ) : activeTab === 'connections' ? (
            filteredConnections.length === 0 ? (
              <EmptyState
                icon={Users}
                title={query ? 'Nenhum resultado' : 'Sem conexões ainda'}
                desc={query ? 'Tente outro nome.' : 'Explore o Oryon e conecte-se com pessoas.'}
              />
            ) : (
              filteredConnections.map((conn) => (
                <ConnectionCard
                  key={conn.connectionId}
                  profile={conn.profile}
                  busy={busyId === conn.connectionId}
                  actions={
                    <button
                      type="button"
                      onClick={() => handleRemove(conn)}
                      disabled={busyId === conn.connectionId}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  }
                />
              ))
            )
          ) : activeTab === 'pending' ? (
            pendingReceived.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="Nenhum pedido pendente"
                desc="Quando alguém te enviar um pedido de conexão, aparecerá aqui."
              />
            ) : (
              pendingReceived.map((conn) => (
                <ConnectionCard
                  key={conn.connectionId}
                  profile={conn.profile}
                  busy={busyId === conn.connectionId}
                  actions={
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => handleAccept(conn)}
                        disabled={busyId === conn.connectionId}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <UserCheck className="w-3.5 h-3.5 shrink-0" />
                        Aceitar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(conn)}
                        disabled={busyId === conn.connectionId}
                        className="btn-secondary text-xs px-3 py-1.5 whitespace-nowrap"
                      >
                        Recusar
                      </button>
                    </div>
                  }
                />
              ))
            )
          ) : (
            /* Sugestões */
            suggestions.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Sem sugestões no momento"
                desc="Conecte-se com mais pessoas para receber sugestões relevantes."
              />
            ) : (
              suggestions.map((profile) => (
                <ConnectionCard
                  key={profile.id}
                  profile={profile}
                  busy={busyId === profile.id}
                  actions={
                    <button
                      type="button"
                      onClick={() => handleSendRequest(profile.id)}
                      disabled={busyId === profile.id}
                      className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Conectar
                    </button>
                  }
                />
              ))
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Sub-componentes locais
// ──────────────────────────────────────────────

type ProfileSnippet = Pick<
  Profile,
  'id' | 'username' | 'full_name' | 'avatar_url' | 'occupation' | 'followers_count' | 'is_verified'
>

function ConnectionCard({
  profile,
  actions,
  busy,
}: {
  profile: ProfileSnippet
  actions: React.ReactNode
  busy: boolean
}) {
  return (
    <div className={cn('flex items-center gap-3 p-4 transition-opacity', busy && 'opacity-60')}>
      <Link to={`/perfil/${profile.username}`} className="shrink-0">
        <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center overflow-hidden">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
          ) : (
            getInitials(profile.full_name)
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={`/perfil/${profile.username}`}
          className="flex items-center gap-1 hover:text-primary-600 transition-colors"
        >
          <span className="font-semibold text-sm text-slate-900 truncate">{profile.full_name}</span>
          {profile.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary-500 shrink-0" />}
        </Link>
        <p className="text-xs text-muted-foreground truncate">
          @{profile.username}
          {profile.occupation && ` · ${profile.occupation}`}
        </p>
      </div>

      <div className="shrink-0">{actions}</div>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType
  title: string
  desc: string
}) {
  return (
    <div className="py-14 text-center px-4">
      <Icon className="w-9 h-9 text-muted-foreground mx-auto mb-3" />
      <p className="font-semibold text-slate-900 mb-1">{title}</p>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}
