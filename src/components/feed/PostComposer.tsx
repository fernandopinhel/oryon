import { useState, useRef, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { Image, Globe, Users, Lock, ChevronDown, Hash, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { suggestHashtags } from '@/lib/ai'
import { getInitials, cn } from '@/lib/utils'
import { toast } from '@/components/ui/Toast'
import type { FeedPost } from '@/hooks/useFeed'

type Visibility = 'public' | 'connections' | 'private'

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: typeof Globe }[] = [
  { value: 'public',      label: 'Público',    icon: Globe  },
  { value: 'connections', label: 'Conexões',   icon: Users  },
  { value: 'private',     label: 'Privado',    icon: Lock   },
]

const MAX_CHARS = 10_000
const HASHTAG_THRESHOLD = 200
const MAX_IMAGES = 4
const MAX_FILE_MB = 10

interface MediaPreview {
  file: File
  url: string
  type: string
}

interface Props {
  onPostCreated: (post: FeedPost) => void
  groupId?: string
}

export default function PostComposer({ onPostCreated, groupId }: Props) {
  const { user, profile } = useAuthStore()
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [visMenuOpen, setVisMenuOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [hashtagLoading, setHashtagLoading] = useState(false)
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [mediaFiles, setMediaFiles] = useState<MediaPreview[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const charsLeft = MAX_CHARS - content.length
  const canSubmit = (content.trim().length > 0 || mediaFiles.length > 0) && !submitting

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 300)}px`
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    if (e.target.value.length > MAX_CHARS) return
    setContent(e.target.value)
    autoResize()
    setSuggestedTags([])
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const remaining = MAX_IMAGES - mediaFiles.length
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens por post.`)
      return
    }

    const accepted: MediaPreview[] = []
    for (const file of files.slice(0, remaining)) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`"${file.name}" é maior que ${MAX_FILE_MB}MB e foi ignorado.`)
        continue
      }
      accepted.push({ file, url: URL.createObjectURL(file), type: file.type })
    }

    setMediaFiles((prev) => [...prev, ...accepted])
    e.target.value = ''
  }

  function removeMedia(idx: number) {
    setMediaFiles((prev) => {
      URL.revokeObjectURL(prev[idx].url)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function uploadMedia(): Promise<Array<{ url: string; type: string }>> {
    if (!user || mediaFiles.length === 0) return []

    const results: Array<{ url: string; type: string }> = []

    for (const media of mediaFiles) {
      const ext = media.file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('post-media')
        .upload(path, media.file, { contentType: media.type, upsert: false })

      if (error) throw new Error(`Falha ao enviar imagem: ${error.message}`)

      const { data } = supabase.storage.from('post-media').getPublicUrl(path)
      results.push({ url: data.publicUrl, type: media.type })
    }

    return results
  }

  async function handleHashtagSuggest() {
    if (content.length < HASHTAG_THRESHOLD) return
    setHashtagLoading(true)
    try {
      const tags = await suggestHashtags(content)
      setSuggestedTags(tags)
    } catch { /* silencia */ }
    finally { setHashtagLoading(false) }
  }

  function insertHashtag(tag: string) {
    const appendix = content.endsWith(' ') || content.length === 0 ? `#${tag}` : ` #${tag}`
    const next = content + appendix
    if (next.length > MAX_CHARS) return
    setContent(next)
    setSuggestedTags((prev) => prev.filter((t) => t !== tag))
    textareaRef.current?.focus()
    autoResize()
  }

  function reset() {
    setContent('')
    setSuggestedTags([])
    mediaFiles.forEach((m) => URL.revokeObjectURL(m.url))
    setMediaFiles([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (!canSubmit || !user) return
    setSubmitting(true)

    try {
      const uploadedMedia = await uploadMedia()

      const { data, error: insertError } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          content: content.trim() || null,
          visibility: groupId ? 'group' : visibility,
          post_type: uploadedMedia.length > 0 ? 'image' : 'text',
          media_urls: uploadedMedia,
          ...(groupId ? { group_id: groupId } : {}),
        })
        .select('*, author:profiles!author_id(username, full_name, avatar_url, is_verified)')
        .single()

      if (insertError) throw insertError

      onPostCreated({ ...(data as FeedPost), user_reaction: null })
      toast.success('Post publicado!')
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao publicar. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedVis = VISIBILITY_OPTIONS.find((v) => v.value === visibility)!
  const VisIcon = selectedVis.icon

  return (
    <div className="card p-4">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center overflow-hidden shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
          ) : (
            getInitials(profile?.full_name ?? 'U')
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={groupId ? 'Escreva algo para o grupo…' : 'No que você está pensando?'}
            rows={2}
            className="w-full resize-none bg-transparent text-sm text-slate-900 placeholder:text-muted-foreground focus:outline-none leading-relaxed min-h-14"
          />

          {/* Preview de imagens */}
          {mediaFiles.length > 0 && (
            <div className={cn(
              'grid gap-1.5 mb-3 rounded-xl overflow-hidden',
              mediaFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
            )}>
              {mediaFiles.map((m, i) => (
                <div key={i} className={cn(
                  'relative group bg-muted rounded-xl overflow-hidden',
                  mediaFiles.length === 1 ? 'aspect-video' : 'aspect-square',
                )}>
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remover imagem"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hashtags sugeridas pela IA */}
          {suggestedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertHashtag(tag)}
                  className="text-xs px-2 py-1 bg-primary-50 text-primary-700 border border-primary-200 rounded-full hover:bg-primary-100 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Upload de imagem */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              multiple
              aria-label="Adicionar imagens ao post"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={mediaFiles.length >= MAX_IMAGES}
              title={mediaFiles.length >= MAX_IMAGES ? `Máximo de ${MAX_IMAGES} imagens` : 'Adicionar imagem'}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                mediaFiles.length >= MAX_IMAGES
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-500 hover:bg-muted hover:text-primary-600',
              )}
            >
              <Image className="w-4 h-4" />
            </button>

            {/* Sugestão de hashtags */}
            {content.length >= HASHTAG_THRESHOLD && (
              <button
                type="button"
                onClick={handleHashtagSuggest}
                disabled={hashtagLoading}
                title="Sugerir hashtags com IA"
                className="flex items-center gap-1 p-1.5 rounded-lg text-slate-500 hover:bg-muted hover:text-primary-600 transition-colors text-xs"
              >
                {hashtagLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Hash className="w-4 h-4" />
                }
                <span className="hidden sm:inline">Hashtags IA</span>
              </button>
            )}

            {/* Seletor de visibilidade */}
            {!groupId && (
              <div className="relative ml-auto">
                <button
                  type="button"
                  onClick={() => setVisMenuOpen((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <VisIcon className="w-3.5 h-3.5" />
                  <span>{selectedVis.label}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {visMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-1 w-40 card shadow-lg py-1 z-10">
                    {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setVisibility(value); setVisMenuOpen(false) }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors',
                          value === visibility
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-slate-700 hover:bg-muted',
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Contador de caracteres */}
            <span className={cn(
              'text-xs tabular-nums',
              charsLeft < 200 ? charsLeft < 50 ? 'text-red-500' : 'text-amber-500' : 'text-muted-foreground',
            )}>
              {charsLeft < 1000 ? charsLeft : ''}
            </span>

            {/* Publicar */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!canSubmit}
              className="btn-primary px-4 py-1.5 text-sm flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
