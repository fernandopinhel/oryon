import { NavLink } from 'react-router-dom'
import { Home, Users, FolderKanban, MessageSquare, Compass } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { usePendingConnectionsStore } from '@/store/pendingConnectionsStore'
import { useUnreadMessagesStore } from '@/store/unreadMessagesStore'
import { cn } from '@/lib/utils'

const ITEMS = [
  { to: '/feed',        icon: Home,          label: 'Feed',      type: 'none'        as const },
  { to: '/conexoes',    icon: Users,         label: 'Conexões',  type: 'connections' as const },
  { to: '/buscar',      icon: Compass,       label: 'Explorar',  type: 'none'        as const },
  { to: '/projetos',    icon: FolderKanban,  label: 'Projetos',  type: 'none'        as const },
  { to: '/mensagens',   icon: MessageSquare, label: 'Mensagens', type: 'messages'    as const },
]

export default function MobileNav() {
  const { user } = useAuthStore()
  const { count: pendingCount } = usePendingConnectionsStore()
  const { count: unreadMsgs }   = useUnreadMessagesStore()

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-surface-border flex safe-bottom">
      {ITEMS.map(({ to, icon: Icon, label, type }) => {
        const badgeCount =
          !user ? 0
          : type === 'connections' ? pendingCount
          : type === 'messages'    ? unreadMsgs
          : 0

        return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary-600' : 'text-slate-500',
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
                  {badgeCount > 0 && (
                    <span className={cn(
                      'absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 text-white text-[9px] font-bold rounded-full flex items-center justify-center',
                      type === 'messages' ? 'bg-primary-500' : 'bg-red-500',
                    )}>
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
