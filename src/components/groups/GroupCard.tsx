import { Link } from 'react-router-dom'
import { Users, FileText, Lock, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GroupSummary } from '@/hooks/useGroups'

const PRIVACY_BADGE: Record<string, { label: string; icon: typeof Lock; color: string }> = {
  public:  { label: 'Público',  icon: Users,  color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  private: { label: 'Privado', icon: Lock,   color: 'text-amber-600 bg-amber-50 border-amber-200' },
  secret:  { label: 'Secreto', icon: EyeOff, color: 'text-slate-600 bg-slate-100 border-slate-200' },
}

const GRADIENTS = [
  'from-violet-400 to-indigo-500',
  'from-blue-400 to-cyan-500',
  'from-emerald-400 to-teal-500',
  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-fuchsia-400 to-purple-500',
]

function groupGradient(name: string) {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length
  return GRADIENTS[idx]
}

interface Props {
  group: GroupSummary
  onJoin?: (id: string) => void
  onLeave?: (id: string) => void
  busy?: boolean
}

export default function GroupCard({ group, onJoin, onLeave, busy }: Props) {
  const badge = PRIVACY_BADGE[group.privacy]
  const BadgeIcon = badge.icon
  const gradient = groupGradient(group.name)

  return (
    <div className={cn('card flex flex-col transition-opacity', busy && 'opacity-60')}>

      {/* Banner + avatar sobrepostos em wrapper relativo */}
      <div className="relative">
        {/* Banner — overflow-hidden apenas aqui para clipar imagem de capa */}
        <Link to={`/grupos/${group.id}`} className="block">
          <div className={`h-24 bg-gradient-to-br ${gradient} relative overflow-hidden rounded-t-xl`}>
            {group.cover_url && (
              <img
                src={group.cover_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <span className={cn(
              'absolute top-2 right-2 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium',
              badge.color,
            )}>
              <BadgeIcon className="w-3 h-3" />
              {badge.label}
            </span>
          </div>
        </Link>

        {/* Avatar — posicionado absolute para sobrepor o banner sem ser clipado */}
        <Link
          to={`/grupos/${group.id}`}
          className="absolute left-4 bottom-0 translate-y-1/2 z-10"
        >
          <div className={cn(
            'w-14 h-14 rounded-xl border-4 border-surface shadow-md overflow-hidden',
            `bg-gradient-to-br ${gradient}`,
            'flex items-center justify-center text-white font-bold text-lg',
          )}>
            {group.avatar_url ? (
              <img src={group.avatar_url} alt={group.name} className="w-full h-full object-cover" />
            ) : (
              group.name[0].toUpperCase()
            )}
          </div>
        </Link>
      </div>

      {/* Conteúdo — padding-top para dar espaço ao avatar */}
      <div className="px-4 pt-10 pb-4 flex-1 flex flex-col">
        <div className="mb-2">
          <Link to={`/grupos/${group.id}`}>
            <h3 className="font-semibold text-slate-900 text-sm truncate hover:text-primary-600 transition-colors">
              {group.name}
            </h3>
          </Link>
        </div>

        {group.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
            {group.description}
          </p>
        )}

        {/* Stats + ação */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {group.members_count.toLocaleString('pt-BR')}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {group.posts_count.toLocaleString('pt-BR')}
            </span>
          </div>

          {group.privacy !== 'secret' && (
            group.is_member ? (
              <button
                type="button"
                onClick={() => onLeave?.(group.id)}
                disabled={busy}
                className="text-xs btn-secondary px-3 py-1.5 text-muted-foreground"
              >
                Sair
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onJoin?.(group.id)}
                disabled={busy}
                className="text-xs btn-primary px-3 py-1.5"
              >
                Participar
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
