import { Link } from 'react-router-dom'
import { Crown, Shield, MoreVertical, UserMinus, ArrowUp, ArrowDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getInitials, cn } from '@/lib/utils'
import type { GroupMember, Membership } from '@/hooks/useGroup'

const ROLE_BADGE = {
  admin:     { label: 'Admin',      icon: Crown,  color: 'text-amber-600 bg-amber-50 border-amber-200' },
  moderator: { label: 'Moderador', icon: Shield, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  member:    { label: 'Membro',    icon: null,   color: '' },
}

interface Props {
  members: GroupMember[]
  loading: boolean
  myMembership: Membership
  onUpdateRole: (memberId: string, role: 'admin' | 'moderator' | 'member') => void
  onRemove: (memberId: string) => void
}

export default function GroupMembersList({ members, loading, myMembership, onUpdateRole, onRemove }: Props) {
  const { user } = useAuthStore()
  const isAdmin = myMembership.role === 'admin'

  if (loading) {
    return (
      <div className="divide-y divide-surface-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-muted rounded w-32" />
              <div className="h-3 bg-muted rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Nenhum membro encontrado.
      </div>
    )
  }

  return (
    <div className="divide-y divide-surface-border">
      {members.map((member) => (
        <MemberRow
          key={member.id}
          member={member}
          isAdmin={isAdmin}
          isSelf={user?.id === member.user_id}
          onUpdateRole={onUpdateRole}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

function MemberRow({
  member, isAdmin, isSelf, onUpdateRole, onRemove,
}: {
  member: GroupMember
  isAdmin: boolean
  isSelf: boolean
  onUpdateRole: (id: string, role: 'admin' | 'moderator' | 'member') => void
  onRemove: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const badge = ROLE_BADGE[member.role]
  const BadgeIcon = badge.icon

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link to={`/perfil/${member.profile.username}`} className="shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center overflow-hidden">
          {member.profile.avatar_url ? (
            <img src={member.profile.avatar_url} alt={member.profile.full_name} className="w-full h-full object-cover" />
          ) : (
            getInitials(member.profile.full_name)
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/perfil/${member.profile.username}`}
            className="font-semibold text-sm text-slate-900 hover:text-primary-600 transition-colors"
          >
            {member.profile.full_name}
          </Link>
          {isSelf && (
            <span className="text-xs text-muted-foreground">(você)</span>
          )}
          {BadgeIcon !== null && (
            <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium', badge.color)}>
              <BadgeIcon className="w-3 h-3" />
              {badge.label}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          @{member.profile.username}
          {member.profile.occupation && ` · ${member.profile.occupation}`}
        </p>
      </div>

      {/* Menu de admin — não mostra para si mesmo nem se não for admin */}
      {isAdmin && !isSelf && (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-slate-700 transition-colors"
            aria-label="Opções do membro"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 card shadow-lg py-1 z-20">
              {member.role !== 'admin' && (
                <button
                  type="button"
                  onClick={() => { onUpdateRole(member.id, 'admin'); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-muted transition-colors"
                >
                  <Crown className="w-4 h-4 text-amber-500" />
                  Tornar Admin
                </button>
              )}
              {member.role !== 'moderator' && (
                <button
                  type="button"
                  onClick={() => { onUpdateRole(member.id, 'moderator'); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-muted transition-colors"
                >
                  <ArrowUp className="w-4 h-4 text-blue-500" />
                  Tornar Moderador
                </button>
              )}
              {member.role !== 'member' && (
                <button
                  type="button"
                  onClick={() => { onUpdateRole(member.id, 'member'); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-muted transition-colors"
                >
                  <ArrowDown className="w-4 h-4" />
                  Rebaixar para Membro
                </button>
              )}
              <div className="h-px bg-surface-border my-1" />
              <button
                type="button"
                onClick={() => { onRemove(member.id); setMenuOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <UserMinus className="w-4 h-4" />
                Remover do grupo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
