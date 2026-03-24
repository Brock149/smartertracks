import { useState } from 'react'
import type { MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function MarketingHeader() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleAnchorClick = (event: MouseEvent<HTMLAnchorElement>, targetId: string) => {
    if (location.pathname !== '/') return
    const target = document.getElementById(targetId)
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (window.location.hash !== `#${targetId}`) {
      window.history.replaceState(null, '', `#${targetId}`)
    }
    setMobileMenuOpen(false)
  }

  return (
    <header className="bg-white shadow-sm relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-blue-700 transition-colors">
            Smarter Tracks
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-gray-700">
            <Link to="/" className="px-3 py-2 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-colors">
              Home
            </Link>
            <a
              href="/#pricing"
              onClick={(event) => handleAnchorClick(event, 'pricing')}
              className="px-3 py-2 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Pricing
            </a>
            <Link
              to="/tool-tracking-software"
              className="px-3 py-2 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Tool Tracking
            </Link>
            <Link
              to="/hvac-tool-tracking"
              className="px-3 py-2 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              HVAC
            </Link>
            <Link
              to="/construction-tool-management"
              className="px-3 py-2 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Construction
            </Link>
            <a
              href="/#contact"
              onClick={(event) => handleAnchorClick(event, 'contact')}
              className="px-3 py-2 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Contact
            </a>
            <Link to="/login" className="px-3 py-2 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-colors">
              Login
            </Link>
            <a
              href="/#book-demo"
              onClick={(event) => handleAnchorClick(event, 'book-demo')}
              className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              Book a Demo
            </a>
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="lg:hidden pb-4 border-t border-gray-100 pt-4 space-y-1">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium">
              Home
            </Link>
            <a
              href="/#pricing"
              onClick={(event) => handleAnchorClick(event, 'pricing')}
              className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium"
            >
              Pricing
            </a>
            <Link to="/tool-tracking-software" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium">
              Tool Tracking
            </Link>
            <Link to="/hvac-tool-tracking" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium">
              HVAC
            </Link>
            <Link to="/construction-tool-management" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium">
              Construction
            </Link>
            <a
              href="/#contact"
              onClick={(event) => handleAnchorClick(event, 'contact')}
              className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium"
            >
              Contact
            </a>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium">
              Login
            </Link>
            <a
              href="/#book-demo"
              onClick={(event) => handleAnchorClick(event, 'book-demo')}
              className="block mx-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-center font-semibold transition-colors"
            >
              Book a Demo
            </a>
          </nav>
        )}
      </div>
    </header>
  )
}
