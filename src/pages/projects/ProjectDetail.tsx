import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  AlertCircle, Users, Calendar, Tag, ChevronDown,
  Loader2, Crown, Settings,
} from 'lucide-react'
import { useProject } from '@/hooks/useProject'
import KanbanBoard from '@/components/projects/KanbanBoard'
import AIAssistant from '@/components/projects/AIAssistant'
import ProgressBar from '@/components/ui/ProgressBar'
import PostSkeleton from '@/components/feed/PostSkeleton'
import { getInitials, cn } from '@/lib/utils'
import { STATUS_LABELS, type ProjectStatus } from '@/hooks/useProjects'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planning:  'bg-slate-100 text-slate-600',
  active:    'bg-emerald-100 text-emerald-700',
  on_hold:   'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-slate-200 text-slate-500',
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const {
    project, tasksByStatus, members, canEdit, isMember, myRole,
    loading, error,
    moveTask, createTask, updateTask, deleteTask,
    updateProjectStatus,
  } = useProject(id ?? '')

  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  async function handleStatusChange(status: string) {
    setStatusMenuOpen(false)
    setChangingStatus(true)
    await updateProjectStatus(status)
    setChangingStatus(false)
  }

  // ----- Loading -----
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card h-32 animate-pulse bg-muted" />
        <div className="flex gap-4 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[240px] space-y-3">
              <div className="card h-8 animate-pulse bg-muted" />
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ----- Erro -----
  if (error || !project) {
    return (
      <div className="card p-10 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-semibold text-slate-900 mb-1">Projeto não encontrado</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error ?? 'Este projeto não existe ou você não tem acesso.'}
        </p>
        <Link to="/projetos" className="btn-primary text-sm px-4 py-2">Ver projetos</Link>
      </div>
    )
  }

  const totalTasks = Object.values(tasksByStatus).flat().length
  const doneTasks  = tasksByStatus.done.length
  const progress   = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div className="space-y-5 overflow-x-clip">
      {/* Capa do projeto */}
      {project.cover_url && (
        <div className="w-full h-36 sm:h-44 rounded-2xl overflow-hidden shadow-sm">
          <img
            src={project.cover_url}
            alt={`Capa de ${project.title}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Cabeçalho do projeto */}
      <div className="card p-4 sm:p-5">

        {/* Título + status: coluna no mobile, linha no sm+ */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 break-words leading-snug">{project.title}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-3 sm:line-clamp-2">{project.description}</p>
            )}
          </div>

          {/* Status — abaixo do título no mobile, ao lado no desktop */}
          <div className="flex items-center gap-1.5 shrink-0 self-start">
          {canEdit ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setStatusMenuOpen((v) => !v)}
                disabled={changingStatus}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full',
                  STATUS_COLORS[project.status],
                )}
              >
                {changingStatus
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : STATUS_LABELS[project.status]}
                <ChevronDown className="w-3 h-3" />
              </button>

              {statusMenuOpen && (
                <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1 w-40 card shadow-lg py-1 z-20">
                  {(Object.entries(STATUS_LABELS) as [ProjectStatus, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleStatusChange(key)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs transition-colors',
                        project.status === key
                          ? 'font-semibold text-primary-700 bg-primary-50'
                          : 'text-slate-700 hover:bg-muted',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className={cn('text-xs font-medium px-3 py-1.5 rounded-full', STATUS_COLORS[project.status])}>
              {STATUS_LABELS[project.status]}
            </span>
          )}
          </div>
        </div>

        {/* Meta-info */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1 shrink-0">
            <Users className="w-3.5 h-3.5" />
            {project.members_count} membro{project.members_count !== 1 ? 's' : ''}
          </span>
          {project.due_date && (
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(project.due_date).toLocaleDateString('pt-BR')}
            </span>
          )}
          {project.tags?.length > 0 && (
            <span className="flex items-center gap-1 min-w-0">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{project.tags.slice(0, 3).join(', ')}</span>
            </span>
          )}
        </div>

        {/* Barra de progresso */}
        {totalTasks > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{doneTasks}/{totalTasks} tarefas concluídas</span>
              <span className="font-medium text-slate-700">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        )}

        {/* Avatares dos membros + configurações */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex -space-x-2 shrink-0">
            {members.slice(0, 5).map((m) => (
              <Link key={m.user_id} to={`/perfil/${m.profile.username}`} title={m.profile.full_name}>
                <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center overflow-hidden border-2 border-surface">
                  {m.profile.avatar_url ? (
                    <img src={m.profile.avatar_url} alt={m.profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(m.profile.full_name)
                  )}
                </div>
              </Link>
            ))}
          </div>
          {members.length > 5 && (
            <span className="text-xs text-muted-foreground shrink-0">+{members.length - 5}</span>
          )}
          {myRole === 'owner' && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Crown className="w-3 h-3 text-amber-500" /> Dono
            </span>
          )}
          {canEdit && (
            <Link
              to={`/projetos/${project.id}/editar`}
              className="ml-auto shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-slate-700 transition-colors px-2 py-1 rounded-lg hover:bg-muted"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Configurações</span>
              <span className="sm:hidden">Config.</span>
            </Link>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        tasksByStatus={tasksByStatus}
        members={members}
        canEdit={canEdit}
        onMoveTask={moveTask}
        onCreateTask={createTask}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
      />

      {/* Assistente IA — somente para membros */}
      {isMember && (
        <AIAssistant project={project} tasksByStatus={tasksByStatus} />
      )}

      {/* Acesso negado */}
      {!isMember && (
        <div className="card p-6 text-center text-sm text-muted-foreground">
          Você está visualizando este projeto como convidado. Peça ao dono para te adicionar como membro.
        </div>
      )}
    </div>
  )
}
