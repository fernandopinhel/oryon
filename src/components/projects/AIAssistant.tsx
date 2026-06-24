import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { askProjectAssistant } from '@/lib/ai'
import { cn } from '@/lib/utils'
import type { ProjectSummary } from '@/hooks/useProjects'
import type { TasksByStatus } from '@/hooks/useProject'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Quais tarefas estão atrasadas?',
  'Sugira próximas etapas para este projeto',
  'Como posso melhorar o fluxo de trabalho?',
  'Estime o prazo com base nas tarefas atuais',
]

interface Props {
  project: ProjectSummary
  tasksByStatus: TasksByStatus
}

export default function AIAssistant({ project, tasksByStatus }: Props) {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  // Contexto do projeto enviado para a IA
  function buildContext() {
    const counts = {
      todo:        tasksByStatus.todo.length,
      in_progress: tasksByStatus.in_progress.length,
      review:      tasksByStatus.review.length,
      done:        tasksByStatus.done.length,
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const overdueCount = Object.values(tasksByStatus)
      .flat()
      .filter((t) => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()).length

    return {
      projectTitle:  project.title,
      description:   project.description ?? 'sem descrição',
      status:        project.status,
      dueDate:       project.due_date ?? 'não definido',
      totalTasks:    total,
      taskCounts:    counts,
      overdueCount,
      membersCount:  project.members_count,
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const reply = await askProjectAssistant(text.trim(), buildContext())
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Desculpe, não consegui responder no momento. Tente novamente.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await sendMessage(input)
  }

  return (
    <div className="card overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-900">Assistente IA</span>
          {messages.length > 0 && (
            <span className="text-xs text-muted-foreground">({messages.length / 2 | 0} troca{messages.length / 2 !== 1 ? 's' : ''})</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <>
          {/* Área de mensagens */}
          <div className="border-t border-surface-border px-3 py-3 max-h-64 sm:max-h-72 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground break-words">
                  Pergunte qualquer coisa sobre o projeto <strong>{project.title}</strong>:
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors break-words"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-xs rounded-xl px-3 py-2 max-w-[88%] leading-relaxed break-words',
                    msg.role === 'user'
                      ? 'bg-primary-500 text-white ml-auto'
                      : 'bg-muted text-slate-800',
                  )}
                >
                  {msg.content}
                </div>
              ))
            )}

            {loading && (
              <div className="bg-muted rounded-xl px-3 py-2 max-w-[60%] flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Pensando…</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-surface-border p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre o projeto…"
              disabled={loading}
              className="input text-xs py-2 flex-1 min-w-0"
              aria-label="Mensagem para o assistente"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors shrink-0"
              aria-label="Enviar mensagem"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
