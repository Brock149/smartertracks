import type { MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function MarketingHeader() {
  const location = useLocation()

  const handleAnchorClick = (event: MouseEvent<HTMLAnchorElement>, targetId: string) => {
    if (location.pathname !== '/') return
    const target = document.getElementById(targetId)
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (window.location.hash !== `#${targetId}`) {
      window.history.replaceState(null, '', `#${targetId}`)
    }
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-blue-700 transition-colors">
            Smarter Tracks
          </Link>
          <nav className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm font-medium text-gray-700">
            <Link to="/" className="px-2 py-1 rounded-md hover:text-gray-900 transition-colors">
              Home
            </Link>
            <a
              href="/#pricing"
              onClick={(event) => handleAnchorClick(event, 'pricing')}
              className="px-2 py-1 rounded-md hover:text-gray-900 transition-colors"
            >
              Pricing
            </a>
            <a
              href="/#demo"
              onClick={(event) => handleAnchorClick(event, 'demo')}
              className="hidden lg:inline-flex px-2 py-1 rounded-md hover:text-gray-900 transition-colors"
            >
              Demo
            </a>
            <a
              href="/#contact"
              onClick={(event) => handleAnchorClick(event, 'contact')}
              className="px-2 py-1 rounded-md hover:text-gray-900 transition-colors"
            >
              Contact
            </a>
            <Link
              to="/tool-tracking-software"
              className="hidden lg:inline-flex px-2 py-1 rounded-md hover:text-gray-900 transition-colors"
            >
              Tool Tracking
            </Link>
            <Link
              to="/hvac-tool-tracking"
              className="hidden lg:inline-flex px-2 py-1 rounded-md hover:text-gray-900 transition-colors"
            >
              HVAC
            </Link>
            <Link
              to="/construction-tool-management"
              className="hidden lg:inline-flex px-2 py-1 rounded-md hover:text-gray-900 transition-colors"
            >
              Construction
            </Link>
            <Link
              to="/tool-inventory-software"
              className="hidden lg:inline-flex px-2 py-1 rounded-md hover:text-gray-900 transition-colors"
            >
              Inventory
            </Link>
            <Link
              to="/tool-checkout-system"
              className="hidden lg:inline-flex px-2 py-1 rounded-md hover:text-gray-900 transition-colors"
            >
              Checkout
            </Link>
            <Link to="/login" className="px-2 py-1 rounded-md hover:text-gray-900 transition-colors">
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
