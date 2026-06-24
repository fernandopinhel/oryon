import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Globe, Users, Lock, Plus, X, ImagePlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useProjects, type ProjectStatus, type ProjectVisibility } from '@/hooks/useProjects'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS: { value: ProjectStatus; label: string; desc: string }[] = [
  { value: 'planning',  label: 'Planejamento', desc: 'Ainda definindo escopo e equipe' },
  { value: 'active',    label: 'Ativo',         desc: 'Em desenvolvimento agora' },
  { value: 'on_hold',   label: 'Pausado',        desc: 'Temporariamente parado' },
]

const VISIBILITY_OPTIONS: { value: ProjectVisibility; label: string; desc: string; Icon: typeof Globe }[] = [
  { value: 'public',      label: 'Público',      desc: 'Qualquer usuário pode visualizar', Icon: Globe  },
  { value: 'connections', label: 'Conexões',     desc: 'Apenas suas conexões',              Icon: Users  },
  { value: 'private',     label: 'Privado',      desc: 'Somente membros convidados',        Icon: Lock   },
]

function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function CreateProject() {
  const navigate                   = useNavigate()
  const { user }                   = useAuthStore()
  const { createProject }          = useProjects()

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [status,      setStatus]      = useState<ProjectStatus>('planning')
  const [visibility,  setVisibility]  = useState<ProjectVisibility>('public')
  const [dueDate,     setDueDate]     = useState('')
  const [tagInput,    setTagInput]    = useState('')
  const [tags,        setTags]        = useState<string[]>([])
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile,    setCoverFile]    = useState<File | null>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  function handleCoverChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Imagem muito grande. Máx: 10MB.'); return }
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverPreview(URL.createObjectURL(file))
    setCoverFile(file)
    e.target.value = ''
  }

  function removeCover() {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverPreview(null)
    setCoverFile(null)
  }

  function addTag() {
    const raw = tagInput.trim().toLowerCase()
    const slug = slugify(raw)
    if (slug && !tags.includes(slug) && tags.length < 10) {
      setTags((prev) => [...prev, slug])
    }
    setTagInput('')
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError(null)

    try {
      let cover_url: string | null = null

      if (coverFile) {
        const ext  = coverFile.name.split('.').pop() ?? 'jpg'
        const path = `project-covers/${user!.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('chat-media')
          .upload(path, coverFile, { upsert: false, contentType: coverFile.type })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path)
        cover_url = publicUrl
      }

      const id = await createProject({
        title:       title.trim(),
        description: description.trim() || undefined,
        cover_url,
        status,
        visibility,
        due_date:    dueDate || undefined,
        tags,
      })
      navigate(`/projetos/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar projeto')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Volta */}
      <Link
        to="/projetos"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-slate-900 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para projetos
      </Link>

      <div className="card p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-6">Novo projeto</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Capa */}
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">Capa do projeto</span>
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
              aria-label="Selecionar imagem de capa"
            />
            {coverPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={coverPreview} alt="Capa" className="w-full h-40 object-cover" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => coverRef.current?.click()}
                    className="px-2.5 py-1 bg-black/60 text-white text-xs rounded-lg hover:bg-black/80 transition-colors flex items-center gap-1"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    Trocar
                  </button>
                  <button
                    type="button"
                    onClick={removeCover}
                    className="px-2 py-1 bg-red-500/80 text-white text-xs rounded-lg hover:bg-red-600/90 transition-colors"
                    aria-label="Remover capa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                className="w-full h-28 border-2 border-dashed border-surface-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/40 transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-sm">Adicionar capa</span>
                <span className="text-xs opacity-70">Recomendado: 1200×400 · Máx 10MB</span>
              </button>
            )}
          </div>

          {/* Título */}
          <div>
            <label htmlFor="proj-title" className="block text-sm font-medium text-slate-700 mb-1">
              Título *
            </label>
            <input
              id="proj-title"
              type="text"
              required
              maxLength={150}
              value={title}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              className="input"
              placeholder="Ex.: App de gestão de tarefas"
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="proj-desc" className="block text-sm font-medium text-slate-700 mb-1">
              Descrição
            </label>
            <textarea
              id="proj-desc"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input resize-none"
              placeholder="Explique o objetivo e contexto do projeto…"
            />
          </div>

          {/* Status */}
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">Status inicial</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {STATUS_OPTIONS.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  className={cn(
                    'text-left p-3 rounded-xl border-2 transition-colors text-sm',
                    status === value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-surface-border hover:border-muted-foreground/30',
                  )}
                >
                  <span className={cn('font-medium block', status === value ? 'text-primary-700' : 'text-slate-700')}>
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Visibilidade */}
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">Visibilidade</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {VISIBILITY_OPTIONS.map(({ value, label, desc, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setVisibility(value)}
                  className={cn(
                    'text-left p-3 rounded-xl border-2 transition-colors text-sm',
                    visibility === value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-surface-border hover:border-muted-foreground/30',
                  )}
                >
                  <Icon className={cn('w-4 h-4 mb-1', visibility === value ? 'text-primary-600' : 'text-muted-foreground')} />
                  <span className={cn('font-medium block', visibility === value ? 'text-primary-700' : 'text-slate-700')}>
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prazo */}
          <div>
            <label htmlFor="proj-due" className="block text-sm font-medium text-slate-700 mb-1">
              Prazo (opcional)
            </label>
            <input
              id="proj-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input w-48"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="proj-tag" className="block text-sm font-medium text-slate-700 mb-1">
              Tags <span className="font-normal text-muted-foreground">(máx. 10)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                id="proj-tag"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="input flex-1"
                placeholder="Digite e pressione Enter"
                maxLength={30}
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!tagInput.trim() || tags.length >= 10}
                className="btn-secondary px-3 flex items-center gap-1"
                aria-label="Adicionar tag"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-700 font-medium"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-primary-900 transition-colors"
                      aria-label={`Remover tag ${tag}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Erro */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Ações */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-border">
            <Link to="/projetos" className="btn-secondary px-5">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="btn-primary px-5 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Criando…' : 'Criar projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
