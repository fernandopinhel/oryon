import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ConsentPreferences {
  analytics: boolean
  heatmaps: boolean
}

export type ConsentStatus = 'pending' | 'decided'

interface ConsentStore {
  status: ConsentStatus
  preferences: ConsentPreferences
  decidedAt: number | null
  acceptAll: () => void
  rejectAll: () => void
  savePreferences: (prefs: ConsentPreferences) => void
  reset: () => void
}

const DENIED: ConsentPreferences = { analytics: false, heatmaps: false }

export const useConsentStore = create<ConsentStore>()(
  persist(
    (set) => ({
      status: 'pending',
      preferences: DENIED,
      decidedAt: null,

      acceptAll: () =>
        set({ status: 'decided', preferences: { analytics: true, heatmaps: true }, decidedAt: Date.now() }),

      rejectAll: () =>
        set({ status: 'decided', preferences: DENIED, decidedAt: Date.now() }),

      savePreferences: (prefs) =>
        set({ status: 'decided', preferences: prefs, decidedAt: Date.now() }),

      reset: () =>
        set({ status: 'pending', preferences: DENIED, decidedAt: null }),
    }),
    { name: 'oryon-consent' },
  ),
)
