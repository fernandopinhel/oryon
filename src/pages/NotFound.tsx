import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary px-4">
      <div className="text-center">
        <p className="text-7xl font-bold text-primary-200 mb-4">404</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Página não encontrada</h1>
        <p className="text-muted-foreground mb-8">O endereço que você acessou não existe ou foi removido.</p>
        <Link to="/feed" className="btn-primary px-6 py-2.5">Voltar ao feed</Link>
      </div>
    </div>
  )
}
