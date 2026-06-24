import { NavLink } from 'react-router-dom'
import { User, Shield, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const NAV = [
  { to: '/configuracoes',              label: 'Conta',        Icon: User     },
  { to: '/configuracoes/privacidade',  label: 'Privacidade',  Icon: Shield   },
  { to: '/configuracoes/lgpd',         label: 'Dados & LGPD', Icon: FileText },
]

export default function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-5">Configurações</h1>

      {/* Mobile: nav horizontal com scroll */}
      <nav className="flex sm:hidden gap-1.5 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 bg-muted hover:text-slate-900',
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex gap-5 items-start">
        {/* Desktop: nav vertical sticky */}
        <nav className="hidden sm:flex flex-col gap-1 w-40 shrink-0 sticky top-[calc(var(--navbar-height)+1.5rem)]">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-muted hover:text-slate-900',
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Conteúdo da página */}
        <div className="flex-1 min-w-0 space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}
