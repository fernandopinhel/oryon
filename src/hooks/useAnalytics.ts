import { useEffect } from 'react'
import { useConsentStore } from '@/store/consentStore'
import {
  initDataLayer,
  loadGTM,
  loadHotjar,
  updateConsentMode,
  disableAnalytics,
} from '@/lib/analytics'

// Inicializa o dataLayer uma vez e reage a mudanças de consentimento.
export function useAnalytics() {
  const { status, preferences } = useConsentStore()

  // dataLayer sempre inicializado (com consent negado) — sem scripts de terceiros
  useEffect(() => {
    initDataLayer()
  }, [])

  useEffect(() => {
    if (status !== 'decided') return

    if (preferences.analytics) {
      loadGTM()
      updateConsentMode(true, preferences.heatmaps)
      if (preferences.heatmaps) loadHotjar()
    } else {
      disableAnalytics()
    }
  }, [status, preferences])
}
