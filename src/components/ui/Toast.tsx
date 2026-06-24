import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastItemProps {
  toast: ToastMessage
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), toast.duration ?? 4000)
    return () => clearTimeout(t)
  }, [toast.id, toast.duration, onRemove])

  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? XCircle : Info
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  }
  const iconColors = {
    success: 'text-emerald-500',
    error:   'text-red-500',
    info:    'text-blue-500',
  }

  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-md text-sm max-w-sm w-full',
      'animate-in slide-in-from-right-4 duration-200',
      colors[toast.type],
    )}>
      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', iconColors[toast.type])} />
      <span className="flex-1 leading-relaxed">{toast.message}</span>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1"
        aria-label="Fechar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Singleton store ──────────────────────────────────────────────────────────
type Listener = (toasts: ToastMessage[]) => void
let toasts: ToastMessage[] = []
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((l) => l([...toasts]))
}

export function toast(message: string, type: ToastType = 'info', duration = 4000) {
  const id = Math.random().toString(36).slice(2)
  toasts = [...toasts, { id, type, message, duration }]
  notify()
}

toast.success = (msg: string) => toast(msg, 'success')
toast.error   = (msg: string) => toast(msg, 'error')
toast.info    = (msg: string) => toast(msg, 'info')

// ── Container component ──────────────────────────────────────────────────────
export function ToastContainer() {
  const [items, setItems] = useState<ToastMessage[]>([])

  useEffect(() => {
    listeners.add(setItems)
    return () => { listeners.delete(setItems) }
  }, [])

  const remove = useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id)
    notify()
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[60] flex flex-col gap-2 items-end">
      {items.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={remove} />
      ))}
    </div>
  )
}
