import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  MoreHorizontal, Trash2, Pencil, BadgeCheck, Sparkles,
  ChevronDown, ChevronUp, Loader2, X, ImagePlus,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { summarizePost } from '@/lib/ai'
import { formatRelativeTime, getInitials, truncate, cn } from '@/lib/utils'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { toast } from '@/components/ui/Toast'
import ReactionBar from './ReactionBar'
import type { FeedPost } from '@/hooks/useFeed'

type PostMedia = { url: string; type: string; alt_text?: string }

const CONTENT_LIMIT = 350
const MAX_CHARS     = 10_000
const MAX_MEDIA     = 4
const MAX_FILE_MB   = 10

interface Props {
  post: FeedPost
  onReactionChange: (postId: string, reaction: string | null, delta: number) => void
  onDelete: (postId: string) => void
  onUpdate?: (postId: string, content: string, mediaUrls: PostMedia[]) => void
}

export default function PostCard({ post, onReactionChange, onDelete, onUpdate }: Props) {
  const { user } = useAuthStore()
  const [expanded, setExpanded]             = useState(false)
  const [menuOpen, setMenuOpen]             = useState(false)
  const [summary, setSummary]               = useState<string | null>(post.ai_summary ?? null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [showSummary, setShowSummary]       = useState(false)
  const [deleting, setDeleting]             = useState(false)
  const [confirmOpen, setConfirmOpen]       = useState(false)

  // ── Edit mode ────────────────────────────────────────────────
  const [editing, setEditing]       = useState(false)
  const [editContent, setEditContent] = useState(post.content ?? '')
  const [editMedia, setEditMedia]   = useState<PostMedia[]>([])
  const [newFiles, setNewFiles]     = useState<Array<{ file: File; preview: string }>>([])
  const [saving, setSaving]         = useState(false)
  const editRef      = useRef<HTMLTextAreaElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus()
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length)
      autoResizeEdit()
    }
  }, [editing])

  function autoResizeEdit() {
    const el = editRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 400)}px`
  }

  function startEdit() {
    setEditContent(post.content ?? '')
    setEditMedia(post.media_urls ? [...post.media_urls] : [])
    setNewFiles([])
    setMenuOpen(false)
    setEditing(true)
  }

  function cancelEdit() {
    newFiles.forEach((f) => URL.revokeObjectURL(f.preview))
    setEditing(false)
    setEditContent(post.content ?? '')
    setEditMedia([])
    setNewFiles([])
  }

  function removeExistingMedia(idx: number) {
    setEditMedia((prev) => prev.filter((_, i) => i !== idx))
  }

  function removeNewFile(idx: number) {
    setNewFiles((prev) => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const remaining = MAX_MEDIA - editMedia.length - newFiles.length
    const toAdd = files.slice(0, remaining).filter((f) => {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`"${f.name}" excede ${MAX_FILE_MB}MB.`)
        return false
      }
      return true
    }).map((file) => ({ file, preview: URL.createObjectURL(file) }))
    setNewFiles((prev) => [...prev, ...toAdd])
    e.target.value = ''
  }

  async function saveEdit() {
    const trimmed = editContent.trim()

    const mediaUnchanged =
      editMedia.length === (post.media_urls?.length ?? 0) &&
      editMedia.every((m, i) => m.url === (post.media_urls?.[i]?.url ?? '')) &&
      newFiles.length === 0

    if (trimmed === (post.content ?? '').trim() && mediaUnchanged) {
      cancelEdit()
      return
    }

    setSaving(true)
    try {
      const uploaded: PostMedia[] = []
      for (const { file } of newFiles) {
        const ext  = file.name.split('.').pop() ?? 'jpg'
        const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('post-media')
          .upload(path, file, { upsert: false })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path)
        uploaded.push({ url: publicUrl, type: file.type })
      }

      const finalMedia = [...editMedia, ...uploaded]

      const { error } = await supabase
        .from('posts')
        .update({ content: trimmed, media_urls: finalMedia })
        .eq('id', post.id)
      if (error) throw error

      onUpdate?.(post.id, trimmed, finalMedia)
      toast.success('Post editado.')
      newFiles.forEach((f) => URL.revokeObjectURL(f.preview))
      setEditing(false)
    } catch {
      toast.error('Não foi possível editar o post.')
    } finally {
      setSaving(false)
    }
  }
  // ─────────────────────────────────────────────────────────────

  const isOwn          = user?.id === post.author_id
  const content        = post.content ?? ''
  const isLong         = content.length > CONTENT_LIMIT
  const displayContent = isLong && !expanded ? truncate(content, CONTENT_LIMIT) : content
  const hasMedia       = post.media_urls && post.media_urls.length > 0
  const totalEditMedia = editMedia.length + newFiles.length

  async function confirmDelete() {
    setDeleting(true)
    setConfirmOpen(false)
    try {
      await supabase.from('posts').delete().eq('id', post.id)
      onDelete(post.id)
      toast.success('Post excluído.')
    } catch {
      toast.error('Não foi possível excluir o post.')
      setDeleting(false)
    }
  }

  async function handleSummarize() {
    if (summary) { setShowSummary((v) => !v); return }
    setSummaryLoading(true)
    try {
      const result = await summarizePost(content)
      setSummary(result)
      setShowSummary(true)
      supabase.from('posts').update({ ai_summary: result }).eq('id', post.id).then(() => {})
    } catch { /* silencia */ }
    finally { setSummaryLoading(false) }
  }

  const visibilityLabel =
    post.visibility === 'connections' ? '· Conexões' :
    post.visibility === 'private'     ? '· Privado'  :
    post.visibility === 'group'       ? '· Grupo'    : null

  return (
    <article className={cn('card p-4 transition-opacity', deleting && 'opacity-50 pointer-events-none')}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <Link to={`/perfil/${post.author.username}`} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center overflow-hidden shrink-0">
            {post.author.avatar_url ? (
              <img src={post.author.avatar_url} alt={post.author.full_name} className="w-full h-full object-cover" />
            ) : (
              getInitials(post.author.full_name)
            )}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm text-slate-900 group-hover:text-primary-600 transition-colors">
                {post.author.full_name}
              </span>
              {post.author.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary-500" />}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>@{post.author.username}</span>
              <span>·</span>
              <span>{formatRelativeTime(post.created_at)}</span>
              {visibilityLabel && <span>{visibilityLabel}</span>}
            </div>
          </div>
        </Link>

        {/* Menu de opções */}
        {isOwn && !editing && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Opções da publicação"
              title="Opções"
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-slate-700 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 card shadow-lg py-1 z-10">
                <button
                  type="button"
                  onClick={startEdit}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-muted transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Editar post
                </button>
                <div className="h-px bg-surface-border my-1" />
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setConfirmOpen(true) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modo de edição ── */}
      {editing ? (
        <div className="mb-3 space-y-3">
          {/* Textarea de texto */}
          <textarea
            ref={editRef}
            value={editContent}
            onChange={(e) => {
              if (e.target.value.length > MAX_CHARS) return
              setEditContent(e.target.value)
              autoResizeEdit()
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveEdit() }
              if (e.key === 'Escape') cancelEdit()
            }}
            rows={3}
            placeholder="Edite seu post…"
            className="w-full resize-none text-sm text-slate-900 leading-relaxed border border-primary-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-surface"
          />

          {/* Grid de mídia em edição */}
          {(editMedia.length > 0 || newFiles.length > 0) && (
            <div className={cn(
              'grid gap-2',
              totalEditMedia === 1 ? 'grid-cols-1' : 'grid-cols-2',
            )}>
              {/* Imagens existentes */}
              {editMedia.map((media, i) => (
                <div
                  key={`existing-${i}`}
                  className={cn(
                    'relative rounded-lg overflow-hidden bg-muted',
                    totalEditMedia === 1 ? 'aspect-video' : 'aspect-square',
                  )}
                >
                  {media.type?.startsWith('video') ? (
                    <video src={media.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={media.url} alt={media.alt_text ?? `Imagem ${i + 1}`} className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    aria-label="Remover imagem"
                    onClick={() => removeExistingMedia(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Novas imagens (prévia) */}
              {newFiles.map((f, i) => (
                <div
                  key={`new-${i}`}
                  className={cn(
                    'relative rounded-lg overflow-hidden bg-muted',
                    totalEditMedia === 1 ? 'aspect-video' : 'aspect-square',
                  )}
                >
                  <img src={f.preview} alt="" className="w-full h-full object-cover" />
                  <span className="absolute top-1.5 left-1.5 text-xs bg-primary-600 text-white px-1.5 py-0.5 rounded-full font-medium">
                    Nova
                  </span>
                  <button
                    type="button"
                    aria-label="Remover nova imagem"
                    onClick={() => removeNewFile(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Botão de adicionar imagem */}
          {totalEditMedia < MAX_MEDIA && (
            <>
              <input
                ref={mediaInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                aria-label="Adicionar imagens ao post"
                onChange={handleAddFiles}
              />
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary-600 transition-colors border border-dashed border-surface-border hover:border-primary-300 rounded-xl px-3 py-2 w-full justify-center"
              >
                <ImagePlus className="w-4 h-4" />
                Adicionar imagem
                <span className="text-xs opacity-60">({totalEditMedia}/{MAX_MEDIA})</span>
              </button>
            </>
          )}

          {/* Barra de ações */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {MAX_CHARS - editContent.length < 500 ? `${MAX_CHARS - editContent.length} restantes` : ''}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving || (!editContent.trim() && totalEditMedia === 0)}
                className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Conteúdo normal ── */
        content && (
          <div className="mb-3">
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
              {displayContent}
            </p>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 mt-1 text-xs text-primary-600 hover:underline"
              >
                {expanded
                  ? <><ChevronUp className="w-3 h-3" /> Ver menos</>
                  : <><ChevronDown className="w-3 h-3" /> Ver mais</>}
              </button>
            )}
          </div>
        )
      )}

      {/* Resumo IA */}
      {!editing && showSummary && summary && (
        <div className="mb-3 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-primary-500" />
            <span className="text-xs font-medium text-primary-700">Resumo gerado por IA</span>
          </div>
          <p className="text-xs text-primary-900 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Mídia (modo leitura) */}
      {!editing && hasMedia && (
        <div className={cn(
          'mb-3 rounded-xl overflow-hidden grid gap-1',
          post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
        )}>
          {post.media_urls.slice(0, 4).map((media, i) => (
            <div
              key={i}
              className={cn(
                'bg-muted relative overflow-hidden',
                post.media_urls.length === 1 ? 'aspect-video' : 'aspect-square',
                post.media_urls.length === 3 && i === 0 ? 'row-span-2' : '',
              )}
            >
              {media.type?.startsWith('video') ? (
                <video src={media.url} controls className="w-full h-full object-cover" />
              ) : (
                <img src={media.url} alt={media.alt_text ?? `Imagem ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              )}
              {i === 3 && post.media_urls.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">+{post.media_urls.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Barra inferior */}
      {!editing && (
        <div className="border-t border-surface-border pt-2 -mx-1">
          {isLong && (
            <div className="flex justify-end mb-1 px-1">
              <button
                type="button"
                onClick={handleSummarize}
                disabled={summaryLoading}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary-600 transition-colors"
              >
                {summaryLoading
                  ? <div className="w-3 h-3 border border-primary-500 border-t-transparent rounded-full animate-spin" />
                  : <Sparkles className="w-3 h-3" />}
                {summaryLoading ? 'Resumindo…' : showSummary ? 'Ocultar resumo' : 'Resumir com IA'}
              </button>
            </div>
          )}
          <ReactionBar post={post} onReactionChange={onReactionChange} />
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir post"
        message="Tem certeza que deseja excluir este post? Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </article>
  )
}
