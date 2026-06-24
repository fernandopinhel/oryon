import { Link, useNavigate } from 'react-router-dom'
import { Bell, Search, LogOut, Settings, User, MessageSquare, ArrowLeft, X, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useUnreadMessagesStore } from '@/store/unreadMessagesStore'
import { useThemeStore } from '@/store/themeStore'
import { getInitials } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

export default function Navbar() {
  const { profile, signOut }  = useAuthStore()
  const { unreadCount }       = useNotificationStore()
  const { count: unreadMsgs } = useUnreadMessagesStore()
  const { theme, toggle: toggleTheme } = useThemeStore()
  const navigate              = useNavigate()
  const [menuOpen, setMenuOpen]         = useState(false)
  const [mobileSearch, setMobileSearch] = useState(false)
  const [mobileQuery,  setMobileQuery]  = useState('')
  const menuRef        = useRef<HTMLDivElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (mobileSearch) mobileInputRef.current?.focus()
  }, [mobileSearch])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function closeMobileSearch() {
    setMobileSearch(false)
    setMobileQuery('')
  }

  function handleMobileSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && mobileQuery.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(mobileQuery.trim())}`)
      closeMobileSearch()
    }
    if (e.key === 'Escape') closeMobileSearch()
  }

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-[var(--navbar-height)] bg-surface border-b border-surface-border flex items-center">

      {/* === Overlay de busca mobile === */}
      {mobileSearch && (
        <div className="flex sm:hidden items-center gap-2 px-3 w-full">
          <button
            type="button"
            onClick={closeMobileSearch}
            aria-label="Fechar busca"
            className="p-2 rounded-lg text-slate-600 hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            ref={mobileInputRef}
            type="search"
            value={mobileQuery}
            onChange={(e) => setMobileQuery(e.target.value)}
            onKeyDown={handleMobileSearchKey}
            placeholder="Buscar pessoas, grupos, projetos…"
            className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none text-slate-900 placeholder:text-muted-foreground"
          />
          {mobileQuery && (
            <button
              type="button"
              onClick={() => setMobileQuery('')}
              aria-label="Limpar busca"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-muted transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* === Navbar normal (oculto no mobile quando overlay de busca está aberto) === */}
      <div className={mobileSearch ? 'hidden sm:contents' : 'contents'}>

        {/* Logo — mesma largura da sidebar */}
        <div className="shrink-0 flex items-center gap-2 px-4 lg:w-[var(--sidebar-width)]">
          <Link to="/feed" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <span className="font-bold text-slate-900 text-lg hidden sm:block">Oryon</span>
          </Link>
        </div>

        {/* Coluna central — search pill alinhada com o conteúdo abaixo */}
        <div className="flex-1 flex items-center px-4 relative min-w-0">
          {/* Search pill — oculto no mobile (ícone lupa abre overlay) */}
          <div className="hidden sm:block w-full max-w-2xl mx-auto pr-36">
            <Link
              to="/buscar"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm hover:bg-muted/70 transition-colors w-full"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="truncate">Buscar pessoas, grupos, projetos…</span>
            </Link>
          </div>

          {/* Ações — overlay à direita */}
          <div className="absolute right-4 flex items-center gap-1.5">
            {/* Ícone lupa no mobile — abre overlay de busca */}
            <button
              type="button"
              onClick={() => setMobileSearch(true)}
              aria-label="Abrir busca"
              className="sm:hidden p-2 rounded-lg hover:bg-muted transition-colors text-slate-600"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Tema */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-slate-600"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Mensagens */}
            <Link
              to="/mensagens"
              className="relative p-2 rounded-lg hover:bg-muted transition-colors text-slate-600"
              aria-label="Mensagens"
            >
              <MessageSquare className="w-5 h-5" />
              {unreadMsgs > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadMsgs > 9 ? '9+' : unreadMsgs}
                </span>
              )}
            </Link>

            {/* Notificações */}
            <Link
              to="/notificacoes"
              className="relative p-2 rounded-lg hover:bg-muted transition-colors text-slate-600"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Avatar + dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  getInitials(profile?.full_name ?? 'U')
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 card shadow-lg py-1 z-50">
                  <div className="px-3 py-2 border-b border-surface-border">
                    <p className="font-medium text-sm text-slate-900 truncate">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{profile?.username}</p>
                  </div>
                  <Link
                    to={`/perfil/${profile?.username}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-muted transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Meu perfil
                  </Link>
                  <Link
                    to="/configuracoes"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-muted transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configurações
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </header>
  )
}
