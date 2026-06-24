import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import FloatingChat from '@/components/messages/FloatingChat'
import { useAuthStore } from '@/store/authStore'
import { usePresenceStore } from '@/store/presenceStore'
import { useUnreadMessagesStore } from '@/store/unreadMessagesStore'

// Rotas que precisam de toda a altura disponível (sem padding/max-width)
const FULL_HEIGHT_ROUTES = ['/mensagens']

// Rotas que precisam de container largo (ex.: kanban com múltiplas colunas)
const WIDE_ROUTES = ['/projetos/']

export default function AppLayout() {
  const { pathname } = useLocation()
  const { user }     = useAuthStore()
  const { init, cleanup } = usePresenceStore()
  const { init: initUnread, cleanup: cleanupUnread } = useUnreadMessagesStore()
  const isFullHeight = FULL_HEIGHT_ROUTES.some((r) => pathname.startsWith(r))
  const isWide       = WIDE_ROUTES.some((r) => pathname.startsWith(r))

  useEffect(() => {
    if (user?.id) {
      init(user.id)
      initUnread(user.id)
    }
    return () => { cleanup(); cleanupUnread() }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex flex-1 pt-[var(--navbar-height)]">
        {/* Sidebar — oculto em mobile */}
        <aside className="hidden lg:flex flex-col fixed top-[var(--navbar-height)] left-0 h-[calc(100vh-var(--navbar-height))] w-[var(--sidebar-width)] border-r border-surface-border bg-surface overflow-y-auto">
          <Sidebar />
        </aside>

        {/* Conteúdo principal */}
        <main className="flex-1 lg:ml-[var(--sidebar-width)] pb-20 lg:pb-0">
          {isFullHeight ? (
            <div className="h-[calc(100vh-var(--navbar-height))] p-3 pb-24 lg:pb-3">
              <Outlet />
            </div>
          ) : isWide ? (
            <div className="max-w-screen-xl mx-auto px-4 py-6">
              <Outlet />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-6">
              <Outlet />
            </div>
          )}
        </main>
      </div>

      {/* Nav inferior mobile */}
      <MobileNav />

      {/* Chat flutuante — não monta em /mensagens para evitar canal Realtime duplicado */}
      {!isFullHeight && <FloatingChat />}
    </div>
  )
}
