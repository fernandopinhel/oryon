import { useState, type DragEvent } from 'react'
import { Plus } from 'lucide-react'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'
import { cn } from '@/lib/utils'
import type { Task, TasksByStatus, TaskStatus, ProjectMember } from '@/hooks/useProject'

const COLUMNS: { id: TaskStatus; label: string; accent: string; bg: string }[] = [
  { id: 'todo',        label: 'A fazer',      accent: 'border-t-slate-400',   bg: 'bg-slate-50 dark:bg-slate-800/50' },
  { id: 'in_progress', label: 'Em progresso', accent: 'border-t-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/40' },
  { id: 'review',      label: 'Em revisão',   accent: 'border-t-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { id: 'done',        label: 'Concluído',    accent: 'border-t-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
]

interface Props {
  tasksByStatus: TasksByStatus
  members: ProjectMember[]
  canEdit: boolean
  onMoveTask: (taskId: string, status: TaskStatus) => void
  onCreateTask: (payload: Partial<Task>) => Promise<void>
  onUpdateTask: (taskId: string, payload: Partial<Task>) => Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
}

export default function KanbanBoard({
  tasksByStatus, members, canEdit,
  onMoveTask, onCreateTask, onUpdateTask, onDeleteTask,
}: Props) {
  const [dragging,    setDragging]    = useState<{ taskId: string; status: TaskStatus } | null>(null)
  const [dropTarget,  setDropTarget]  = useState<TaskStatus | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined) // undefined = fechado

  function handleDragStart(e: DragEvent<HTMLDivElement>, taskId: string, status: string) {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
    setDragging({ taskId, status: status as TaskStatus })
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, colId: TaskStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(colId)
  }

  function handleDragLeave() {
    setDropTarget(null)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, colId: TaskStatus) {
    e.preventDefault()
    setDropTarget(null)

    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId || dragging?.status === colId) {
      setDragging(null)
      return
    }

    onMoveTask(taskId, colId)
    setDragging(null)
  }

  async function handleSave(payload: Partial<Task>) {
    if (payload.id) {
      await onUpdateTask(payload.id, payload)
    } else {
      await onCreateTask(payload)
    }
  }

  return (
    <>
      {/*
        O próprio container overflow-x-auto É o flex row.
        Não há wrapper intermediário — padrão mais confiável no iOS Safari.
        flex-none + width explícita em cada coluna garante que o browser
        compute a largura real do conteúdo e ative o scroll horizontal.
      */}
      <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-4 snap-x snap-mandatory">
        {COLUMNS.map(({ id, label, accent, bg }) => {
          const colTasks = tasksByStatus[id]
          const isTarget = dropTarget === id

          return (
            <div
              key={id}
              onDragOver={(e) => handleDragOver(e, id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, id)}
              className={cn(
                // flex-none impede shrink/grow; w-[76vw] + max-w deixa ~46px de peek da próxima coluna
                // lg:flex-1 distribui igualmente no desktop (sem scroll horizontal necessário)
                'snap-start flex-none w-[76vw] max-w-[300px] min-h-[60dvh] lg:w-auto lg:max-w-none lg:flex-1 flex flex-col rounded-xl border-t-4 transition-all duration-150',
                accent,
                bg,
                isTarget && 'ring-2 ring-primary-400 ring-offset-2 scale-[1.01]',
              )}
            >
              {/* Header da coluna */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-slate-700/70 text-slate-600 font-medium">
                    {colTasks.length}
                  </span>
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditingTask({ status: id } as Task)}
                    className="p-1 rounded-lg text-muted-foreground hover:bg-white/60 dark:hover:bg-slate-700/60 hover:text-slate-700 transition-colors"
                    aria-label={`Adicionar tarefa em ${label}`}
                    title={`Adicionar em ${label}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Tarefas */}
              <div className="flex-1 px-3 pb-3 space-y-2 overflow-y-auto max-h-[calc(100dvh-260px)]">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isDragging={dragging?.taskId === task.id}
                    onDragStart={handleDragStart}
                    onEdit={(t) => setEditingTask(t)}
                  />
                ))}

                {/* Zona de drop — coluna vazia */}
                {colTasks.length === 0 && !isTarget && (
                  <div className="h-16 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl flex items-center justify-center">
                    <span className="text-xs text-slate-400 dark:text-slate-500">Sem tarefas</span>
                  </div>
                )}
                {isTarget && (
                  <div className="h-16 border-2 border-dashed border-primary-400 rounded-xl flex items-center justify-center bg-primary-50/60 animate-pulse">
                    <span className="text-xs text-primary-500 font-medium">Soltar aqui</span>
                  </div>
                )}

                {/* Botão de adicionar no fim da coluna */}
                {canEdit && colTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setEditingTask({ status: id } as Task)}
                    className="w-full py-2 text-xs text-muted-foreground hover:text-slate-700 hover:bg-white/50 dark:hover:bg-slate-700/40 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar tarefa
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>{/* fim flex + scroll container */}

      {/* Modal de criação / edição */}
      {editingTask !== undefined && (
        <TaskModal
          task={editingTask?.id ? editingTask : null}
          defaultStatus={editingTask?.status ?? 'todo'}
          members={members}
          canEdit={canEdit}
          onSave={handleSave}
          onDelete={editingTask?.id ? onDeleteTask : undefined}
          onClose={() => setEditingTask(undefined)}
        />
      )}
    </>
  )
}
