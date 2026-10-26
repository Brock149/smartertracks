import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { trackEvent } from '../lib/analytics'

type CtaPairProps = {
  section: string
  chatHref?: string
  align?: 'center' | 'start'
  tone?: 'light' | 'dark'
  note?: string
  className?: string
}

function currentPage() {
  if (typeof window === 'undefined') return ''
  return window.location.pathname
}

function ActionLink({
  href,
  className,
  onClick,
  children,
}: {
  href: string
  className: string
  onClick: () => void
  children: ReactNode
}) {
  const isAppRoute = href.startsWith('/') && !href.startsWith('/#')
  if (isAppRoute) {
    return (
      <Link to={href} className={className} onClick={onClick}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  )
}

export default function CtaPair({
  section,
  chatHref = '#book-demo',
  align = 'center',
  tone = 'light',
  note,
  className = '',
}: CtaPairProps) {
  const justify = align === 'start' ? 'justify-center lg:justify-start' : 'justify-center'
  const noteAlign = align === 'start' ? 'text-center lg:text-left' : 'text-center'
  const chatClass =
    tone === 'dark'
      ? 'bg-white hover:bg-gray-100 text-blue-600 shadow-lg'
      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'

  return (
    <div className={className}>
      <div className={`flex ${justify}`}>
        <ActionLink
          href={chatHref}
          className={`w-full sm:w-auto px-8 py-4 rounded-lg text-lg font-semibold transition-colors text-center ${chatClass}`}
          onClick={() => trackEvent('cta_chat_click', { page: currentPage(), section })}
        >
          Book a 15-Minute Chat
        </ActionLink>
      </div>
      {note ? (
        <p className={`mt-4 text-lg sm:text-xl font-semibold ${tone === 'dark' ? 'text-white' : 'text-blue-800'} ${noteAlign}`}>
          {note}
        </p>
      ) : null}
    </div>
  )
}
