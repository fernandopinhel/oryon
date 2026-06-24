import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, FileText, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const LGPD_VERSION = import.meta.env.VITE_LGPD_VERSION ?? 'v1.0'

export default function LgpdConsent() {
  const { acceptLgpd, signOut, profile } = useAuthStore()
  const navigate = useNavigate()
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    if (!accepted) return
    setLoading(true)
    setError(null)
    try {
      await acceptLgpd(LGPD_VERSION)
      navigate('/feed')
    } catch {
      setError('Erro ao registrar consentimento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDecline() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Olá, {profile?.full_name?.split(' ')[0] ?? 'bem-vindo'}! 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Antes de continuar, precisamos que você leia e aceite nossos termos.
          </p>
        </div>

        {/* Resumo dos direitos LGPD */}
        <div className="card p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-500" />
            Seus direitos segundo a LGPD
          </h2>

          <ul className="space-y-3 text-sm text-slate-700">
            {[
              { emoji: '✅', title: 'Transparência', desc: 'Você sabe exatamente quais dados coletamos: nome, email, conteúdo que você publica e interações na plataforma.' },
              { emoji: '🎯', title: 'Finalidade específica', desc: 'Seus dados são usados apenas para fornecer as funcionalidades do Oryon (feed, grupos, projetos). Não vendemos dados para terceiros.' },
              { emoji: '🔒', title: 'Segurança', desc: 'Todos os dados são protegidos com criptografia e Row Level Security no banco de dados. Somente você acessa seus dados privados.' },
              { emoji: '📦', title: 'Portabilidade', desc: 'Você pode exportar todos os seus dados a qualquer momento em Configurações > LGPD.' },
              { emoji: '🗑️', title: 'Exclusão', desc: 'Você pode solicitar a exclusão completa da sua conta e dados. O processo leva até 30 dias úteis conforme a lei.' },
              { emoji: '📧', title: 'Contato DPO', desc: 'Para dúvidas sobre privacidade, entre em contato: privacidade@oryon.app' },
            ].map(({ emoji, title, desc }) => (
              <li key={title} className="flex gap-3">
                <span className="text-lg leading-none mt-0.5">{emoji}</span>
                <div>
                  <span className="font-medium text-slate-900">{title}: </span>
                  {desc}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Aviso de cookies */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          <strong>Cookies técnicos:</strong> Utilizamos apenas cookies essenciais para manter sua sessão ativa.
          Não utilizamos cookies de rastreamento ou publicidade.
        </div>

        {/* Checkbox de aceite */}
        <label className="flex items-start gap-3 cursor-pointer mb-6 group">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              accepted ? 'bg-primary-500 border-primary-500' : 'border-slate-300 group-hover:border-primary-400'
            }`}>
              {accepted && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-slate-700">
            Li e concordo com os{' '}
            <a href="#" className="text-primary-600 hover:underline font-medium">Termos de Uso</a>
            {' '}e a{' '}
            <a href="#" className="text-primary-600 hover:underline font-medium">Política de Privacidade</a>
            {' '}do Oryon, incluindo o tratamento de dados pessoais conforme descrito acima (LGPD {LGPD_VERSION}).
          </span>
        </label>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleAccept}
            disabled={!accepted || loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Registrando consentimento…' : 'Aceitar e entrar no Oryon'}
          </button>

          <button
            onClick={handleDecline}
            className="btn-secondary w-full flex items-center justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Não aceito — encerrar sessão
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Versão dos termos: {LGPD_VERSION} · Aceito em: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  )
}
