import { useState, useEffect } from 'react'
import { X, Link2, Mail, Check } from 'lucide-react'

interface Props {
  open: boolean
  url: string
  title?: string
  onClose: () => void
}

const SHARE_OPTIONS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: 'bg-[#25D366] hover:bg-[#1ebe5d] text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.097.546 4.067 1.5 5.777L0 24l6.37-1.473A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.877 0-3.64-.51-5.147-1.395l-.369-.219-3.784.875.906-3.687-.24-.382A9.957 9.957 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
      </svg>
    ),
    getUrl: (url: string, title: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
  },
  {
    id: 'email',
    label: 'E-mail',
    color: 'bg-slate-600 hover:bg-slate-700 text-white',
    icon: <Mail className="w-5 h-5" />,
    getUrl: (url: string, title: string) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
  {
    id: 'twitter',
    label: 'X / Twitter',
    color: 'bg-black hover:bg-zinc-800 text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    getUrl: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: 'bg-[#0077B5] hover:bg-[#006399] text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    getUrl: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
]

export default function ShareModal({ open, url, title = 'Confira isso no Oryon', onClose }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* fallback: seleciona o texto */
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Compartilhar">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-sm card shadow-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Compartilhar</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Botões de rede social */}
        <div className="grid grid-cols-2 gap-2">
          {SHARE_OPTIONS.map((opt) => (
            <a
              key={opt.id}
              href={opt.getUrl(url, title)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${opt.color}`}
            >
              {opt.icon}
              {opt.label}
            </a>
          ))}
        </div>

        {/* Copiar link */}
        <div className="border-t border-surface-border pt-3">
          <p className="text-xs text-muted-foreground mb-2">Link direto</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              aria-label="URL para compartilhar"
              className="input flex-1 text-xs py-2 truncate bg-muted"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={copyLink}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${copied ? 'bg-emerald-100 text-emerald-700' : 'btn-secondary'}`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
