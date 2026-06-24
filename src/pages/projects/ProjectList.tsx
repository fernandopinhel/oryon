import { Link } from 'react-router-dom'
import {
  FolderOpen, Plus, Calendar, Users, Tag,
  Globe, Lock, Crown,
} from 'lucide-react'
import { useProjects, STATUS_LABELS, type ProjectStatus, type ProjectSummary } from '@/hooks/useProjects'
import { useAuthStore } from '@/store/authStore'
import { getInitials, formatRelativeTime, cn } from '@/lib/utils'

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group/tip inline-flex items-center">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-[11px] leading-none font-medium text-white bg-slate-800 rounded-md whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-30 shadow-sm">
        {text}
      </span>
    </span>
  )
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planning:  'bg-slate-100 text-slate-600',
  active:    'bg-emerald-100 text-emerald-700',
  on_hold:   'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-slate-200 text-slate-500',
}

const VISIBILITY_ICON = {
  public:      Globe,
  connections: Users,
  private:     Lock,
}

const VISIBILITY_TOOLTIP = {
  public:      'Público — qualquer pessoa pode visualizar',
  connections: 'Conexões — visível apenas para suas conexões',
  private:     'Privado — somente membros convidados',
}

export default function ProjectList() {
  const { user }                   = useAuthStore()
  const { projects, loading }      = useProjects()

  const myProjects     = projects.filter((p) => p.owner_id === user?.id || !!p.my_role)
  const publicProjects = projects.filter((p) => p.owner_id !== user?.id && !p.my_role && p.visibility === 'public')

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 bg-muted rounded animate-pulse" />
          <div className="h-9 w-36 bg-muted rounded-xl animate-pulse" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card h-28 animate-pulse bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Projetos</h1>
        <Link to="/projetos/criar" className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
          <Plus className="w-4 h-4" />
          Novo projeto
        </Link>
      </div>

      {/* Meus projetos */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Meus projetos
        </h2>
        {myProjects.length === 0 ? (
          <div className="card p-10 text-center">
            <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-slate-700 mb-1">Nenhum projeto ainda</p>
            <p className="text-sm text-muted-foreground mb-4">
              Crie seu primeiro projeto para começar a organizar tarefas.
            </p>
            <Link to="/projetos/criar" className="btn-primary text-sm px-4 py-2">
              Criar projeto
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myProjects.map((p) => (
              <ProjectCard key={p.id} project={p} currentUserId={user?.id} />
            ))}
          </div>
        )}
      </section>

      {/* Projetos públicos de terceiros */}
      {publicProjects.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Projetos públicos
          </h2>
          <div className="space-y-3">
            {publicProjects.map((p) => (
              <ProjectCard key={p.id} project={p} currentUserId={user?.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Card ────────────────────────────────────────────────────────────────────

function ProjectCard({ project: p, currentUserId }: { project: ProjectSummary; currentUserId?: string }) {
  const VisIcon = VISIBILITY_ICON[p.visibility]
  const isOwner = p.owner_id === currentUserId

  return (
    <Link to={`/projetos/${p.id}`} className="card overflow-hidden hover:shadow-md transition-shadow group">
      {/* Capa */}
      {p.cover_url && (
        <div className="w-full h-24 overflow-hidden">
          <img
            src={p.cover_url}
            alt={`Capa de ${p.title}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-4 flex gap-4">
      {/* Avatar do dono */}
      <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
        {p.owner.avatar_url
          ? <img src={p.owner.avatar_url} alt={p.owner.full_name} className="w-full h-full object-cover" />
          : getInitials(p.owner.full_name)
        }
      </div>

      <div className="flex-1 min-w-0">
        {/* Título + badges */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-slate-900 truncate group-hover:text-primary-600 transition-colors">
            {p.title}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {isOwner && (
              <Tooltip text="Você é o dono deste projeto">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
              </Tooltip>
            )}
            <Tooltip text={VISIBILITY_TOOLTIP[p.visibility]}>
              <VisIcon className="w-3.5 h-3.5 text-muted-foreground" />
            </Tooltip>
            <Tooltip text={`Status: ${STATUS_LABELS[p.status]}`}>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full cursor-default', STATUS_COLORS[p.status])}>
                {STATUS_LABELS[p.status]}
              </span>
            </Tooltip>
          </div>
        </div>

        {p.description && (
          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{p.description}</p>
        )}

        {/* Meta-info */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {p.members_count} membro{p.members_count !== 1 ? 's' : ''}
          </span>
          {p.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(p.due_date).toLocaleDateString('pt-BR')}
            </span>
          )}
          {p.tags?.length > 0 && (
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {p.tags.slice(0, 2).join(', ')}
              {p.tags.length > 2 && ` +${p.tags.length - 2}`}
            </span>
          )}
          <span className="ml-auto">{formatRelativeTime(p.updated_at)}</span>
        </div>

        {/* Avatares dos membros */}
        {p.members.length > 0 && (
          <div className="flex -space-x-1.5 mt-2">
            {p.members.slice(0, 6).map((m) => (
              <div
                key={m.user_id}
                title={m.profile.full_name}
                className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold flex items-center justify-center overflow-hidden border border-surface"
              >
                {m.profile.avatar_url
                  ? <img src={m.profile.avatar_url} alt={m.profile.full_name} className="w-full h-full object-cover" />
                  : getInitials(m.profile.full_name)
                }
              </div>
            ))}
            {p.members.length > 6 && (
              <div className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center border border-surface">
                +{p.members.length - 6}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </Link>
  )
}
