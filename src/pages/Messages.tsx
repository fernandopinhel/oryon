import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { MessageSquarePlus } from 'lucide-react'
import { useConversations } from '@/hooks/useConversations'
import { useUnreadMessagesStore } from '@/store/unreadMessagesStore'
import ConversationList from '@/components/messages/ConversationList'
import ChatWindow from '@/components/messages/ChatWindow'
import { cn } from '@/lib/utils'
import type { DirectMessage } from '@/hooks/useMessages'

export default function Messages() {
  const { userId: otherId }                                               = useParams<{ userId: string }>()
  const { conversations, loading, updateLastMessage, markConversationRead } = useConversations()
  const { reset: resetUnread } = useUnreadMessagesStore()

  const activeConv = conversations.find((c) => c.otherId === otherId)

  // Ao entrar na página → zera o badge de mensagens não lidas
  useEffect(() => { resetUnread() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Ao abrir uma conversa → zera badge de não-lidas localmente
  useEffect(() => {
    if (otherId) markConversationRead(otherId)
  }, [otherId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleMessageSent(msg: DirectMessage) {
    if (!otherId) return
    const prof = activeConv?.otherProfile
    if (prof) updateLastMessage(msg, otherId, prof)
  }

  return (
    <div className={cn(
      'flex h-full rounded-2xl overflow-hidden',
      'border border-surface-border bg-surface shadow-sm',
    )}>
      {/* Painel esquerdo — lista de conversas */}
      <div className={cn(
        'border-r border-surface-border flex flex-col shrink-0',
        otherId
          ? 'hidden lg:flex lg:w-72 xl:w-80'
          : 'flex flex-col w-full lg:w-72 xl:w-80',
      )}>
        <ConversationList
          conversations={conversations}
          loading={loading}
          activeUserId={otherId}
        />
      </div>

      {/* Painel direito — chat ativo ou placeholder */}
      <div className={cn('flex-1 flex flex-col min-w-0', !otherId && 'hidden lg:flex')}>
        {otherId ? (
          <ChatWindow
            key={otherId}
            otherId={otherId}
            otherProfile={activeConv?.otherProfile}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
        <MessageSquarePlus className="w-8 h-8 text-primary-600" />
      </div>
      <h3 className="font-semibold text-slate-900 mb-1">Suas mensagens</h3>
      <p className="text-sm text-muted-foreground max-w-[200px]">
        Selecione uma conversa ou inicie uma pelo perfil de alguém.
      </p>
    </div>
  )
}
