import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Globe, Lock, EyeOff, Loader2, Trash2, AlertCircle, ShieldAlert,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/utils'
import type { GroupSummary } from '@/hooks/useGroups'

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

export default function GroupEdit() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [group,       setGroup]       = useState<GroupSummary | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [isAdmin,     setIsAdmin]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  // Form fields
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [privacy,     setPrivacy]     = useState<Privacy>('public')
  const [category,    setCategory]    = useState('')
  const [tagsInput,   setTagsInput]   = useState('')

  const [submitting,  setSubmitting]  = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  useEffect(() => {
    if (!id || !user) return

    async function load() {
      setLoading(true)

      const [{ data: groupData }, { data: memData }] = await Promise.all([
        supabase.from('groups').select('*').eq('id', id).single(),
        supabase.from('group_members').select('role').eq('group_id', id).eq('user_id', user!.id).maybeSingle(),
      ])

      if (!groupData) {
        setError('Grupo não encontrado.')
        setLoading(false)
        return
      }

      const g = groupData as GroupSummary
      setGroup(g)

      const admin = memData?.role === 'admin'
      setIsAdmin(admin)

      if (admin) {
        setName(g.name)
        setDescription(g.description ?? '')
        setPrivacy(g.privacy)
        setCategory(g.category ?? '')
        // tags: fetch from groups where tags is array
        const { data: full } = await supabase
          .from('groups')
          .select('tags')
          .eq('id', id!)
          .single()
        setTagsInput(((full as { tags?: string[] })?.tags ?? []).join(', '))
      }

      setLoading(false)
    }

    load()
  }, [id, user])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!group) return
    setSubmitting(true)

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10)

    const { error: upErr } = await supabase
      .from('groups')
      .update({
        name:        name.trim(),
        description: description.trim() || null,
        privacy,
        category:    category || null,
        tags,
      })
      .eq('id', group.id)

    setSubmitting(false)

    if (upErr) {
      toast.error('Não foi possível salvar as alterações.')
    } else {
      toast.success('Grupo atualizado.')
      navigate(`/grupos/${group.id}`)
    }
  }

  async function handleDelete() {
    if (!group) return
    setDeleting(true)
    setConfirmDelete(false)

    const { error: delErr } = await supabase
      .from('groups')
      .update({ is_active: false })
      .eq('id', group.id)

    setDeleting(false)

    if (delErr) {
      toast.error('Não foi possível excluir o grupo.')
    } else {
      toast.success('Grupo excluído.')
      navigate('/grupos')
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="card h-40 animate-pulse bg-muted" />
        <div className="card h-64 animate-pulse bg-muted" />
      </div>
    )
  }

  // ── Grupo não encontrado ──
  if (error || !group) {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold text-slate-900 mb-4">{error ?? 'Grupo não encontrado.'}</p>
        <Link to="/grupos" className="btn-primary text-sm px-4 py-2">Ver grupos</Link>
      </div>
    )
  }

  // ── Sem permissão ──
  if (!isAdmin) {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="font-semibold text-slate-900 mb-1">Acesso restrito</p>
        <p className="text-sm text-muted-foreground mb-4">
          Apenas administradores podem editar este grupo.
        </p>
        <Link to={`/grupos/${group.id}`} className="btn-secondary text-sm px-4 py-2">
          Voltar ao grupo
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={`/grupos/${group.id}`}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-slate-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Editar grupo</h1>
          <p className="text-sm text-muted-foreground">{group.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Informações básicas */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-slate-900">Informações básicas</h2>

          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-slate-700 mb-1">
              Nome do grupo *
            </label>
            <input
              id="edit-name"
              type="text"
              required
              minLength={3}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="edit-desc" className="block text-sm font-medium text-slate-700 mb-1">
              Descrição <span className="font-normal text-muted-foreground">({description.length}/2000)</span>
            </label>
            <textarea
              id="edit-desc"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input resize-none"
              placeholder="Sobre o que é este grupo?"
            />
          </div>

          <div>
            <label htmlFor="edit-category" className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
            <select
              id="edit-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              <option value="">Sem categoria</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="edit-tags" className="block text-sm font-medium text-slate-700 mb-1">
              Tags <span className="font-normal text-muted-foreground">(separadas por vírgula)</span>
            </label>
            <input
              id="edit-tags"
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

        {/* Ações do formulário */}
        <div className="flex gap-3">
          <Link
            to={`/grupos/${group.id}`}
            className="btn-secondary flex-1 text-center"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      {/* Zona de perigo */}
      <div className="card p-5 mt-5 border-red-200">
        <h2 className="font-semibold text-sm text-red-700 mb-3">Zona de perigo</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Excluir grupo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Remove o grupo permanentemente. Todos os posts e membros serão desassociados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            className="btn-secondary text-sm px-4 py-2 text-red-600 border-red-200 hover:bg-red-50 shrink-0 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir grupo"
        message={`Tem certeza que deseja excluir "${group.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir grupo"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
