import { useEffect, useRef, useCallback } from 'react'
import { RefreshCw, AlertCircle, Inbox } from 'lucide-react'
import { useFeed } from '@/hooks/useFeed'
import PostComposer from '@/components/feed/PostComposer'
import PostCard from '@/components/feed/PostCard'
import PostSkeleton from '@/components/feed/PostSkeleton'
import type { FeedPost } from '@/hooks/useFeed'

export default function Feed() {
  const {
    posts, loading, loadingMore, hasMore, error,
    loadMore, refresh, prependPost, updateReaction, removePost, updatePost,
  } = useFeed()

  // Sentinel para scroll infinito
  const sentinelRef = useRef<HTMLDivElement>(null)

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        loadMore()
      }
    },
    [hasMore, loadingMore, loading, loadMore],
  )

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(handleIntersect, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleIntersect])

  function handlePostCreated(post: FeedPost) {
    prependPost(post)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-4">
      {/* Compositor */}
      <PostComposer onPostCreated={handlePostCreated} />

      {/* Erro */}
      {error && (
        <div className="card p-4 flex items-center gap-3 text-sm text-red-700 bg-red-50 border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={refresh}
            className="flex items-center gap-1 text-red-600 hover:underline font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tentar novamente
          </button>
        </div>
      )}

      {/* Skeletons de loading inicial */}
      {loading && !posts.length && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)}
        </div>
      )}

      {/* Lista de posts */}
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
      {!loading && !error && posts.length === 0 && (
        <div className="card p-12 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 mb-1">Seu feed está vazio</h3>
          <p className="text-sm text-muted-foreground">
            Conecte-se com pessoas e participe de grupos para ver conteúdos aqui.
          </p>
        </div>
      )}

      {/* Sentinel de scroll infinito */}
      <div ref={sentinelRef} className="h-1" />

      {/* Loading de mais posts */}
      {loadingMore && (
        <div className="space-y-4">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      )}

      {/* Fim do feed */}
      {!hasMore && posts.length > 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-xs text-muted-foreground">Você chegou ao fim do feed.</p>
          <button
            onClick={refresh}
            className="mt-2 flex items-center gap-1 text-xs text-primary-600 hover:underline mx-auto"
          >
            <RefreshCw className="w-3 h-3" />
            Atualizar
          </button>
        </div>
      )}
    </div>
  )
}
