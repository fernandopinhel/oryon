import { Link } from 'react-router-dom'
import { Users, FolderKanban, Layers, Zap } from 'lucide-react'

const features = [
  { icon: Users,         title: 'Conexões reais',   desc: 'Conecte-se com profissionais, amigos e comunidades que importam para você.' },
  { icon: Layers,        title: 'Grupos temáticos',  desc: 'Crie ou participe de grupos públicos, privados ou secretos.' },
  { icon: FolderKanban,  title: 'Gestão de projetos', desc: 'Organize tarefas em Kanban colaborativo com sua equipe.' },
  { icon: Zap,           title: 'Assistente IA',     desc: 'Resumo de posts, sugestão de hashtags e auxílio em projetos com IA.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-surface to-surface-secondary">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">O</span>
          </div>
          <span className="font-bold text-lg text-slate-900">Oryon</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-secondary text-sm px-4 py-2">Entrar</Link>
          <Link to="/register" className="btn-primary text-sm px-4 py-2">Cadastrar grátis</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 py-20 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-6">
          Sua rede profissional,<br />
          <span className="text-primary-600">do seu jeito</span>
        </h1>
        <p className="text-lg text-slate-600 mb-10 max-w-xl mx-auto">
          Conecte-se, colabore em projetos e cresça com grupos temáticos.
          Tudo em um só lugar, com o apoio de IA para facilitar seu dia a dia.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register" className="btn-primary text-base px-8 py-3">
            Começar gratuitamente →
          </Link>
          <Link to="/login" className="btn-secondary text-base px-8 py-3">
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6 flex gap-4">
              <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-muted-foreground border-t border-surface-border">
        © 2025 Oryon · <Link to="/lgpd-consent" className="hover:underline">Privacidade & LGPD</Link>
      </footer>
    </div>
  )
}
