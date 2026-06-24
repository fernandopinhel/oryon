import { useState, type DragEvent } from 'react'
import { Plus } from 'lucide-react'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'
import { cn } from '@/lib/utils'
import type { Task, TasksByStatus, TaskStatus, ProjectMember } from '@/hooks/useProject'

const COLUMNS: { id: TaskStatus; label: string; accent: string; bg: string }[] = [
  { id: 'todo',        label: 'A fazer',      accent: 'border-t-slate-400',   bg: 'bg-slate-50' },
  { id: 'in_progress', label: 'Em progresso', accent: 'border-t-blue-400',    bg: 'bg-blue-50' },
  { id: 'review',      label: 'Em revisão',   accent: 'border-t-amber-400',   bg: 'bg-amber-50' },
  { id: 'done',        label: 'Concluído',    accent: 'border-t-emerald-400', bg: 'bg-emerald-50' },
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
        Scroll container separado do flex row.
        "w-max min-w-full" no flex row força o browser a calcular a largura
        real das colunas (em vez de confiar no flex-1 que colapsa em iOS).
        Resultado: overflow-x-auto funciona em todos os devices.
      */}
      <div className="overflow-x-auto overscroll-x-contain pb-4 -mx-1 px-1">
        <div className="flex gap-3 min-h-[60dvh] w-max min-w-full">
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
                'w-[280px] lg:flex-1 lg:w-auto shrink-0 flex flex-col rounded-xl border-t-4 transition-all duration-150',
                accent,
                bg,
                isTarget && 'ring-2 ring-primary-400 ring-offset-2 scale-[1.01]',
              )}
            >
              {/* Header da coluna */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/70 text-slate-600 font-medium">
                    {colTasks.length}
                  </span>
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditingTask({ status: id } as Task)}
                    className="p-1 rounded-lg text-muted-foreground hover:bg-white/60 hover:text-slate-700 transition-colors"
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
                  <div className="h-16 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center">
                    <span className="text-xs text-slate-400">Sem tarefas</span>
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
                    className="w-full py-2 text-xs text-muted-foreground hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar tarefa
                  </button>
                )}
              </div>
            </div>
          )
        })}
        </div>{/* fim flex row interno */}
      </div>{/* fim scroll container */}

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
