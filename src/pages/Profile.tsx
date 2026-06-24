import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AlertCircle, Lock, FileText, Info } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useProfile } from '@/hooks/useProfile'
import ProfileHeader from '@/components/profile/ProfileHeader'
import PostCard from '@/components/feed/PostCard'
import PostSkeleton from '@/components/feed/PostSkeleton'
import { cn } from '@/lib/utils'
import type { ConnectionInfo } from '@/hooks/useProfile'

type Tab = 'posts' | 'about'

export default function Profile() {
  const { username } = useParams<{ username: string }>()
  const { user } = useAuthStore()
  const { profile, connectionInfo: initialConn, posts, loading, postsLoading, error, removePost, updatePost } =
    useProfile(username ?? '')

  const [activeTab, setActiveTab] = useState<Tab>('posts')
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null)

  const effectiveConn = connectionInfo ?? initialConn
  const isOwn = user?.id === profile?.id
  const canSeePosts =
    isOwn ||
    profile?.posts_privacy === 'public' ||
    (profile?.posts_privacy === 'connections' && effectiveConn.status === 'connected')

  // ----- Loading -----
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card h-64 animate-pulse bg-muted" />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    )
  }

  // ----- Erro / não encontrado -----
  if (error || !profile) {
    return (
      <div className="card p-10 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-semibold text-slate-900 mb-1">Perfil não encontrado</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error ?? 'O usuário que você está procurando não existe.'}
        </p>
        <Link to="/feed" className="btn-primary text-sm px-4 py-2">
          Voltar ao feed
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <ProfileHeader
        profile={profile}
        connectionInfo={effectiveConn}
        onConnectionChange={setConnectionInfo}
      />

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-surface-border">
          {([
            { key: 'posts', label: 'Posts',  icon: FileText },
            { key: 'about', label: 'Sobre',  icon: Info },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-muted-foreground hover:text-slate-700',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Sobre */}
        {activeTab === 'about' && (
          <div className="p-4 space-y-3 text-sm">
            {profile.bio && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Bio</p>
                <p className="text-slate-700 whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}
            {profile.occupation && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ocupação</p>
                <p className="text-slate-700">{profile.occupation}</p>
              </div>
            )}
            {profile.location && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Localização</p>
                <p className="text-slate-700">{profile.location}</p>
              </div>
            )}
            {profile.website_url && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Site</p>
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  {profile.website_url}
                </a>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Membro desde</p>
              <p className="text-slate-700">
                {new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tab: Posts */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {!canSeePosts ? (
            <div className="card p-10 text-center">
              <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-slate-900 mb-1">Posts privados</p>
              <p className="text-sm text-muted-foreground">
                {profile.posts_privacy === 'connections'
                  ? 'Conecte-se para ver os posts desta pessoa.'
                  : 'Este perfil é privado.'}
              </p>
            </div>
          ) : postsLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : posts.length === 0 ? (
            <div className="card p-10 text-center text-sm text-muted-foreground">
              Nenhum post publicado ainda.
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={{ ...post, user_reaction: null }}
                onReactionChange={() => {}}
                onDelete={removePost}
                onUpdate={updatePost}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
