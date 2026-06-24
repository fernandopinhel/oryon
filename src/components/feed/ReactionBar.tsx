import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Share2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import ShareModal from '@/components/ui/ShareModal'
import type { FeedPost } from '@/hooks/useFeed'

const REACTIONS = [
  { type: 'like',        emoji: '👍', label: 'Curtir' },
  { type: 'love',        emoji: '❤️', label: 'Amei' },
  { type: 'celebrate',   emoji: '🎉', label: 'Parabéns' },
  { type: 'insightful',  emoji: '💡', label: 'Interessante' },
  { type: 'curious',     emoji: '🤔', label: 'Curioso' },
] as const

interface Props {
  post: FeedPost
  onReactionChange: (postId: string, reaction: string | null, delta: number) => void
  onCommentClick?: () => void
}

export default function ReactionBar({ post, onReactionChange, onCommentClick }: Props) {
  const { user } = useAuthStore()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentReaction = REACTIONS.find((r) => r.type === post.user_reaction)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function toggleReaction(type: string) {
    if (!user || busy) return
    setBusy(true)
    setPickerOpen(false)

    const isSame = post.user_reaction === type

    // Optimistic update imediato
    onReactionChange(post.id, isSame ? null : type, isSame ? -1 : post.user_reaction ? 0 : 1)

    try {
      if (isSame) {
        // Remove reação
        await supabase
          .from('reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)
      } else if (post.user_reaction) {
        // Troca reação
        await supabase
          .from('reactions')
          .update({ type })
          .eq('post_id', post.id)
          .eq('user_id', user.id)
      } else {
        // Nova reação
        await supabase.from('reactions').insert({ post_id: post.id, user_id: user.id, type })
      }
    } catch {
      // Reverte em caso de erro
      onReactionChange(
        post.id,
        post.user_reaction,
        isSame ? 1 : post.user_reaction ? 0 : -1,
      )
    } finally {
      setBusy(false)
    }
  }

  // Click rápido → like; pressionar → abre picker
  function handleMouseDown() {
    holdTimer.current = setTimeout(() => setPickerOpen(true), 400)
  }

  function handleMouseUp() {
    if (holdTimer.current) clearTimeout(holdTimer.current)
  }

  function handleClick() {
    if (!pickerOpen) {
      toggleReaction('like')
    }
  }

  const shareUrl = `${window.location.origin}/post/${post.id}`

  return (
    <div className="flex items-center gap-1 pt-1">
      {/* Botão de reação principal */}
      <div className="relative" ref={pickerRef}>
        {/* Picker flutuante */}
        {pickerOpen && (
          <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1 bg-surface border border-surface-border rounded-2xl shadow-lg px-2 py-1.5 z-20">
            {REACTIONS.map((r) => (
              <button
                key={r.type}
                onClick={() => toggleReaction(r.type)}
                title={r.label}
                className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-xl text-xl transition-transform hover:scale-125',
                  post.user_reaction === r.type && 'bg-primary-50 scale-110',
                )}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}

        <button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          disabled={busy}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            currentReaction
              ? 'text-primary-600 bg-primary-50 hover:bg-primary-100'
              : 'text-slate-500 hover:bg-muted hover:text-slate-700',
          )}
        >
          <span className="text-base leading-none">
            {currentReaction?.emoji ?? '👍'}
          </span>
          <span>
            {currentReaction?.label ?? 'Curtir'}
            {post.likes_count > 0 && (
              <span className="ml-1 text-xs font-normal">
                {post.likes_count}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Comentários */}
      <button
        onClick={onCommentClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-muted hover:text-slate-700 transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        <span>
          Comentar
          {post.comments_count > 0 && (
            <span className="ml-1 text-xs font-normal">{post.comments_count}</span>
          )}
        </span>
      </button>

      {/* Compartilhar */}
      <button
        type="button"
        onClick={() => setShareOpen(true)}
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-muted hover:text-slate-700 transition-colors"
      >
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">Compartilhar</span>
      </button>

      <ShareModal
        open={shareOpen}
        url={shareUrl}
        title={post.content ? post.content.slice(0, 80) : 'Confira este post no Oryon'}
        onClose={() => setShareOpen(false)}
      />
    </div>
  )
}
