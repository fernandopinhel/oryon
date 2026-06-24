import { useState, useEffect, useRef, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Send, Loader2, ArrowLeft, Paperclip, Image, X, FileText,
  Film, Music, ChevronDown,
} from 'lucide-react'
import { useMessages, type DirectMessage } from '@/hooks/useMessages'
import { useAuthStore } from '@/store/authStore'
import { usePresenceStore, STATUS_CONFIG, type PresenceStatus } from '@/store/presenceStore'
import { supabase } from '@/lib/supabase'
import { getInitials, formatRelativeTime, cn } from '@/lib/utils'
import { toast } from '@/components/ui/Toast'
import type { Profile } from '@/lib/supabase'

interface Props {
  otherId: string
  otherProfile?: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>
  onMessageSent?: (msg: DirectMessage) => void
}

type AttachPreview = {
  file: File
  preview: string | null  // null for non-image files
}

export default function ChatWindow({ otherId, otherProfile: propProfile, onMessageSent }: Props) {
  const { user }                              = useAuthStore()
  const { messages, loading, sending, sendMessage } = useMessages(otherId)
  const { getStatus, myStatus, setStatus }    = usePresenceStore()
  const [input,       setInput]               = useState('')
  const [profile,     setProfile]             = useState(propProfile)
  const [attach,      setAttach]              = useState<AttachPreview | null>(null)
  const [uploading,   setUploading]           = useState(false)
  const [statusMenu,  setStatusMenu]          = useState(false)
  const bottomRef     = useRef<HTMLDivElement>(null)
  const inputRef      = useRef<HTMLTextAreaElement>(null)
  const fileRef       = useRef<HTMLInputElement>(null)
  const statusRef     = useRef<HTMLDivElement>(null)

  // Fecha menu de status ao clicar fora
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusMenu(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Busca perfil se não foi passado via prop
  useEffect(() => {
    if (propProfile) { setProfile(propProfile); return }
    supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', otherId)
      .single()
      .then(({ data }) => { if (data) setProfile(data as Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>) })
  }, [otherId, propProfile])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length > 1 ? 'smooth' : 'auto' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [otherId])

  // Auto-resize textarea
  function autoResize() {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { toast.error('Arquivo muito grande. Máx: 50MB.'); return }

    const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/')
    const preview = isMedia ? URL.createObjectURL(file) : null
    setAttach({ file, preview })
    e.target.value = ''
  }

  function removeAttach() {
    if (attach?.preview) URL.revokeObjectURL(attach.preview)
    setAttach(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if ((!input.trim() && !attach) || sending || uploading) return

    let media: { url: string; name: string; mime: string; size: number } | undefined

    if (attach) {
      setUploading(true)
      try {
        const ext  = attach.file.name.split('.').pop() ?? 'bin'
        const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('chat-media')
          .upload(path, attach.file, { upsert: false, contentType: attach.file.type })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path)
        media = { url: publicUrl, name: attach.file.name, mime: attach.file.type, size: attach.file.size }
        if (attach.preview) URL.revokeObjectURL(attach.preview)
        setAttach(null)
      } catch {
        toast.error('Erro ao enviar arquivo.')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    const text = input.trim()
    setInput('')
    if (inputRef.current) { inputRef.current.style.height = 'auto' }

    const msg = await sendMessage(text, media)
    if (msg && onMessageSent) onMessageSent(msg)
  }

  const name       = profile?.full_name ?? '…'
  const username   = profile?.username  ?? ''
  const otherStatus = getStatus(otherId)
  const otherCfg    = STATUS_CONFIG[otherStatus]
  const myCfg       = STATUS_CONFIG[myStatus]

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border shrink-0 bg-surface">
        <Link
          to="/mensagens"
          className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-muted transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>

        <Link
          to={`/perfil/${username}`}
          className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
        >
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center overflow-hidden">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                : getInitials(name)
              }
            </div>
            <span className={cn('absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface', otherCfg.dot)} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
            <p className={cn('text-xs', otherCfg.color)}>{otherCfg.label}</p>
          </div>
        </Link>

        {/* Seletor do meu status */}
        <div className="relative shrink-0" ref={statusRef}>
          <button
            type="button"
            onClick={() => setStatusMenu((v) => !v)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-muted hover:bg-muted/70 transition-colors"
          >
            <span className={cn('w-2 h-2 rounded-full', myCfg.dot)} />
            <span className={cn('hidden sm:block', myCfg.color)}>{myCfg.label}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          {statusMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 card shadow-lg py-1 z-10">
              {(Object.entries(STATUS_CONFIG) as Array<[PresenceStatus, typeof STATUS_CONFIG[PresenceStatus]]>)
                .filter(([k]) => k !== 'offline')
                .map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setStatus(key); setStatusMenu(false) }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors',
                      myStatus === key && 'bg-muted',
                    )}
                  >
                    <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', cfg.dot)} />
                    <span className={cfg.color}>{cfg.label}</span>
                  </button>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-0.5">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-700 font-bold text-xl flex items-center justify-center mb-3">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover rounded-full" />
                : getInitials(name)
              }
            </div>
            <p className="font-semibold text-slate-800 mb-1">{name}</p>
            <p className="text-sm text-muted-foreground">Comece a conversa!</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                prev={messages[i - 1]}
                next={messages[i + 1]}
                isLast={i === messages.length - 1}
                myId={user?.id ?? ''}
              />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Preview de anexo */}
      {attach && (
        <div className="px-4 pt-2 pb-0 border-t border-surface-border shrink-0">
          <div className="flex items-center gap-3 p-2.5 bg-muted rounded-xl relative max-w-xs">
            {/* Imagem */}
            {attach.preview && attach.file.type.startsWith('image/') && (
              <img src={attach.preview} alt="Prévia" className="w-14 h-14 object-cover rounded-lg shrink-0" />
            )}
            {/* Vídeo */}
            {attach.preview && attach.file.type.startsWith('video/') && (
              <video
                src={attach.preview}
                muted
                preload="metadata"
                className="w-14 h-14 object-cover rounded-lg shrink-0 bg-black"
              />
            )}
            {/* Ícone para outros tipos */}
            {!attach.preview && (
              <div className="w-14 h-14 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                {attach.file.type.startsWith('video/') ? <Film className="w-6 h-6 text-primary-600" /> :
                 attach.file.type.startsWith('audio/') ? <Music className="w-6 h-6 text-primary-600" /> :
                 <FileText className="w-6 h-6 text-primary-600" />}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{attach.file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(attach.file.size)}</p>
            </div>
            <button
              type="button"
              aria-label="Remover anexo"
              onClick={removeAttach}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-slate-900"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-surface-border shrink-0 bg-surface"
      >
        {/* Botão de anexo */}
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          aria-label="Anexar arquivo"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          onChange={handleFileChange}
        />
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => { if (fileRef.current) { fileRef.current.accept = 'image/*'; fileRef.current.click() } }}
            title="Enviar imagem"
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-slate-700 transition-colors"
          >
            <Image className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => { if (fileRef.current) { fileRef.current.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip'; fileRef.current.click() } }}
            title="Anexar arquivo"
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-slate-700 transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>

        {/* Textarea auto-resize */}
        <textarea
          ref={inputRef}
          value={input}
          rows={1}
          onChange={(e) => { setInput(e.target.value); autoResize() }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as FormEvent) }
          }}
          placeholder="Escreva uma mensagem…"
          disabled={sending || uploading}
          className="input flex-1 text-sm resize-none py-2 leading-5 min-h-[38px] max-h-[120px]"
          aria-label="Mensagem"
          maxLength={5000}
        />

        <button
          type="submit"
          disabled={sending || uploading || (!input.trim() && !attach)}
          className="p-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors shrink-0"
          aria-label="Enviar mensagem"
        >
          {sending || uploading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </button>
      </form>
    </div>
  )
}

// ── Utilitário ───────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mime: string | null) {
  if (!mime) return FileText
  if (mime.startsWith('video/')) return Film
  if (mime.startsWith('audio/')) return Music
  return FileText
}

// ── Bolha de mensagem ────────────────────────────────────────────────────────

interface BubbleProps {
  msg: DirectMessage
  prev?: DirectMessage
  next?: DirectMessage
  isLast: boolean
  myId: string
}

function MessageBubble({ msg, prev, next, isLast, myId }: BubbleProps) {
  const isMe = msg.sender_id === myId
  const [imgOpen, setImgOpen] = useState(false)

  const grouped = (a: DirectMessage | undefined, b: DirectMessage | undefined): boolean => {
    if (!a || !b) return false
    return (
      a.sender_id === b.sender_id &&
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime() < 5 * 60 * 1000
    )
  }

  const showTimestamp = !grouped(prev, msg)
  const isGroupEnd    = !grouped(msg, next)

  const isImage = msg.media_mime?.startsWith('image/')
  const isVideo = msg.media_mime?.startsWith('video/')
  const FileIcon = getFileIcon(msg.media_mime ?? null)

  return (
    <div className={cn('flex flex-col', isMe ? 'items-end' : 'items-start', showTimestamp && 'mt-4')}>
      {showTimestamp && (
        <span className="text-[11px] text-muted-foreground mb-1.5 px-1">
          {formatRelativeTime(msg.created_at)}
        </span>
      )}

      <div className={cn('max-w-[78%]', isGroupEnd && (isMe ? 'mb-0.5' : 'mb-0.5'))}>

        {/* Mídia */}
        {msg.media_url && (
          <div className={cn('mb-1', isMe ? 'items-end flex flex-col' : 'items-start flex flex-col')}>
            {isImage && (
              <>
                <button
                  type="button"
                  onClick={() => setImgOpen(true)}
                  className={cn(
                    'block overflow-hidden rounded-2xl cursor-zoom-in max-w-[260px]',
                    isMe ? 'rounded-br-sm' : 'rounded-bl-sm',
                  )}
                >
                  <img
                    src={msg.media_url}
                    alt={msg.media_name ?? 'Imagem'}
                    className="w-full max-h-72 object-cover"
                    loading="lazy"
                  />
                </button>
                {/* Lightbox */}
                {imgOpen && (
                  <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setImgOpen(false)}
                  >
                    <img src={msg.media_url} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
                    <button
                      type="button"
                      aria-label="Fechar"
                      className="absolute top-4 right-4 p-2 bg-white/20 text-white rounded-full hover:bg-white/30"
                      onClick={() => setImgOpen(false)}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}

            {isVideo && (
              <video
                src={msg.media_url}
                controls
                className={cn('max-w-[260px] rounded-2xl', isMe ? 'rounded-br-sm' : 'rounded-bl-sm')}
              />
            )}

            {!isImage && !isVideo && msg.media_url && (
              <a
                href={msg.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm',
                  isMe ? 'bg-primary-500 text-white rounded-br-sm' : 'bg-muted text-slate-800 rounded-bl-sm',
                )}
              >
                <FileIcon className="w-5 h-5 shrink-0 opacity-80" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate max-w-[180px]">{msg.media_name ?? 'Arquivo'}</p>
                  {msg.media_size && <p className="text-[10px] opacity-70">{formatFileSize(msg.media_size)}</p>}
                </div>
              </a>
            )}
          </div>
        )}

        {/* Texto */}
        {msg.content && (
          <div
            className={cn(
              'px-3.5 py-2 text-sm leading-relaxed break-words',
              isMe ? 'bg-primary-500 text-white rounded-2xl rounded-br-sm' : 'bg-muted text-slate-800 rounded-2xl rounded-bl-sm',
              isGroupEnd && isMe  ? 'rounded-br-2xl' : '',
              isGroupEnd && !isMe ? 'rounded-bl-2xl' : '',
            )}
          >
            {msg.content}
          </div>
        )}
      </div>

      {/* Status lido */}
      {isMe && isLast && (
        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {msg.read_at ? 'Lido' : 'Enviado'}
        </span>
      )}
    </div>
  )
}
