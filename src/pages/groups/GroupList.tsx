import { useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Layers } from 'lucide-react'
import { useGroups } from '@/hooks/useGroups'
import GroupCard from '@/components/groups/GroupCard'

export default function GroupList() {
  const {
    exploreGroups, myGroups,
    loading, loadingMore, hasMore,
    query, setQuery, loadMore,
    joinGroup, leaveGroup,
  } = useGroups()

  const sentinelRef = useRef<HTMLDivElement>(null)

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) loadMore()
    },
    [hasMore, loadingMore, loading, loadMore],
  )

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(handleIntersect, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [handleIntersect])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Grupos</h1>
        <Link to="/grupos/criar" className="btn-primary text-sm flex items-center gap-1.5 px-3 py-2">
          <Plus className="w-4 h-4" />
          Criar grupo
        </Link>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar grupos…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input pl-9"
          aria-label="Buscar grupos"
        />
      </div>

      {/* Meus grupos */}
      {myGroups.length > 0 && !query && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Meus grupos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onLeave={leaveGroup}
              />
            ))}
          </div>
        </section>
      )}

      {/* Explorar */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          {query ? `Resultados para "${query}"` : 'Explorar grupos'}
        </h2>

        {/* Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card h-52 animate-pulse bg-muted" />
            ))}
          </div>
        )}

        {/* Grid de grupos */}
        {!loading && exploreGroups.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {exploreGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onJoin={joinGroup}
                onLeave={leaveGroup}
              />
            ))}
          </div>
        )}

        {/* Estado vazio */}
        {!loading && exploreGroups.length === 0 && (
          <div className="card p-12 text-center">
            <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-slate-900 mb-1">
              {query ? 'Nenhum grupo encontrado' : 'Nenhum grupo disponível'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {query
                ? 'Tente um termo diferente ou crie um grupo.'
                : 'Seja o primeiro a criar um grupo no Oryon!'}
            </p>
            <Link to="/grupos/criar" className="btn-primary text-sm px-5 py-2 inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Criar grupo
            </Link>
          </div>
        )}

        {/* Sentinel + loading more */}
        <div ref={sentinelRef} className="h-1 mt-2" />
        {loadingMore && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="card h-52 animate-pulse bg-muted" />
            <div className="card h-52 animate-pulse bg-muted" />
          </div>
        )}
      </section>
    </div>
  )
}
