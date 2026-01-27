import { Link } from 'react-router-dom'

export default function MarketingHeader() {
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
            <Link to="/#pricing" className="px-2 py-1 rounded-md hover:text-gray-900 transition-colors">
              Pricing
            </Link>
            <Link to="/#contact" className="px-2 py-1 rounded-md hover:text-gray-900 transition-colors">
              Demo
            </Link>
            <Link to="/#contact" className="px-2 py-1 rounded-md hover:text-gray-900 transition-colors">
              Contact
            </Link>
            <Link to="/tool-tracking-software" className="px-2 py-1 rounded-md hover:text-gray-900 transition-colors">
              Tool Tracking
            </Link>
            <Link to="/hvac-tool-tracking" className="px-2 py-1 rounded-md hover:text-gray-900 transition-colors">
              HVAC
            </Link>
            <Link to="/construction-tool-management" className="px-2 py-1 rounded-md hover:text-gray-900 transition-colors">
              Construction
            </Link>
            <Link to="/tool-inventory-software" className="px-2 py-1 rounded-md hover:text-gray-900 transition-colors">
              Inventory
            </Link>
            <Link to="/tool-checkout-system" className="px-2 py-1 rounded-md hover:text-gray-900 transition-colors">
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
