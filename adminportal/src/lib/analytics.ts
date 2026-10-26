type EventParams = Record<string, string | number | boolean | null | undefined>

export function trackEvent(name: string, params: EventParams = {}) {
  if (typeof window === 'undefined') return

  const payload = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
  )
  const gtagFn = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag
  if (typeof gtagFn === 'function') {
    gtagFn('event', name, payload)
  }
}

const ADS_CONVERSION = 'AW-17910572468/RJljCMvzgY8cELTLttxC'

export function trackSchedulerBooked(page: string) {
  trackEvent('scheduler_booked', { page, section: 'scheduler' })
  window.setTimeout(() => {
    const gtagFn = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag
    if (typeof gtagFn !== 'function') return
    gtagFn('event', 'conversion', {
      send_to: ADS_CONVERSION,
      value: 1.0,
      currency: 'USD',
    })
  }, 100)
}
