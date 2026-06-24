import { useState, useEffect, type FormEvent } from 'react'
import { X, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIORITY_CONFIG } from './TaskCard'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { Task, TaskStatus, TaskPriority, ProjectMember } from '@/hooks/useProject'

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo',        label: 'A fazer' },
  { value: 'in_progress', label: 'Em progresso' },
  { value: 'review',      label: 'Em revisão' },
  { value: 'done',        label: 'Concluído' },
]

interface Props {
  task?: Task | null               // null = criar nova
  defaultStatus?: TaskStatus
  members: ProjectMember[]
  canEdit: boolean
  onSave: (payload: Partial<Task>) => Promise<void>
  onDelete?: (taskId: string) => Promise<void>
  onClose: () => void
}

export default function TaskModal({
  task, defaultStatus = 'todo', members, canEdit,
  onSave, onDelete, onClose,
}: Props) {
  const isNew = !task

  const [title,      setTitle]      = useState(task?.title      ?? '')
  const [description,setDescription]= useState(task?.description ?? '')
  const [status,     setStatus]     = useState<TaskStatus>(task?.status   ?? defaultStatus)
  const [priority,   setPriority]   = useState<TaskPriority>(task?.priority ?? 'medium')
  const [assigneeId, setAssigneeId] = useState<string>(task?.assignee_id ?? '')
  const [dueDate,    setDueDate]    = useState(task?.due_date ?? '')
  const [labelsStr,  setLabelsStr]  = useState((task?.labels ?? []).join(', '))
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Fechar ao pressionar Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)

    const labels = labelsStr
      .split(',')
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean)

    await onSave({
      ...(task ? { id: task.id } : {}),
      title:       title.trim(),
      description: description.trim() || null,
      status,
      priority,
      assignee_id: assigneeId || null,
      due_date:    dueDate || null,
      labels,
    })

    setSaving(false)
    onClose()
  }

  function handleDelete() {
    if (!task || !onDelete) return
    setConfirmDelete(true)
  }

  async function handleConfirmDelete() {
    if (!task || !onDelete) return
    setDeleting(true)
    await onDelete(task.id)
    onClose()
  }

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-slate-900">
            {isNew ? 'Nova tarefa' : 'Editar tarefa'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Título */}
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-700 mb-1">
              Título *
            </label>
            <input
              id="task-title"
              type="text"
              required
              maxLength={500}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEdit}
              className="input"
              placeholder="Descreva a tarefa…"
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="task-desc" className="block text-sm font-medium text-slate-700 mb-1">
              Descrição
            </label>
            <textarea
              id="task-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
              className="input resize-none"
              placeholder="Detalhes opcionais…"
            />
          </div>

          {/* Status + Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-status" className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={!canEdit}
                className="input"
              >
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-priority" className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={!canEdit}
                className="input"
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Responsável + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-assignee" className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={!canEdit}
                className="input"
              >
                <option value="">Nenhum</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-due" className="block text-sm font-medium text-slate-700 mb-1">Prazo</label>
              <input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={!canEdit}
                className="input"
              />
            </div>
          </div>

          {/* Labels */}
          <div>
            <label htmlFor="task-labels" className="block text-sm font-medium text-slate-700 mb-1">
              Labels <span className="font-normal text-muted-foreground">(separadas por vírgula)</span>
            </label>
            <input
              id="task-labels"
              type="text"
              value={labelsStr}
              onChange={(e) => setLabelsStr(e.target.value)}
              disabled={!canEdit}
              className="input"
              placeholder="bug, feature, docs"
            />
          </div>

          {/* Ações */}
          <div className={cn('flex gap-3 pt-1', !isNew && 'justify-between')}>
            {!isNew && onDelete && canEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="btn-secondary flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir
              </button>
            )}

            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={onClose} className="btn-secondary px-4">
                Cancelar
              </button>
              {canEdit && (
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="btn-primary px-4 flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Salvando…' : isNew ? 'Criar tarefa' : 'Salvar'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>

    <ConfirmDialog
      open={confirmDelete}
      title="Excluir tarefa"
      message={`Tem certeza que deseja excluir "${task?.title}"? Esta ação não pode ser desfeita.`}
      confirmLabel="Excluir"
      cancelLabel="Cancelar"
      variant="danger"
      loading={deleting}
      onConfirm={handleConfirmDelete}
      onCancel={() => setConfirmDelete(false)}
    />
    </>
  )
}
