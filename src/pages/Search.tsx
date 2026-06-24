import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, Users, Layers, FolderKanban, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'

interface UserResult   { id: string; username: string; full_name: string; avatar_url: string | null; occupation: string | null }
interface GroupResult  { id: string; name: string; slug: string; description: string | null; members_count: number; privacy: string }
interface ProjectResult { id: string; title: string; description: string | null; status: string; members_count: number; visibility: string }

interface Results {
  users:    UserResult[]
  groups:   GroupResult[]
  projects: ProjectResult[]
}

const EMPTY: Results = { users: [], groups: [], projects: [] }

export default function Search() {
  const [searchParams]        = useSearchParams()
  const [query,   setQuery]   = useState(() => searchParams.get('q') ?? '')
  const [results, setResults] = useState<Results>(EMPTY)
  const [loading, setLoading] = useState(false)
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults(EMPTY); setLoading(false); return }
    setLoading(true)

    const like = `%${q.trim()}%`

    const [usersRes, groupsRes, projectsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, occupation')
        .or(`full_name.ilike.${like},username.ilike.${like}`)
        .eq('is_active', true)
        .limit(8),
      supabase
        .from('groups')
        .select('id, name, slug, description, members_count, privacy')
        .ilike('name', like)
        .limit(6),
      supabase
        .from('projects')
        .select('id, title, description, status, members_count, visibility')
        .ilike('title', like)
        .in('visibility', ['public'])
        .limit(6),
    ])

    setResults({
      users:    (usersRes.data    ?? []) as UserResult[],
      groups:   (groupsRes.data   ?? []) as GroupResult[],
      projects: (projectsRes.data ?? []) as ProjectResult[],
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(query), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, runSearch])

  const hasResults = results.users.length + results.groups.length + results.projects.length > 0

  return (
    <div className="space-y-5">
      {/* Barra de busca */}
      <div className="relative">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar pessoas, grupos, projetos…"
          className="input pl-11 py-3 text-base"
          aria-label="Campo de busca"
          autoFocus
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Resultados */}
      {query.trim().length >= 2 && !loading && !hasResults && (
        <div className="card p-10 text-center">
          <SearchIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-slate-700">Nenhum resultado para "{query}"</p>
          <p className="text-sm text-muted-foreground mt-1">Tente outros termos.</p>
        </div>
      )}

      {results.users.length > 0 && (
        <SearchSection title="Pessoas" Icon={Users}>
          {results.users.map((u) => (
            <Link
              key={u.id}
              to={`/perfil/${u.username}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
                {u.avatar_url
                  ? <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                  : getInitials(u.full_name)
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{u.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  @{u.username}{u.occupation ? ` · ${u.occupation}` : ''}
                </p>
              </div>
            </Link>
          ))}
        </SearchSection>
      )}

      {results.groups.length > 0 && (
        <SearchSection title="Grupos" Icon={Layers}>
          {results.groups.map((g) => (
            <Link
              key={g.id}
              to={`/grupos/${g.id}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
                {getInitials(g.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {g.members_count} membro{g.members_count !== 1 ? 's' : ''} · {g.privacy === 'public' ? 'Público' : g.privacy === 'private' ? 'Privado' : 'Restrito'}
                </p>
              </div>
            </Link>
          ))}
        </SearchSection>
      )}

      {results.projects.length > 0 && (
        <SearchSection title="Projetos" Icon={FolderKanban}>
          {results.projects.map((p) => (
            <Link
              key={p.id}
              to={`/projetos/${p.id}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center shrink-0">
                {getInitials(p.title)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.members_count} membro{p.members_count !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          ))}
        </SearchSection>
      )}

      {/* Estado inicial */}
      {!query && (
        <div className="card p-10 text-center">
          <SearchIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-slate-700">Explorar a rede</p>
          <p className="text-sm text-muted-foreground mt-1">
            Digite pelo menos 2 caracteres para buscar pessoas, grupos e projetos.
          </p>
        </div>
      )}
    </div>
  )
}

function SearchSection({ title, Icon, children }: { title: string; Icon: typeof Users; children: React.ReactNode }) {
  return (
    <section className="card p-3">
      <div className="flex items-center gap-2 px-1 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>
      </div>
      <div className="space-y-0.5">{children}</div>
    </section>
  )
}
