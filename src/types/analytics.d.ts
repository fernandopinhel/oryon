declare interface Window {
  dataLayer: unknown[]
  gtag: (...args: unknown[]) => void
  hj: ((...args: unknown[]) => void) & { q?: unknown[] }
  _hjSettings?: { hjid: number; hjsv: number }
}
