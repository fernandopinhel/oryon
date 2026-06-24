import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Loader2, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { generateBio } from '@/lib/ai'
import { getInitials, cn } from '@/lib/utils'

const PRIVACY_OPTIONS = [
  { value: 'public',      label: 'Público — qualquer pessoa vê' },
  { value: 'connections', label: 'Conexões — somente quem você segue' },
  { value: 'private',     label: 'Privado — somente você' },
] as const

export default function EditProfile() {
  const { profile, refreshProfile } = useAuthStore()
  const navigate = useNavigate()

  const [fullName,    setFullName]    = useState(profile?.full_name    ?? '')
  const [username,    setUsername]    = useState(profile?.username     ?? '')
  const [bio,         setBio]         = useState(profile?.bio          ?? '')
  const [occupation,  setOccupation]  = useState(profile?.occupation   ?? '')
  const [location,    setLocation]    = useState(profile?.location     ?? '')
  const [websiteUrl,  setWebsiteUrl]  = useState(profile?.website_url  ?? '')
  const [profilePrivacy, setProfilePrivacy] = useState(profile?.profile_privacy ?? 'public')
  const [postsPrivacy,   setPostsPrivacy]   = useState(profile?.posts_privacy   ?? 'public')

  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null)
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)

  const [saving,     setSaving]     = useState(false)
  const [bioLoading, setBioLoading] = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo: 2 MB.')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handleUsernameChange(v: string) {
    const clean = v.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(clean)
    if (clean.length > 0 && clean.length < 3) {
      setUsernameError('Mínimo 3 caracteres.')
    } else if (clean.length > 30) {
      setUsernameError('Máximo 30 caracteres.')
    } else {
      setUsernameError(null)
    }
  }

  async function handleGenerateBio() {
    setBioLoading(true)
    try {
      const info = [fullName, occupation, location, websiteUrl].filter(Boolean).join(', ')
      const result = await generateBio(info || fullName)
      // Usa a primeira opção gerada (o agente retorna 3)
      const first = result.split('\n').find((l) => l.trim().length > 0) ?? result
      setBio(first.replace(/^\d+[.)]\s*/, '').slice(0, 500))
    } catch { /* silencia */ }
    finally { setBioLoading(false) }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (usernameError || !profile) return
    setSaving(true)
    setError(null)

    try {
      let avatarUrl = profile.avatar_url

      // Upload do avatar se houver novo arquivo
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() ?? 'jpg'
        const path = `${profile.id}/avatar.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })

        if (uploadErr) throw uploadErr

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          full_name:        fullName.trim(),
          username:         username.trim(),
          bio:              bio.trim() || null,
          occupation:       occupation.trim() || null,
          location:         location.trim() || null,
          website_url:      websiteUrl.trim() || null,
          avatar_url:       avatarUrl,
          profile_privacy:  profilePrivacy,
          posts_privacy:    postsPrivacy,
        })
        .eq('id', profile.id)

      if (updateErr) {
        // Username duplicado
        if (updateErr.code === '23505') {
          setUsernameError('Este nome de usuário já está em uso.')
          return
        }
        throw updateErr
      }

      await refreshProfile()
      setSaved(true)
      setTimeout(() => {
        navigate(`/perfil/${username.trim()}`)
      }, 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return null

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Editar perfil</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Avatar */}
        <div className="card p-5 flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-700 font-bold text-xl flex items-center justify-center overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                getInitials(fullName || 'U')
              )}
            </div>
            <button
              type="button"
              aria-label="Trocar foto de perfil"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors shadow"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              aria-label="Selecionar foto de perfil"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Foto de perfil</p>
            <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG ou WebP · máx. 2 MB</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-primary-600 hover:underline mt-1"
            >
              Trocar foto
            </button>
          </div>
        </div>

        {/* Campos de texto */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 text-sm">Informações básicas</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="Maria Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome de usuário *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={cn('input pl-7', usernameError && 'border-red-400 focus:border-red-400')}
                placeholder="maria_silva"
              />
            </div>
            {usernameError && (
              <p className="text-xs text-red-600 mt-1">{usernameError}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Letras minúsculas, números e _. Será sua URL: oryon.app/@{username || 'usuario'}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-slate-700">Bio</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{bio.length}/500</span>
                <button
                  type="button"
                  onClick={handleGenerateBio}
                  disabled={bioLoading}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:underline disabled:opacity-50"
                >
                  {bioLoading
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : '✨'}
                  Gerar com IA
                </button>
              </div>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              rows={3}
              className="input resize-none"
              placeholder="Conte um pouco sobre você…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ocupação</label>
              <input
                type="text"
                maxLength={100}
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="input"
                placeholder="Designer UX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Localização</label>
              <input
                type="text"
                maxLength={100}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input"
                placeholder="São Paulo, SP"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Site / portfólio</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="input"
              placeholder="https://seusite.com"
            />
          </div>
        </div>

        {/* Privacidade */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 text-sm">Privacidade</h2>

          <div>
            <label htmlFor="profile-privacy" className="block text-sm font-medium text-slate-700 mb-1">Visibilidade do perfil</label>
            <select
              id="profile-privacy"
              value={profilePrivacy}
              onChange={(e) => setProfilePrivacy(e.target.value as typeof profilePrivacy)}
              className="input"
            >
              {PRIVACY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="posts-privacy" className="block text-sm font-medium text-slate-700 mb-1">Visibilidade dos posts</label>
            <select
              id="posts-privacy"
              value={postsPrivacy}
              onChange={(e) => setPostsPrivacy(e.target.value as typeof postsPrivacy)}
              className="input"
            >
              {PRIVACY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !!usernameError || saved}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {saved ? (
              <><Check className="w-4 h-4" /> Salvo!</>
            ) : saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
            ) : (
              'Salvar alterações'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
