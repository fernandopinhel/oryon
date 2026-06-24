import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AlertCircle, Lock, FileText, Users } from 'lucide-react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useGroup } from '@/hooks/useGroup'
import GroupHeader from '@/components/groups/GroupHeader'
import GroupMembersList from '@/components/groups/GroupMembersList'
import PostComposer from '@/components/feed/PostComposer'
import PostCard from '@/components/feed/PostCard'
import PostSkeleton from '@/components/feed/PostSkeleton'
import { cn } from '@/lib/utils'
import type { GroupPost } from '@/hooks/useGroup'

type Tab = 'feed' | 'members'

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const {
    group, membership, posts, members,
    loading, postsLoading, membersLoading, loadingMore, hasMore, error,
    fetchMembers, loadMore, join, leave,
    prependPost, updateReaction, removePost,
    updateMemberRole, removeMember, updateGroupImages, updatePost,
  } = useGroup(id ?? '')

  const [activeTab, setActiveTab] = useState<Tab>('feed')
  const [busyMembership, setBusyMembership] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Lazy load de membros ao mudar para aba
  useEffect(() => {
    if (activeTab === 'members' && members.length === 0 && !membersLoading) {
      fetchMembers()
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll infinito do feed
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !postsLoading) loadMore()
    },
    [hasMore, loadingMore, postsLoading, loadMore],
  )
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(handleIntersect, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [handleIntersect])

  async function handleJoin() {
    setBusyMembership(true)
    await join()
    setBusyMembership(false)
  }

  async function handleLeave() {
    setConfirmLeave(true)
  }

  async function confirmLeaveGroup() {
    setConfirmLeave(false)
    setBusyMembership(true)
    await leave()
    setBusyMembership(false)
  }

  function handlePostCreated(post: GroupPost) {
    prependPost(post)
    setActiveTab('feed')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ----- Loading -----
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card h-72 animate-pulse bg-muted" />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    )
  }

  // ----- Erro -----
  if (error || !group) {
    return (
      <div className="card p-10 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-semibold text-slate-900 mb-1">Grupo não encontrado</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error ?? 'Este grupo não existe ou você não tem acesso.'}
        </p>
        <Link to="/grupos" className="btn-primary text-sm px-4 py-2">Ver grupos</Link>
      </div>
    )
  }

  const canPost = membership.isMember
  const canSeeFeed =
    group.privacy === 'public' ||
    membership.isMember

  return (
    <div className="space-y-4">
      {/* Header */}
      <GroupHeader
        group={group}
        membership={membership}
        onJoin={handleJoin}
        onLeave={handleLeave}
        busy={busyMembership}
        onImagesUpdate={updateGroupImages}
      />

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-surface-border">
          {([
            { key: 'feed'    as Tab, label: 'Feed',    icon: FileText },
            { key: 'members' as Tab, label: 'Membros', icon: Users    },
          ]).map(({ key, label, icon: Icon }) => (
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

        {/* Aba: Membros */}
        {activeTab === 'members' && (
          <GroupMembersList
            members={members}
            loading={membersLoading}
            myMembership={membership}
            onUpdateRole={updateMemberRole}
            onRemove={removeMember}
          />
        )}
      </div>

      {/* Aba: Feed */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {/* Acesso negado ao feed */}
          {!canSeeFeed ? (
            <div className="card p-10 text-center">
              <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-slate-900 mb-1">Conteúdo exclusivo para membros</p>
              <p className="text-sm text-muted-foreground mb-4">
                Participe do grupo para ver e criar publicações.
              </p>
              <button
                type="button"
                onClick={handleJoin}
                disabled={busyMembership}
                className="btn-primary text-sm px-5 py-2"
              >
                Participar do grupo
              </button>
            </div>
          ) : (
            <>
              {/* Compositor — somente membros */}
              {canPost && (
                <PostComposer
                  groupId={group.id}
                  onPostCreated={handlePostCreated}
                />
              )}

              {/* Skeletons */}
              {postsLoading && !posts.length && (
                <>
                  <PostSkeleton />
                  <PostSkeleton />
                </>
              )}

              {/* Posts */}
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onReactionChange={updateReaction}
                  onDelete={removePost}
                  onUpdate={updatePost}
                />
              ))}

              {/* Estado vazio */}
              {!postsLoading && posts.length === 0 && (
                <div className="card p-10 text-center text-sm text-muted-foreground">
                  Nenhum post publicado neste grupo ainda. Seja o primeiro!
                </div>
              )}

              {/* Sentinel + loading more */}
              <div ref={sentinelRef} className="h-1" />
              {loadingMore && <PostSkeleton />}

              {!hasMore && posts.length > 5 && (
                <p className="text-center text-xs text-muted-foreground py-4">
                  Fim das publicações do grupo.
                </p>
              )}
            </>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmLeave}
        title="Sair do grupo"
        message={`Tem certeza que deseja sair de "${group?.name}"?`}
        confirmLabel="Sair"
        variant="warning"
        loading={busyMembership}
        onConfirm={confirmLeaveGroup}
        onCancel={() => setConfirmLeave(false)}
      />
    </div>
  )
}
