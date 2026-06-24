import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, MessageSquarePlus, X, Users } from 'lucide-react'
import type { Conversation } from '@/hooks/useConversations'
import { useAuthStore } from '@/store/authStore'
import { usePresenceStore, STATUS_CONFIG, type PresenceStatus } from '@/store/presenceStore'
import { supabase } from '@/lib/supabase'
import { getInitials, formatRelativeTime, cn } from '@/lib/utils'
import type { Profile } from '@/lib/supabase'

type Connection = Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>

interface Props {
  conversations: Conversation[]
  loading: boolean
  activeUserId?: string
}

export default function ConversationList({ conversations, loading, activeUserId }: Props) {
  const [search,      setSearch]      = useState('')
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])
  const [connLoading, setConnLoading] = useState(false)
  const [connSearch,  setConnSearch]  = useState('')
  const { user } = useAuthStore()
  const { getStatus } = usePresenceStore()

  // Carrega conexões ao abrir o painel "Nova conversa"
  useEffect(() => {
    if (!newChatOpen || !user) return
    setConnLoading(true)
    supabase
      .from('connections')
      .select(`
        requester_id, addressee_id,
        requester:profiles!requester_id(id, username, full_name, avatar_url),
        addressee:profiles!addressee_id(id, username, full_name, avatar_url)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .limit(50)
      .then(({ data }) => {
        const list: Connection[] = (data ?? []).map((c) =>
          c.requester_id === user.id
            ? (c.addressee as unknown as Connection)
            : (c.requester as unknown as Connection),
        )
        setConnections(list)
        setConnLoading(false)
      })
  }, [newChatOpen, user])

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.otherProfile.full_name.toLowerCase().includes(q) ||
      c.otherProfile.username.toLowerCase().includes(q)
    )
  })

  const filteredConns = connections.filter((c) => {
    const q = connSearch.toLowerCase()
    return c.full_name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-4 pt-4 pb-3 border-b border-surface-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900">Mensagens</h2>
          <button
            type="button"
            onClick={() => setNewChatOpen(true)}
            title="Nova conversa"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-slate-700 transition-colors"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa…"
            className="input pl-9 text-sm py-2"
            aria-label="Buscar conversa"
          />
        </div>
      </div>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 bg-muted rounded animate-pulse w-28" />
                <div className="h-3 bg-muted rounded animate-pulse w-40" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-6">
            <Users className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {search ? 'Nenhuma conversa encontrada' : 'Nenhuma mensagem ainda'}
            </p>
            {!search && (
              <button
                type="button"
                onClick={() => setNewChatOpen(true)}
                className="mt-3 text-xs text-primary-600 hover:underline"
              >
                Iniciar uma conversa
              </button>
            )}
          </div>
        ) : (
          filtered.map((conv) => (
            <ConvItem
              key={conv.otherId}
              conv={conv}
              isActive={conv.otherId === activeUserId}
              status={getStatus(conv.otherId)}
            />
          ))
        )}
      </div>

      {/* Modal: Nova conversa */}
      {newChatOpen && (
        <div className="absolute inset-0 bg-surface z-20 flex flex-col">
          <div className="px-4 pt-4 pb-3 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => { setNewChatOpen(false); setConnSearch('') }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-semibold text-slate-900">Nova conversa</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={connSearch}
                autoFocus
                onChange={(e) => setConnSearch(e.target.value)}
                placeholder="Buscar conexão…"
                className="input pl-9 text-sm py-2"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {connLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 bg-muted rounded animate-pulse w-28" />
                    <div className="h-3 bg-muted rounded animate-pulse w-20" />
                  </div>
                </div>
              ))
            ) : filteredConns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                <Users className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {connSearch ? 'Nenhuma conexão encontrada' : 'Você ainda não tem conexões'}
                </p>
              </div>
            ) : (
              filteredConns.map((conn) => {
                const status = getStatus(conn.id)
                const cfg    = STATUS_CONFIG[status]
                return (
                  <Link
                    key={conn.id}
                    to={`/mensagens/${conn.id}`}
                    onClick={() => { setNewChatOpen(false); setConnSearch('') }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors"
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center overflow-hidden">
                        {conn.avatar_url
                          ? <img src={conn.avatar_url} alt={conn.full_name} className="w-full h-full object-cover" />
                          : getInitials(conn.full_name)
                        }
                      </div>
                      <span className={cn('absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface', cfg.dot)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{conn.full_name}</p>
                      <p className={cn('text-xs', cfg.color)}>{cfg.label}</p>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Item de conversa ─────────────────────────────────────────────────────────

function ConvItem({
  conv, isActive, status,
}: {
  conv: Conversation
  isActive: boolean
  status: PresenceStatus
}) {
  const { user } = useAuthStore()
  const isMine   = conv.lastMessage.sender_id === user?.id
  const cfg      = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.offline

  // Preview da última mensagem
  const preview = conv.lastMessage.content || '📎 Mídia'

  return (
    <Link
      to={`/mensagens/${conv.otherId}`}
      className={cn(
        'flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60',
        isActive && 'bg-primary-50 hover:bg-primary-50',
      )}
    >
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center overflow-hidden">
          {conv.otherProfile.avatar_url
            ? <img src={conv.otherProfile.avatar_url} alt={conv.otherProfile.full_name} className="w-full h-full object-cover" />
            : getInitials(conv.otherProfile.full_name)
          }
        </div>
        <span className={cn('absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface', cfg.dot)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className={cn('text-sm font-semibold truncate', isActive ? 'text-primary-700' : 'text-slate-900')}>
            {conv.otherProfile.full_name}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {formatRelativeTime(conv.lastMessage.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <p className={cn(
            'text-xs truncate flex-1',
            conv.unreadCount > 0 && !isMine ? 'text-slate-800 font-medium' : 'text-muted-foreground',
          )}>
            {isMine && <span className="mr-0.5">Você: </span>}
            {preview}
          </p>
          {conv.unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-primary-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0">
              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
