import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, X, Search, ArrowLeft, Send, ChevronDown, ImagePlus, Paperclip, FileText, Film, Music } from 'lucide-react'
import { useConversations } from '@/hooks/useConversations'
import { useMessages } from '@/hooks/useMessages'
import { useAuthStore } from '@/store/authStore'
import { usePresenceStore, STATUS_CONFIG, type PresenceStatus } from '@/store/presenceStore'
import { supabase } from '@/lib/supabase'
import { getInitials, formatRelativeTime, cn } from '@/lib/utils'
import { toast } from '@/components/ui/Toast'
import type { Profile } from '@/lib/supabase'

type AttachPreview = {
  file: File
  preview: string | null   // ObjectURL para imagem/vídeo, null para outros
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type MiniProfile = Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>

export default function FloatingChat() {
  const navigate           = useNavigate()
  const { user }           = useAuthStore()
  const { getStatus }      = usePresenceStore()
  const { conversations, loading, markConversationRead } = useConversations()

  const [open,     setOpen]     = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search,   setSearch]   = useState('')

  const totalUnread = conversations.reduce((n, c) => n + c.unreadCount, 0)

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.otherProfile.full_name.toLowerCase().includes(q) ||
      c.otherProfile.username.toLowerCase().includes(q)
    )
  })

  const activeConv = conversations.find((c) => c.otherId === activeId) ?? null

  function closePanel() {
    setOpen(false)
    setActiveId(null)
    setSearch('')
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 items-end gap-2 hidden lg:flex flex-col">
      {/* Painel */}
      {open && (
        <div
          className={cn(
            'w-80 bg-surface rounded-2xl shadow-2xl border border-surface-border overflow-hidden flex flex-col',
            activeId ? 'h-[480px]' : 'h-[400px]',
          )}
        >
          {activeId && activeConv ? (
            <MiniChat
              otherId={activeId}
              otherProfile={activeConv.otherProfile}
              onBack={() => setActiveId(null)}
              onClose={closePanel}
            />
          ) : (
            <>
              {/* Header lista */}
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between shrink-0">
                <h3 className="font-bold text-slate-900 text-sm">Mensagens</h3>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => { closePanel(); navigate('/mensagens') }}
                    title="Abrir tela completa"
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    aria-label="Minimizar"
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Busca */}
              <div className="px-3 py-2 border-b border-surface-border shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar conversa…"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted rounded-full outline-none focus:ring-2 focus:ring-primary-500/30 text-slate-900 placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Lista de conversas */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-2.5 px-3 py-2.5">
                      <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5 pt-1">
                        <div className="h-3 bg-muted rounded animate-pulse w-24" />
                        <div className="h-2.5 bg-muted rounded animate-pulse w-32" />
                      </div>
                    </div>
                  ))
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                    <p className="text-xs text-muted-foreground">
                      {search ? 'Nenhuma conversa encontrada' : 'Sem mensagens ainda.'}
                    </p>
                  </div>
                ) : (
                  filtered.map((conv) => {
                    const status = getStatus(conv.otherId)
                    const cfg    = STATUS_CONFIG[status]
                    const isMine = conv.lastMessage.sender_id === user?.id
                    return (
                      <button
                        key={conv.otherId}
                        type="button"
                        onClick={() => { setActiveId(conv.otherId); markConversationRead(conv.otherId) }}
                        className="w-full flex gap-2.5 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                      >
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center overflow-hidden">
                            {conv.otherProfile.avatar_url
                              ? <img src={conv.otherProfile.avatar_url} alt={conv.otherProfile.full_name} className="w-full h-full object-cover" />
                              : getInitials(conv.otherProfile.full_name)
                            }
                          </div>
                          <span className={cn('absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface', cfg.dot)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={cn(
                              'text-xs font-semibold truncate',
                              conv.unreadCount > 0 ? 'text-slate-900' : 'text-slate-700',
                            )}>
                              {conv.otherProfile.full_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatRelativeTime(conv.lastMessage.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <p className={cn(
                              'text-[11px] truncate flex-1',
                              conv.unreadCount > 0 && !isMine ? 'text-slate-700 font-medium' : 'text-muted-foreground',
                            )}>
                              {isMine && 'Você: '}{conv.lastMessage.content || '📎 Mídia'}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="text-[9px] font-bold bg-primary-500 text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shrink-0">
                                {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mensagens"
        className={cn(
          'w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all',
          open
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-primary-500 text-white hover:bg-primary-600 hover:scale-105 active:scale-95',
        )}
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            {totalUnread > 0 && (
              <span className="absolute -top-2.5 -right-2.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-primary-500">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  )
}

// ── Mini chat window ──────────────────────────────────────────────────────────

function MiniChat({
  otherId,
  otherProfile,
  onBack,
  onClose,
}: {
  otherId: string
  otherProfile: MiniProfile
  onBack: () => void
  onClose: () => void
}) {
  const { user }                           = useAuthStore()
  const { getStatus }                      = usePresenceStore()
  const { messages, loading, sendMessage } = useMessages(otherId)
  const [text, setText]                    = useState('')
  const [attach, setAttach]                = useState<AttachPreview | null>(null)
  const [uploading, setUploading]          = useState(false)
  const bottomRef                          = useRef<HTMLDivElement>(null)
  const mediaRef                           = useRef<HTMLInputElement>(null)  // imagem / vídeo
  const fileRef                            = useRef<HTMLInputElement>(null)  // qualquer arquivo
  const textareaRef                        = useRef<HTMLTextAreaElement>(null)
  const status: PresenceStatus             = getStatus(otherId)
  const cfg                                = STATUS_CONFIG[status]
  const busy                               = uploading

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length > 1 ? 'smooth' : 'auto' })
  }, [messages])

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => { if (attach?.preview) URL.revokeObjectURL(attach.preview) }
  }, [attach])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { toast.error('Arquivo muito grande. Máx: 50MB.'); return }
    const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/')
    const preview = isMedia ? URL.createObjectURL(file) : null
    if (attach?.preview) URL.revokeObjectURL(attach.preview)
    setAttach({ file, preview })
    e.target.value = ''
  }

  function removeAttach() {
    if (attach?.preview) URL.revokeObjectURL(attach.preview)
    setAttach(null)
  }

  async function handleSend() {
    const content = text.trim()
    if ((!content && !attach) || busy) return

    let media: { url: string; name: string; mime: string; size: number } | undefined

    if (attach) {
      setUploading(true)
      try {
        const ext  = attach.file.name.split('.').pop() ?? 'bin'
        const path = `${user!.id}/${Date.now()}.${ext}`
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

    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    await sendMessage(content, media)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isImage = (mime?: string | null) => !!mime?.startsWith('image/')
  const isVideo = (mime?: string | null) => !!mime?.startsWith('video/')

  return (
    <>
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-surface-border flex items-center gap-2 shrink-0">
        <button type="button" onClick={onBack} aria-label="Voltar" className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center overflow-hidden">
            {otherProfile.avatar_url
              ? <img src={otherProfile.avatar_url} alt={otherProfile.full_name} className="w-full h-full object-cover" />
              : getInitials(otherProfile.full_name)
            }
          </div>
          <span className={cn('absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-surface', cfg.dot)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate leading-none mb-0.5">{otherProfile.full_name}</p>
          <p className={cn('text-[10px]', cfg.color)}>{cfg.label}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground text-center px-4">Diga olá para {otherProfile.full_name}!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id
            return (
              <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-2xl text-xs leading-relaxed break-words overflow-hidden',
                  msg.media_url && !msg.content ? 'p-0.5' : 'px-3 py-1.5',
                  isMe
                    ? 'bg-primary-500 text-white rounded-br-sm'
                    : 'bg-muted text-slate-800 rounded-bl-sm',
                )}>
                  {/* Imagem */}
                  {msg.media_url && isImage(msg.media_mime) && (
                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={msg.media_url}
                        alt={msg.media_name ?? 'imagem'}
                        className="rounded-xl max-w-full block"
                      />
                    </a>
                  )}
                  {/* Vídeo */}
                  {msg.media_url && isVideo(msg.media_mime) && (
                    <video
                      src={msg.media_url}
                      controls
                      className="rounded-xl max-w-full block"
                      preload="metadata"
                    />
                  )}
                  {/* Arquivo genérico */}
                  {msg.media_url && !isImage(msg.media_mime) && !isVideo(msg.media_mime) && (
                    <a
                      href={msg.media_url}
                      download={msg.media_name ?? 'arquivo'}
                      className={cn('flex items-center gap-2 px-3 py-2', isMe ? 'text-white/90' : 'text-slate-700')}
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="truncate text-[11px]">{msg.media_name ?? 'arquivo'}</span>
                      {msg.media_size && (
                        <span className="text-[10px] opacity-70 shrink-0">{formatFileSize(msg.media_size)}</span>
                      )}
                    </a>
                  )}
                  {/* Texto */}
                  {msg.content && (
                    <span className={msg.media_url ? 'block px-2 pb-1 pt-0.5' : ''}>{msg.content}</span>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Preview do arquivo a enviar */}
      {attach && (
        <div className="px-3 pt-2 shrink-0">
          <div className="relative inline-block max-w-[calc(100%-24px)]">
            {/* Imagem */}
            {attach.preview && attach.file.type.startsWith('image/') && (
              <img
                src={attach.preview}
                alt="preview"
                className="h-20 w-auto rounded-xl object-cover border border-surface-border"
              />
            )}
            {/* Vídeo */}
            {attach.preview && attach.file.type.startsWith('video/') && (
              <video
                src={attach.preview}
                muted
                preload="metadata"
                className="h-20 w-auto rounded-xl object-cover border border-surface-border bg-black"
              />
            )}
            {/* Outros arquivos */}
            {!attach.preview && (
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 text-xs text-slate-700">
                {attach.file.type.startsWith('video/') ? <Film className="w-4 h-4 text-primary-600 shrink-0" /> :
                 attach.file.type.startsWith('audio/') ? <Music className="w-4 h-4 text-primary-600 shrink-0" /> :
                 <FileText className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className="truncate max-w-[140px]">{attach.file.name}</span>
                <span className="text-muted-foreground shrink-0">{formatFileSize(attach.file.size)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={removeAttach}
              aria-label="Remover arquivo"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-700 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Área de input */}
      <div className="px-3 py-2 border-t border-surface-border flex items-end gap-1 shrink-0">
        {/* Input para imagens e vídeos */}
        <input
          ref={mediaRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Selecionar imagem ou vídeo"
        />
        {/* Input para qualquer arquivo */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Selecionar arquivo"
        />

        {/* Botão imagem/vídeo */}
        <button
          type="button"
          onClick={() => mediaRef.current?.click()}
          disabled={busy}
          aria-label="Enviar imagem ou vídeo"
          title="Imagem ou vídeo"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40 shrink-0"
        >
          {uploading
            ? <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            : <ImagePlus className="w-4 h-4" />
          }
        </button>

        {/* Botão arquivo genérico */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-label="Anexar arquivo"
          title="Anexar documento ou arquivo"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40 shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'
          }}
          onKeyDown={handleKeyDown}
          placeholder="Mensagem…"
          className="flex-1 resize-none bg-muted rounded-2xl px-3 py-2 text-xs text-slate-900 placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary-500/30 overflow-hidden min-h-8 max-h-20"
          aria-label="Digitar mensagem"
        />

        {/* Botão enviar */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && !attach) || busy}
          aria-label="Enviar mensagem"
          className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center transition-all hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </>
  )
}
