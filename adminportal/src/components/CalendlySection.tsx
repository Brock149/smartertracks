import { useEffect } from 'react'
import { trackEvent, trackSchedulerBooked } from '../lib/analytics'

const CALENDLY_URL = 'https://calendly.com/brockcoburn-smartertracks/30min?hide_gdpr_banner=1&hide_event_type_details=1'

type CalendlySectionProps = {
  heading: string
  body: string
  className?: string
}

export function useCalendlyEmbed() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.head.appendChild(script)

    let opened = false
    function handleCalendlyMessage(event: MessageEvent) {
      const name = event.data?.event
      if ((name === 'calendly.event_type_viewed' || name === 'calendly.profile_page_viewed') && !opened) {
        opened = true
        trackEvent('scheduler_opened', { page: window.location.pathname, section: 'scheduler' })
      }
      if (name === 'calendly.event_scheduled') {
        trackSchedulerBooked(window.location.pathname)
      }
      if (name === 'calendly.page_height') {
        const height = Number(event.data?.payload?.height)
        const widget = document.querySelector<HTMLElement>('.calendly-inline-widget')
        if (widget && Number.isFinite(height) && height > 0) {
          widget.style.height = `${height}px`
        }
      }
    }

    window.addEventListener('message', handleCalendlyMessage)
    return () => {
      window.removeEventListener('message', handleCalendlyMessage)
      try {
        document.head.removeChild(script)
      } catch {
        /* script already removed */
      }
    }
  }, [])
}

export default function CalendlySection({
  heading,
  body,
  className = 'py-16 bg-white',
}: CalendlySectionProps) {
  useCalendlyEmbed()

  return (
    <section id="book-demo" className={className}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">{heading}</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">{body}</p>
        </div>
        <div
          className="calendly-inline-widget"
          data-url={CALENDLY_URL}
          style={{ minWidth: '320px', width: '100%', height: '750px' }}
        />
        <p className="mt-4 text-center text-sm text-gray-500">
          Prefer email?{' '}
          <a href="mailto:brockcoburn@smartertracks.com" className="text-blue-600 hover:text-blue-700 font-medium">
            brockcoburn@smartertracks.com
          </a>
        </p>
      </div>
    </section>
  )
}
