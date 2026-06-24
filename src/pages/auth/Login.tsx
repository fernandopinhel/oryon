import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Github, Users, FolderKanban, MessageSquare } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const HIGHLIGHTS = [
  { icon: Users,        text: 'Conecte-se com profissionais e colaboradores' },
  { icon: FolderKanban, text: 'Gerencie projetos com Kanban colaborativo' },
  { icon: MessageSquare,text: 'Chat direto em tempo real com sua rede' },
]

export default function Login() {
  const { signInWithEmail, signInWithGoogle, signInWithGitHub, loading } = useAuthStore()
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await signInWithEmail(email, password)
      navigate('/feed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas. Tente novamente.')
    }
  }

  async function handleGoogle() {
    try { await signInWithGoogle() }
    catch { setError('Erro ao conectar com o Google.') }
  }

  async function handleGitHub() {
    try { await signInWithGitHub() }
    catch { setError('Erro ao conectar com o GitHub.') }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Painel esquerdo — identidade visual (desktop) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 flex-col justify-between bg-gradient-to-br from-primary-600 via-primary-500 to-indigo-600 p-12 text-white relative overflow-hidden">

        {/* Círculos decorativos de fundo */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Oryon</span>
        </div>

        {/* Headline + features */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-4xl font-bold leading-tight mb-3">
              Sua rede profissional,<br />do seu jeito.
            </h2>
            <p className="text-white/70 text-base leading-relaxed">
              Conecte-se, colabore em projetos e cresça com grupos temáticos. Tudo em um só lugar.
            </p>
          </div>

          <div className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/90 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/40 text-xs">© 2026 Oryon · Todos os direitos reservados</p>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-secondary px-4 py-12 sm:px-8">

        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <span className="text-xl font-bold text-slate-900">Oryon</span>
        </div>

        {/* Card do formulário */}
        <div className="w-full max-w-sm bg-surface rounded-2xl shadow-xl border border-surface-border p-8">

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-900">Entrar</h1>
            <p className="text-sm text-muted-foreground mt-1">Bem-vindo de volta 👋</p>
          </div>

          {/* OAuth */}
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={handleGoogle}
              className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm py-2.5"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>

            <button
              type="button"
              onClick={handleGitHub}
              className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm py-2.5"
            >
              <Github className="w-4 h-4 shrink-0" />
              GitHub
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-3 text-muted-foreground">ou com email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="voce@exemplo.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Senha
                </label>
                <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">
                  Esqueceu?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn('input pr-10')}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Não tem conta?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">
              Cadastre-se grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
