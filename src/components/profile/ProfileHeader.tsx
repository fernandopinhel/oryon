import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Link2, Briefcase, BadgeCheck, Pencil, MessageCircle, Camera, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { getInitials } from '@/lib/utils'
import { toast } from '@/components/ui/Toast'
import ConnectionButton from './ConnectionButton'
import type { Profile } from '@/lib/supabase'
import type { ConnectionInfo } from '@/hooks/useProfile'

interface Props {
  profile: Profile
  connectionInfo: ConnectionInfo
  onConnectionChange: (info: ConnectionInfo) => void
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="font-bold text-slate-900 text-lg leading-none">{formatCount(value)}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

const GRADIENTS = [
  'from-violet-400 to-indigo-500', 'from-blue-400 to-cyan-500',
  'from-emerald-400 to-teal-500',  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',
]

export default function ProfileHeader({ profile, connectionInfo, onConnectionChange }: Props) {
  const { user, refreshProfile } = useAuthStore()
  const isOwn = user?.id === profile.id

  const [coverUrl, setCoverUrl] = useState(profile.cover_url)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const coverInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const gradientIndex =
    profile.username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % GRADIENTS.length
  const gradient = GRADIENTS[gradientIndex]

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 5 * 1024 * 1024) { toast.error('A capa deve ter no máximo 5MB.'); return }

    setUploadingCover(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/cover.${ext}`

      const { error: upErr } = await supabase.storage
        .from('covers')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('covers').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`

      await supabase.from('profiles').update({ cover_url: url }).eq('id', user.id)
      setCoverUrl(url)
      await refreshProfile()
      toast.success('Capa atualizada!')
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
    if (file.size > 2 * 1024 * 1024) { toast.error('O avatar deve ter no máximo 2MB.'); return }

    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/avatar.${ext}`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`

      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      setAvatarUrl(url)
      await refreshProfile()
      toast.success('Foto de perfil atualizada!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar foto.')
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  return (
    <div className="card overflow-hidden">
      {/* Cover */}
      <div className={`h-36 sm:h-44 bg-gradient-to-br ${gradient} relative group`}>
        {coverUrl && (
          <img src={coverUrl} alt="Capa do perfil" className="absolute inset-0 w-full h-full object-cover" />
        )}

        {isOwn && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Alterar foto de capa"
              className="hidden"
              onChange={handleCoverChange}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              title="Alterar foto de capa"
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

      {/* Conteúdo abaixo do cover */}
      <div className="px-4 pb-4">
        {/* Avatar + botão de ação */}
        <div className="flex items-end justify-between -mt-12 mb-3">
          {/* Avatar com botão de upload */}
          <div className="relative group/avatar">
            <div className="w-24 h-24 rounded-full border-4 border-surface bg-primary-100 text-primary-700 font-bold text-2xl flex items-center justify-center overflow-hidden shadow-sm shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                getInitials(profile.full_name)
              )}
            </div>

            {isOwn && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  aria-label="Alterar foto de perfil"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Alterar foto de perfil"
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                >
                  {uploadingAvatar
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <Camera className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>

          {/* Ação: editar (próprio) ou conectar + mensagem (outro) */}
          <div className="mt-12 sm:mt-14 flex items-center gap-2 flex-wrap justify-end">
            {isOwn ? (
              <Link to="/perfil/editar" className="btn-secondary flex items-center gap-2 text-sm">
                <Pencil className="w-4 h-4" />
                Editar perfil
              </Link>
            ) : (
              <>
                <ConnectionButton
                  targetUserId={profile.id}
                  initialInfo={connectionInfo}
                  onStatusChange={onConnectionChange}
                />
                <Link
                  to={`/mensagens/${profile.id}`}
                  className="btn-secondary p-2"
                  aria-label="Enviar mensagem"
                  title="Enviar mensagem"
                >
                  <MessageCircle className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Nome e username */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{profile.full_name}</h1>
            {profile.is_verified && (
              <BadgeCheck className="w-5 h-5 text-primary-500 shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>

        {profile.bio && (
          <p className="text-sm text-slate-700 leading-relaxed mb-3 whitespace-pre-wrap">{profile.bio}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-sm text-muted-foreground">
          {profile.occupation && (
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              {profile.occupation}
            </span>
          )}
          {profile.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {profile.location}
            </span>
          )}
          {profile.website_url && (
            <a
              href={profile.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary-600 hover:underline"
            >
              <Link2 className="w-3.5 h-3.5 shrink-0" />
              {profile.website_url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-surface-border pt-3">
          <StatItem value={profile.posts_count}     label="Posts" />
          <StatItem value={profile.followers_count} label="Seguidores" />
          <StatItem value={profile.following_count} label="Seguindo" />
        </div>
      </div>
    </div>
  )
}
