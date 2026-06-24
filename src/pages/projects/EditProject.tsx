import { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Globe, Users, Lock, Plus, X,
  ImagePlus, Trash2, AlertCircle, Search, UserPlus, Shield, Crown,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useProject } from '@/hooks/useProject'
import type { ProjectMember } from '@/hooks/useProject'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { toast } from '@/components/ui/Toast'
import { cn, getInitials } from '@/lib/utils'
import { translateError } from '@/lib/errors'
import type { ProjectStatus, ProjectVisibility } from '@/hooks/useProjects'
import type { Profile } from '@/lib/supabase'

const STATUS_OPTIONS: { value: ProjectStatus; label: string; desc: string }[] = [
  { value: 'planning',  label: 'Planejamento', desc: 'Ainda definindo escopo e equipe' },
  { value: 'active',    label: 'Ativo',         desc: 'Em desenvolvimento agora' },
  { value: 'on_hold',   label: 'Pausado',        desc: 'Temporariamente parado' },
  { value: 'completed', label: 'Concluído',      desc: 'Projeto finalizado' },
  { value: 'archived',  label: 'Arquivado',      desc: 'Não está mais ativo' },
]

const VISIBILITY_OPTIONS: { value: ProjectVisibility; label: string; desc: string; Icon: typeof Globe }[] = [
  { value: 'public',      label: 'Público',  desc: 'Qualquer usuário pode visualizar', Icon: Globe  },
  { value: 'connections', label: 'Conexões', desc: 'Apenas suas conexões',              Icon: Users  },
  { value: 'private',     label: 'Privado',  desc: 'Somente membros convidados',        Icon: Lock   },
]

const ROLE_OPTIONS: { value: ProjectMember['role']; label: string }[] = [
  { value: 'manager',     label: 'Gerente'      },
  { value: 'contributor', label: 'Contribuidor' },
  { value: 'viewer',      label: 'Visualizador' },
]

const ROLE_LABELS: Record<ProjectMember['role'], string> = {
  owner:       'Dono',
  manager:     'Gerente',
  contributor: 'Contribuidor',
  viewer:      'Visualizador',
}

function slugify(text: string) {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function EditProject() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const { user }     = useAuthStore()
  const { project, loading, error, myRole, members, addMember, removeMember, updateMemberRole, deleteProject } = useProject(id ?? '')

  // Form state
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [status,      setStatus]      = useState<ProjectStatus>('planning')
  const [visibility,  setVisibility]  = useState<ProjectVisibility>('public')
  const [dueDate,     setDueDate]     = useState('')
  const [tagInput,    setTagInput]    = useState('')
  const [tags,        setTags]        = useState<string[]>([])

  // Cover state
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile,    setCoverFile]    = useState<File | null>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  const [saving,         setSaving]         = useState(false)
  const [formError,      setFormError]      = useState<string | null>(null)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [deleting,       setDeleting]       = useState(false)

  // Member management state
  const [memberSearch,       setMemberSearch]       = useState('')
  const [memberResults,      setMemberResults]      = useState<Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>[]>([])
  const [memberSearching,    setMemberSearching]    = useState(false)
  const [addingMemberId,     setAddingMemberId]     = useState<string | null>(null)
  const [removingMemberId,   setRemovingMemberId]   = useState<string | null>(null)
  const [updatingRoleId,     setUpdatingRoleId]     = useState<string | null>(null)
  const [memberToRemove,     setMemberToRemove]     = useState<ProjectMember | null>(null)

  // Pre-fill form when project loads
  useEffect(() => {
    if (!project) return
    setTitle(project.title)
    setDescription(project.description ?? '')
    setStatus(project.status)
    setVisibility(project.visibility)
    setDueDate(project.due_date ?? '')
    setTags(project.tags ?? [])
    setCoverPreview(project.cover_url ?? null)
  }, [project])

  // Redirect non-owners/managers
  useEffect(() => {
    if (!loading && myRole && myRole !== 'owner' && myRole !== 'manager') {
      navigate(`/projetos/${id}`)
    }
  }, [loading, myRole, id, navigate])

  function addTag() {
    const slug = slugify(tagInput.trim())
    if (slug && !tags.includes(slug) && tags.length < 10) setTags((p) => [...p, slug])
    setTagInput('')
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
  }

  function handleCoverChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Imagem muito grande. Máx: 10MB.'); return }
    if (coverPreview && !project?.cover_url) URL.revokeObjectURL(coverPreview)
    setCoverPreview(URL.createObjectURL(file))
    setCoverFile(file)
    e.target.value = ''
  }

  function removeCover() {
    if (coverPreview && !project?.cover_url) URL.revokeObjectURL(coverPreview)
    setCoverPreview(null)
    setCoverFile(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !project) return
    setSaving(true)
    setFormError(null)

    try {
      let cover_url: string | null = project.cover_url ?? null

      if (coverFile) {
        const ext  = coverFile.name.split('.').pop() ?? 'jpg'
        const path = `project-covers/${user!.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('chat-media')
          .upload(path, coverFile, { upsert: false, contentType: coverFile.type })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path)
        cover_url = publicUrl
      } else if (!coverPreview) {
        cover_url = null
      }

      const { error: updErr } = await supabase
        .from('projects')
        .update({
          title:       title.trim(),
          description: description.trim() || null,
          cover_url,
          status,
          visibility,
          due_date:    dueDate || null,
          tags:        tags,
        })
        .eq('id', id)

      if (updErr) throw updErr

      toast.success('Projeto atualizado!')
      navigate(`/projetos/${id}`)
    } catch (err) {
      setFormError(translateError(err))
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteProject()
      navigate('/projetos')
    } catch {
      toast.error('Erro ao excluir projeto')
      setDeleting(false)
    }
  }

  // ------ Member management ------
  const searchMembers = useCallback(async (q: string) => {
    if (q.length < 2) { setMemberResults([]); return }
    setMemberSearching(true)
    const alreadyIds = members.map((m) => m.user_id)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .not('id', 'in', `(${[user?.id, ...alreadyIds].join(',')})`)
      .limit(5)
    setMemberResults((data ?? []) as Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>[])
    setMemberSearching(false)
  }, [members, user?.id])

  useEffect(() => {
    const t = setTimeout(() => searchMembers(memberSearch), 300)
    return () => clearTimeout(t)
  }, [memberSearch, searchMembers])

  async function handleAddMember(profile: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>) {
    setAddingMemberId(profile.id)
    try {
      await addMember(profile.id, 'contributor')
      setMemberSearch('')
      setMemberResults([])
      toast.success(`${profile.full_name} adicionado ao projeto.`)
    } catch (err) {
      toast.error(translateError(err))
    } finally {
      setAddingMemberId(null)
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return
    setRemovingMemberId(memberToRemove.id)
    try {
      await removeMember(memberToRemove.id)
      toast.success('Membro removido.')
    } catch (err) {
      toast.error(translateError(err))
    } finally {
      setRemovingMemberId(null)
      setMemberToRemove(null)
    }
  }

  async function handleRoleChange(member: ProjectMember, role: ProjectMember['role']) {
    setUpdatingRoleId(member.id)
    try {
      await updateMemberRole(member.id, role)
    } catch (err) {
      toast.error(translateError(err))
    } finally {
      setUpdatingRoleId(null)
    }
  }

  // Can the current user change this member's role?
  function canChangeRole(member: ProjectMember) {
    if (member.role === 'owner') return false
    if (myRole === 'owner') return true
    if (myRole === 'manager' && member.role !== 'manager') return true
    return false
  }

  // Can the current user remove this member?
  function canRemoveMember(member: ProjectMember) {
    if (member.role === 'owner') return false
    if (myRole === 'owner') return true
    if (myRole === 'manager' && member.role !== 'manager') return true
    return false
  }

  // ----- Loading -----
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="card p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="max-w-2xl mx-auto card p-10 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium text-slate-700">Projeto não encontrado</p>
        <Link to="/projetos" className="btn-primary text-sm px-4 py-2 mt-4 inline-block">
          Ver projetos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Voltar */}
      <Link
        to={`/projetos/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para o projeto
      </Link>

      {/* --- Informações do projeto --- */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">Editar projeto</h1>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Excluir projeto
          </button>
        </div>

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
                <img
                  src={coverPreview}
                  alt="Capa do projeto"
                  className="w-full h-40 object-cover"
                />
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
            <span className="block text-sm font-medium text-slate-700 mb-2">Status</span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                  <span className={cn('font-medium block text-xs', status === value ? 'text-primary-700' : 'text-slate-700')}>
                    {label}
                  </span>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Visibilidade */}
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">Visibilidade</span>
            <div className="grid grid-cols-3 gap-2">
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
                      onClick={() => setTags((p) => p.filter((t) => t !== tag))}
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
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
          )}

          {/* Ações */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-border">
            <Link to={`/projetos/${id}`} className="btn-secondary px-5">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="btn-primary px-5 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>

      {/* --- Membros --- */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary-600" />
          <h2 className="text-base font-semibold text-slate-900">Membros e permissões</h2>
        </div>

        {/* Buscar e adicionar novo membro */}
        <div className="relative mb-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            {memberSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Buscar usuário por nome ou @username…"
              className="input pl-9 pr-9"
            />
          </div>

          {memberResults.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface border border-surface-border rounded-xl shadow-lg overflow-hidden">
              {memberResults.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold text-xs flex items-center justify-center overflow-hidden shrink-0">
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                      : getInitials(p.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">@{p.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddMember(p)}
                    disabled={addingMemberId === p.id}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-60"
                  >
                    {addingMemberId === p.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <UserPlus className="w-3.5 h-3.5" />}
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista de membros */}
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-surface-border bg-surface-secondary"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center overflow-hidden shrink-0">
                {member.profile.avatar_url
                  ? <img src={member.profile.avatar_url} alt={member.profile.full_name} className="w-full h-full object-cover" />
                  : getInitials(member.profile.full_name)}
              </div>

              {/* Nome */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {member.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  <p className="text-sm font-medium text-slate-900 truncate">{member.profile.full_name}</p>
                </div>
                <p className="text-xs text-muted-foreground">@{member.profile.username}</p>
              </div>

              {/* Role selector / label */}
              {canChangeRole(member) ? (
                <div className="relative">
                  {updatingRoleId === member.id && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground pointer-events-none" />
                  )}
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member, e.target.value as ProjectMember['role'])}
                    disabled={updatingRoleId === member.id}
                    aria-label={`Permissão de ${member.profile.full_name}`}
                    className="input text-xs py-1.5 pr-7 min-w-[120px]"
                  >
                    {ROLE_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className={cn(
                  'text-xs font-medium px-2.5 py-1 rounded-full',
                  member.role === 'owner'
                    ? 'bg-amber-100 text-amber-700'
                    : member.role === 'manager'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-muted text-muted-foreground',
                )}>
                  {ROLE_LABELS[member.role]}
                </span>
              )}

              {/* Remover */}
              {canRemoveMember(member) && (
                <button
                  type="button"
                  onClick={() => setMemberToRemove(member)}
                  disabled={removingMemberId === member.id}
                  className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Remover membro"
                >
                  {removingMemberId === member.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <X className="w-4 h-4" />}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-surface-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
          <span><span className="font-medium text-amber-600">Dono</span> — controle total</span>
          <span><span className="font-medium text-primary-600">Gerente</span> — editar e gerir membros</span>
          <span><span className="font-medium text-slate-600">Contribuidor</span> — criar e editar tarefas</span>
          <span><span className="font-medium text-slate-400">Visualizador</span> — somente leitura</span>
        </div>
      </div>

      {/* Confirm delete project */}
      <ConfirmDialog
        open={confirmDelete}
        title="Excluir projeto"
        message={`Tem certeza que deseja excluir "${project.title}"? Todas as tarefas e membros serão removidos. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir projeto"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* Confirm remove member */}
      <ConfirmDialog
        open={!!memberToRemove}
        title="Remover membro"
        message={`Remover ${memberToRemove?.profile.full_name} do projeto? Ele perderá acesso imediatamente.`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        variant="danger"
        loading={!!removingMemberId}
        onConfirm={handleRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  )
}
