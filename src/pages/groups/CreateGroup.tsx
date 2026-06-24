import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Loader2, Globe, Lock, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

type Privacy = 'public' | 'private' | 'secret'

const PRIVACY_OPTIONS: { value: Privacy; label: string; desc: string; icon: typeof Globe }[] = [
  { value: 'public',  label: 'Público',  icon: Globe,  desc: 'Qualquer pessoa pode ver e participar.' },
  { value: 'private', label: 'Privado',  icon: Lock,   desc: 'Qualquer pessoa pode ver, mas só membros veem o conteúdo.' },
  { value: 'secret',  label: 'Secreto',  icon: EyeOff, desc: 'Invisível para não-membros. Acesso apenas por convite.' },
]

const CATEGORIES = [
  'Tecnologia', 'Design', 'Negócios', 'Marketing', 'Educação',
  'Saúde', 'Ciência', 'Arte & Cultura', 'Esportes', 'Comunidade',
]

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export default function CreateGroup() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [name,        setName]        = useState('')
  const [slug,        setSlug]        = useState('')
  const [slugEdited,  setSlugEdited]  = useState(false)
  const [description, setDescription] = useState('')
  const [privacy,     setPrivacy]     = useState<Privacy>('public')
  const [category,    setCategory]    = useState('')
  const [tagsInput,   setTagsInput]   = useState('')

  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [slugError,  setSlugError]  = useState<string | null>(null)

  function handleNameChange(v: string) {
    setName(v)
    if (!slugEdited) {
      setSlug(generateSlug(v))
    }
  }

  function handleSlugChange(v: string) {
    const clean = v.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60)
    setSlug(clean)
    setSlugEdited(true)
    if (clean.length > 0 && clean.length < 3) {
      setSlugError('Mínimo 3 caracteres.')
    } else {
      setSlugError(null)
    }
  }

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Imagem muito grande. Máx: 2 MB.'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || slugError) return
    setSubmitting(true)
    setError(null)

    try {
      let avatarUrl: string | null = null

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() ?? 'jpg'
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
        if (upErr) throw upErr
        avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      }

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10)

      const { data, error: insertErr } = await supabase
        .from('groups')
        .insert({
          name:        name.trim(),
          slug:        slug.trim(),
          description: description.trim() || null,
          privacy,
          category:    category || null,
          tags,
          creator_id:  user.id,
          avatar_url:  avatarUrl,
        })
        .select('id')
        .single()

      if (insertErr) {
        if (insertErr.code === '23505') {
          setSlugError('Este identificador já está em uso.')
          return
        }
        throw insertErr
      }

      // Cria o grupo e adiciona o criador como admin
      await supabase.from('group_members').insert({
        group_id: data.id,
        user_id:  user.id,
        role:     'admin',
      })

      navigate(`/grupos/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar grupo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Criar grupo</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Avatar do grupo */}
        <div className="card p-5">
          <label className="block text-sm font-medium text-slate-700 mb-3">Ícone do grupo</label>
          <div className="flex items-center gap-4">
            <label htmlFor="group-avatar" className="cursor-pointer">
              <div className="w-20 h-20 rounded-2xl bg-primary-100 text-primary-700 font-bold text-2xl flex items-center justify-center overflow-hidden relative group border-2 border-dashed border-primary-200 hover:border-primary-400 transition-colors">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Ícone" className="w-full h-full object-cover" />
                ) : (
                  name ? name[0].toUpperCase() : <Camera className="w-6 h-6 text-primary-400" />
                )}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <input
                id="group-avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleAvatarChange}
                aria-label="Escolher ícone do grupo"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Opcional. JPG, PNG ou WebP · máx. 2 MB.<br />
              Se não for enviado, usará a inicial do nome.
            </p>
          </div>
        </div>

        {/* Informações básicas */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-slate-900">Informações básicas</h2>

          <div>
            <label htmlFor="group-name" className="block text-sm font-medium text-slate-700 mb-1">
              Nome do grupo *
            </label>
            <input
              id="group-name"
              type="text"
              required
              minLength={3}
              maxLength={100}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="input"
              placeholder="Ex: Devs de São Paulo"
            />
          </div>

          <div>
            <label htmlFor="group-slug" className="block text-sm font-medium text-slate-700 mb-1">
              Identificador único (URL) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">
                oryon.app/grupos/
              </span>
              <input
                id="group-slug"
                type="text"
                required
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className={cn('input pl-[130px]', slugError && 'border-red-400')}
                placeholder="devs-sp"
              />
            </div>
            {slugError && <p className="text-xs text-red-600 mt-1">{slugError}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Letras minúsculas, números e hífens. Não pode ser alterado depois.
            </p>
          </div>

          <div>
            <label htmlFor="group-desc" className="block text-sm font-medium text-slate-700 mb-1">
              Descrição <span className="font-normal text-muted-foreground">({description.length}/2000)</span>
            </label>
            <textarea
              id="group-desc"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input resize-none"
              placeholder="Sobre o que é este grupo?"
            />
          </div>

          <div>
            <label htmlFor="group-category" className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
            <select
              id="group-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              <option value="">Selecionar categoria…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="group-tags" className="block text-sm font-medium text-slate-700 mb-1">
              Tags <span className="font-normal text-muted-foreground">(separadas por vírgula)</span>
            </label>
            <input
              id="group-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="input"
              placeholder="react, frontend, typescript"
            />
          </div>
        </div>

        {/* Privacidade */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-sm text-slate-900">Privacidade</h2>

          {PRIVACY_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
            <label
              key={value}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                privacy === value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-surface-border hover:bg-muted',
              )}
            >
              <input
                type="radio"
                name="privacy"
                value={value}
                checked={privacy === value}
                onChange={() => setPrivacy(value)}
                className="sr-only"
              />
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                privacy === value ? 'bg-primary-500 text-white' : 'bg-muted text-muted-foreground',
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className={cn('text-sm font-medium', privacy === value ? 'text-primary-700' : 'text-slate-900')}>
                  {label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </label>
          ))}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/grupos')}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim() || !slug.trim() || !!slugError}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Criando…' : 'Criar grupo'}
          </button>
        </div>
      </form>
    </div>
  )
}
