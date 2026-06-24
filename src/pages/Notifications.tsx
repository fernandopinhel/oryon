import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'
import { getInitials, formatRelativeTime, cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  connection_request: 'enviou um pedido de conexão',
  connection_accepted:'aceitou sua conexão',
  post_reaction:      'reagiu ao seu post',
  post_comment:       'comentou no seu post',
  group_invite:       'te convidou para um grupo',
  project_invite:     'te adicionou a um projeto',
  message:            'enviou uma mensagem',
}

export default function Notifications() {
  const { user }                                        = useAuthStore()
  const { notifications, loading, unreadCount, fetch, markRead, markAllRead } = useNotificationStore()

  useEffect(() => {
    if (user) fetch(user.id)
  }, [user, fetch])

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Notificações</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => user && markAllRead(user.id)}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="card divide-y divide-surface-border overflow-hidden">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="font-medium text-slate-700">Sem notificações</p>
            <p className="text-sm text-muted-foreground mt-1">
              Quando alguém interagir com você, aparecerá aqui.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onRead={() => !n.read_at && markRead(n.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Item ────────────────────────────────────────────────────────────────────

function NotificationItem({
  notification: n,
  onRead,
}: {
  notification: ReturnType<typeof useNotificationStore.getState>['notifications'][number]
  onRead: () => void
}) {
  const isUnread = !n.read_at
  const label    = TYPE_LABELS[n.type] ?? n.message ?? n.type

  // Determina o link de destino baseado no tipo
  function getLink() {
    if (n.type === 'message' && n.actor)          return `/mensagens/${n.actor_id}`
    if (n.entity_type === 'post'    && n.entity_id) return `/feed`
    if (n.entity_type === 'group'   && n.entity_id) return `/grupos/${n.entity_id}`
    if (n.entity_type === 'project' && n.entity_id) return `/projetos/${n.entity_id}`
    if (n.actor?.username)                          return `/perfil/${n.actor.username}`
    return null
  }

  const link = getLink()
  const name = n.actor?.full_name ?? 'Oryon'

  const inner = (
    <div
      className={cn(
        'flex gap-3 p-4 transition-colors hover:bg-muted/50',
        isUnread && 'bg-primary-50/40',
      )}
      onClick={onRead}
    >
      {/* Avatar do ator */}
      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
        {n.actor?.avatar_url
          ? <img src={n.actor.avatar_url} alt={name} className="w-full h-full object-cover" />
          : getInitials(name)
        }
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 leading-snug">
          {n.actor && <span className="font-semibold">{name} </span>}
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelativeTime(n.created_at)}
        </p>
      </div>

      {/* Indicador de não lida */}
      {isUnread && (
        <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />
      )}
    </div>
  )

  if (link) {
    return <Link to={link}>{inner}</Link>
  }
  return <div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onRead()}>{inner}</div>
}
