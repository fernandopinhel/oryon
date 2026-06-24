import { useState, useRef, useEffect } from 'react'
import {
  UserPlus, UserCheck, Clock, ChevronDown,
  UserMinus, ShieldOff, Check, X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { ConnectionInfo } from '@/hooks/useProfile'

interface Props {
  targetUserId: string
  initialInfo: ConnectionInfo
  onStatusChange?: (info: ConnectionInfo) => void
}

export default function ConnectionButton({ targetUserId, initialInfo, onStatusChange }: Props) {
  const { user } = useAuthStore()
  const [info, setInfo] = useState<ConnectionInfo>(initialInfo)
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setInfo(initialInfo) }, [initialInfo])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function update(next: ConnectionInfo) {
    setInfo(next)
    onStatusChange?.(next)
  }

  async function sendRequest() {
    if (!user || busy) return
    setBusy(true)
    try {
      const { data } = await supabase
        .from('connections')
        .insert({ requester_id: user.id, addressee_id: targetUserId })
        .select('id')
        .single()
      update({ status: 'pending_sent', connectionId: data?.id ?? null })
    } finally { setBusy(false) }
  }

  async function cancelOrRemove() {
    if (!info.connectionId || busy) return
    setBusy(true)
    setMenuOpen(false)
    try {
      await supabase.from('connections').delete().eq('id', info.connectionId)
      update({ status: 'none', connectionId: null })
    } finally { setBusy(false) }
  }

  async function accept() {
    if (!info.connectionId || busy) return
    setBusy(true)
    try {
      await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', info.connectionId)
      update({ status: 'connected', connectionId: info.connectionId })
    } finally { setBusy(false) }
  }

  async function block() {
    if (!user || busy) return
    setBusy(true)
    setMenuOpen(false)
    try {
      if (info.connectionId) {
        await supabase
          .from('connections')
          .update({ status: 'blocked' })
          .eq('id', info.connectionId)
      } else {
        const { data } = await supabase
          .from('connections')
          .insert({ requester_id: user.id, addressee_id: targetUserId, status: 'blocked' })
          .select('id')
          .single()
        update({ status: 'blocked', connectionId: data?.id ?? null })
        return
      }
      update({ status: 'blocked', connectionId: info.connectionId })
    } finally { setBusy(false) }
  }

  // Não exibir nada para o próprio usuário
  if (!user || user.id === targetUserId) return null

  const spinnerClass = 'w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin'

  // ----- ESTADO: bloqueado -----
  if (info.status === 'blocked') {
    return (
      <button
        onClick={cancelOrRemove}
        disabled={busy}
        className="btn-secondary flex items-center gap-2 text-sm text-red-600 border-red-200 hover:bg-red-50"
      >
        {busy ? <div className={spinnerClass} /> : <ShieldOff className="w-4 h-4" />}
        Bloqueado
      </button>
    )
  }

  // ----- ESTADO: pedido recebido -----
  if (info.status === 'pending_received') {
    return (
      <div className="flex gap-2">
        <button
          onClick={accept}
          disabled={busy}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {busy ? <div className={spinnerClass} /> : <Check className="w-4 h-4" />}
          Aceitar
        </button>
        <button
          onClick={cancelOrRemove}
          disabled={busy}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <X className="w-4 h-4" />
          Recusar
        </button>
      </div>
    )
  }

  // ----- ESTADO: pedido enviado -----
  if (info.status === 'pending_sent') {
    return (
      <button
        onClick={cancelOrRemove}
        disabled={busy}
        className="btn-secondary flex items-center gap-2 text-sm text-muted-foreground"
      >
        {busy ? <div className={spinnerClass} /> : <Clock className="w-4 h-4" />}
        Pedido enviado
      </button>
    )
  }

  // ----- ESTADO: conectado -----
  if (info.status === 'connected') {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          disabled={busy}
          className="btn-secondary flex items-center gap-2 text-sm text-primary-700 border-primary-200 bg-primary-50 hover:bg-primary-100"
        >
          {busy ? <div className={spinnerClass} /> : <UserCheck className="w-4 h-4" />}
          Conectado
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 card shadow-lg py-1 z-20">
            <button
              onClick={cancelOrRemove}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-muted transition-colors"
            >
              <UserMinus className="w-4 h-4" />
              Remover conexão
            </button>
            <button
              onClick={block}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <ShieldOff className="w-4 h-4" />
              Bloquear usuário
            </button>
          </div>
        )}
      </div>
    )
  }

  // ----- ESTADO: sem conexão -----
  return (
    <button
      onClick={sendRequest}
      disabled={busy}
      className="btn-primary flex items-center gap-2 text-sm"
    >
      {busy ? <div className={spinnerClass} /> : <UserPlus className="w-4 h-4" />}
      Conectar
    </button>
  )
}
