import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, FileText, Lock, EyeOff, Globe, Settings, UserPlus, LogOut, Loader2, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/Toast'
import type { GroupSummary } from '@/hooks/useGroups'
import type { Membership } from '@/hooks/useGroup'

const GRADIENTS = [
  'from-violet-400 to-indigo-500', 'from-blue-400 to-cyan-500',
  'from-emerald-400 to-teal-500',  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',  'from-fuchsia-400 to-purple-500',
]
function groupGradient(name: string) {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length
  return GRADIENTS[idx]
}

const PRIVACY_INFO = {
  public:  { icon: Globe,  label: 'Grupo público',  desc: 'Qualquer pessoa pode ver e participar.' },
  private: { icon: Lock,   label: 'Grupo privado',  desc: 'Qualquer pessoa pode ver, mas o conteúdo é exclusivo para membros.' },
  secret:  { icon: EyeOff, label: 'Grupo secreto',  desc: 'Visível apenas para membros.' },
}

interface Props {
  group: GroupSummary
  membership: Membership
  onJoin: () => void
  onLeave: () => void
  busy?: boolean
  onImagesUpdate?: (patch: { cover_url?: string; avatar_url?: string }) => void
}

export default function GroupHeader({ group, membership, onJoin, onLeave, busy, onImagesUpdate }: Props) {
  const { user } = useAuthStore()
  const gradient = groupGradient(group.name)
  const privInfo = PRIVACY_INFO[group.privacy]
  const PrivIcon = privInfo.icon
  const isAdmin = membership.role === 'admin'

  const [coverUrl, setCoverUrl] = useState(group.cover_url)
  const [avatarUrl, setAvatarUrl] = useState(group.avatar_url)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const coverInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 5 * 1024 * 1024) { toast.error('A capa deve ter no máximo 5MB.'); return }

    setUploadingCover(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${group.id}/cover.${ext}`

      const { error: upErr } = await supabase.storage
        .from('covers')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('covers').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`

      await supabase.from('groups').update({ cover_url: url }).eq('id', group.id)
      setCoverUrl(url)
      onImagesUpdate?.({ cover_url: url })
      toast.success('Capa do grupo atualizada!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar capa.')
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 2 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 2MB.'); return }

    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${group.id}/avatar.${ext}`

      const { error: upErr } = await supabase.storage
        .from('covers')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('covers').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`

      await supabase.from('groups').update({ avatar_url: url }).eq('id', group.id)
      setAvatarUrl(url)
      onImagesUpdate?.({ avatar_url: url })
      toast.success('Imagem do grupo atualizada!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar imagem.')
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  return (
    <div className="card overflow-hidden">
      {/* Capa */}
      <div className={`h-40 sm:h-52 bg-gradient-to-br ${gradient} relative group`}>
        {coverUrl && (
          <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}

        {isAdmin && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Alterar foto de capa do grupo"
              className="hidden"
              onChange={handleCoverChange}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              title="Alterar capa do grupo"
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-medium rounded-lg backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
            >
              {uploadingCover
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Camera className="w-3.5 h-3.5" />}
              {uploadingCover ? 'Enviando…' : 'Alterar capa'}
            </button>
          </>
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Avatar + ação */}
        <div className="flex items-end justify-between -mt-10 mb-4">
          {/* Avatar do grupo */}
          <div className="relative group/gavatar">
            <div className={`w-20 h-20 rounded-2xl border-4 border-surface bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-2xl shadow-sm overflow-hidden`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={group.name} className="w-full h-full object-cover" />
              ) : (
                group.name[0].toUpperCase()
              )}
            </div>

            {isAdmin && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  aria-label="Alterar imagem do grupo"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Alterar imagem do grupo"
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-2xl opacity-0 group-hover/gavatar:opacity-100 transition-opacity"
                >
                  {uploadingAvatar
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <Camera className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 mt-10 sm:mt-12 flex-wrap justify-end">
            {isAdmin && (
              <Link
                to={`/grupos/${group.id}/editar`}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <Settings className="w-4 h-4" />
                Gerenciar
              </Link>
            )}

            {group.privacy !== 'secret' && (
              membership.isMember ? (
                <button
                  type="button"
                  onClick={onLeave}
                  disabled={busy}
                  className="btn-secondary text-sm flex items-center gap-1.5 text-muted-foreground"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  Sair do grupo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onJoin}
                  disabled={busy}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Participar
                </button>
              )
            )}
          </div>
        </div>

        {/* Nome e info */}
        <h1 className="text-xl font-bold text-slate-900 mb-1">{group.name}</h1>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <PrivIcon className="w-4 h-4 shrink-0" />
            {privInfo.label}
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {group.members_count.toLocaleString('pt-BR')} membros
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {group.posts_count.toLocaleString('pt-BR')} posts
          </span>
        </div>

        {group.description && (
          <p className="text-sm text-slate-700 leading-relaxed mb-3">{group.description}</p>
        )}

        {group.category && (
          <span className="inline-flex text-xs px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200 font-medium">
            {group.category}
          </span>
        )}

        {membership.isMember && (
          <div className={cn(
            'mt-3 text-xs px-3 py-2 rounded-lg border inline-flex items-center gap-1.5',
            membership.role === 'admin'
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : membership.role === 'moderator'
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700',
          )}>
            <span className="font-medium">
              {membership.role === 'admin' ? '⭐ Admin' :
               membership.role === 'moderator' ? '🛡 Moderador' : '✓ Membro'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
