const GTM_ID = import.meta.env.VITE_GTM_ID as string | undefined
const HJ_ID  = import.meta.env.VITE_HOTJAR_ID as string | undefined
const HJ_VER = Number(import.meta.env.VITE_HOTJAR_VERSION ?? 6)

// Inicializa dataLayer com todos os consentimentos negados (GTM Consent Mode v2).
// Deve ser chamado o mais cedo possível, independente de consentimento.
export function initDataLayer(): void {
  window.dataLayer = window.dataLayer ?? []
  window.gtag = function (...args: unknown[]) { window.dataLayer.push(args) }
  window.gtag('consent', 'default', {
    analytics_storage:       'denied',
    ad_storage:              'denied',
    ad_user_data:            'denied',
    ad_personalization:      'denied',
    functionality_storage:   'denied',
    personalization_storage: 'denied',
    security_storage:        'granted',
  })
  window.gtag('js', new Date())
}

// Injeta o script GTM no <head> de forma assíncrona.
export function loadGTM(): void {
  if (!GTM_ID || document.getElementById('gtm-script')) return

  const script = document.createElement('script')
  script.id = 'gtm-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`
  document.head.appendChild(script)

  // <noscript> iframe no início do <body>
  if (!document.getElementById('gtm-noscript')) {
    const ns = document.createElement('noscript')
    ns.id = 'gtm-noscript'
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_ID}`
    iframe.height = '0'
    iframe.width = '0'
    iframe.style.cssText = 'display:none;visibility:hidden'
    ns.appendChild(iframe)
    document.body.prepend(ns)
  }
}

// Injeta o snippet do Hotjar de forma assíncrona (lazy).
export function loadHotjar(): void {
  if (!HJ_ID || document.getElementById('hj-script')) return

  const script = document.createElement('script')
  script.id = 'hj-script'
  script.async = true
  script.defer = true
  script.textContent = [
    ';(function(h,o,t,j,a,r){',
    'h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};',
    `h._hjSettings={hjid:${HJ_ID},hjsv:${HJ_VER}};`,
    'a=o.getElementsByTagName("head")[0];',
    'r=o.createElement("script");r.async=1;',
    'r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;',
    'a.appendChild(r);',
    '})(window,document,"https://static.hotjar.com/c/hotjar-",".js?sv=");',
  ].join('')
  document.head.appendChild(script)
}

// Atualiza o Consent Mode do GTM sem recarregar a página.
export function updateConsentMode(analytics: boolean, heatmaps: boolean): void {
  if (typeof window.gtag !== 'function') return
  window.gtag('consent', 'update', {
    analytics_storage:       analytics ? 'granted' : 'denied',
    personalization_storage: heatmaps  ? 'granted' : 'denied',
  })
}

// Remove cookies de analytics/heatmaps (invocado na revogação).
export function clearAnalyticsCookies(): void {
  const hostname = window.location.hostname
  const domains  = [hostname, `.${hostname}`]

  const gaCookies = [
    '_ga', '_gid', '_gat',
    GTM_ID ? `_ga_${GTM_ID.replace('GTM-', '')}` : '',
    GTM_ID ? `_gtag_${GTM_ID}` : '',
  ].filter(Boolean)

  const hjCookies = [
    '_hjid', '_hjSession', '_hjSessionUser',
    '_hjTLDTest', '_hjAbsoluteSessionInProgress',
    '_hjFirstSeen', '_hjIncludedInPageviewSample',
    '_hjIncludedInSessionSample', '_hjShownFeedbackMessage',
  ]

  const expire = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  ;[...gaCookies, ...hjCookies].forEach((name) => {
    document.cookie = `${name}=; ${expire}`
    domains.forEach((d) => { document.cookie = `${name}=; ${expire}; domain=${d}` })
  })
}

// Nega todos os consentimentos + limpa cookies.
export function disableAnalytics(): void {
  updateConsentMode(false, false)
  clearAnalyticsCookies()
}
