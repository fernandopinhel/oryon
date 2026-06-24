import { type DragEvent } from 'react'
import { Calendar, AlertCircle, Pencil } from 'lucide-react'
import { getInitials, cn } from '@/lib/utils'
import type { Task } from '@/hooks/useProject'

export const PRIORITY_CONFIG = {
  low:    { label: 'Baixa',   color: 'text-slate-500 bg-slate-100',    dot: 'bg-slate-400' },
  medium: { label: 'Média',   color: 'text-blue-600 bg-blue-100',      dot: 'bg-blue-500' },
  high:   { label: 'Alta',    color: 'text-orange-600 bg-orange-100',  dot: 'bg-orange-500' },
  urgent: { label: 'Urgente', color: 'text-red-600 bg-red-100',        dot: 'bg-red-500' },
}

interface Props {
  task: Task
  isDragging: boolean
  onDragStart: (e: DragEvent<HTMLDivElement>, taskId: string, status: string) => void
  onEdit: (task: Task) => void
}

export default function TaskCard({ task, isDragging, onDragStart, onEdit }: Props) {
  const priority = PRIORITY_CONFIG[task.priority]
  const isOverdue =
    task.due_date &&
    task.status !== 'done' &&
    new Date(task.due_date) < new Date()

  const dueDateLabel = task.due_date
    ? new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id, task.status)}
      className={cn(
        'card p-3 cursor-grab active:cursor-grabbing select-none',
        'hover:shadow-md transition-all duration-150',
        isDragging && 'opacity-30 scale-95',
      )}
    >
      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((label) => (
            <span
              key={label}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 font-medium"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Título + botão de editar */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <p className="text-sm font-medium text-slate-900 leading-snug">{task.title}</p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(task) }}
          className="shrink-0 p-1 rounded text-muted-foreground hover:text-primary-600 hover:bg-primary-50 transition-colors"
          aria-label="Editar tarefa"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Footer: prioridade, data, avatar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Prioridade */}
        <span className={cn('flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full', priority.color)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', priority.dot)} />
          {priority.label}
        </span>

        {/* Data */}
        {dueDateLabel && (
          <span
            className={cn(
              'flex items-center gap-1 text-[10px] ml-auto',
              isOverdue ? 'text-red-600' : 'text-muted-foreground',
            )}
          >
            {isOverdue && <AlertCircle className="w-3 h-3" />}
            <Calendar className="w-3 h-3" />
            {dueDateLabel}
          </span>
        )}

        {/* Assignee avatar */}
        {task.assignee && (
          <div
            className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold flex items-center justify-center overflow-hidden ml-auto shrink-0"
            title={task.assignee.full_name}
          >
            {task.assignee.avatar_url ? (
              <img src={task.assignee.avatar_url} alt={task.assignee.full_name} className="w-full h-full object-cover" />
            ) : (
              getInitials(task.assignee.full_name)
            )}
          </div>
        )}
      </div>
    </div>
  )
}
