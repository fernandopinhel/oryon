import { NavLink } from 'react-router-dom'
import { useEffect } from 'react'
import {
  Home, Users, Layers, FolderKanban, MessageSquare, Settings, Compass,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { usePendingConnectionsStore } from '@/store/pendingConnectionsStore'
import { useUnreadMessagesStore } from '@/store/unreadMessagesStore'
import { getInitials, cn } from '@/lib/utils'

export default function Sidebar() {
  const { profile, user } = useAuthStore()
  const { count: pendingCount, fetch: fetchPending } = usePendingConnectionsStore()
  const { count: unreadMsgs } = useUnreadMessagesStore()

  useEffect(() => {
    if (user?.id) fetchPending(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const navItems = [
    { to: '/feed',        icon: Home,          label: 'Feed',       badge: 0 },
    { to: '/conexoes',    icon: Users,          label: 'Conexões',   badge: pendingCount },
    { to: '/grupos',      icon: Layers,         label: 'Grupos',     badge: 0 },
    { to: '/projetos',    icon: FolderKanban,   label: 'Projetos',   badge: 0 },
    { to: '/mensagens',   icon: MessageSquare,  label: 'Mensagens',  badge: unreadMsgs },
    { to: '/buscar',      icon: Compass,        label: 'Explorar',   badge: 0 },
  ]

  return (
    <div className="flex flex-col h-full p-3 gap-1">
      {/* Mini perfil */}
      <NavLink
        to={`/perfil/${profile?.username}`}
        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors mb-2"
      >
        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center overflow-hidden shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
          ) : (
            getInitials(profile?.full_name ?? 'U')
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate">{profile?.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">@{profile?.username}</p>
        </div>
      </NavLink>

      <div className="h-px bg-surface-border mb-2" />

      {/* Nav items */}
      {navItems.map(({ to, icon: Icon, label, badge }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-600 hover:bg-muted hover:text-slate-900',
            )
          }
        >
          <Icon className="w-5 h-5 shrink-0" />
          <span className="flex-1">{label}</span>
          {badge > 0 && (
            <span className="min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </NavLink>
      ))}

      <div className="mt-auto">
        <div className="h-px bg-surface-border mb-2" />
        <NavLink
          to="/configuracoes"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-600 hover:bg-muted hover:text-slate-900',
            )
          }
        >
          <Settings className="w-5 h-5 shrink-0" />
          Configurações
        </NavLink>
      </div>
    </div>
  )
}
