import { Link } from 'react-router-dom'

export default function MarketingFooter() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-xl font-bold mb-4">Smarter Tracks</h4>
            <p className="text-gray-400 text-sm">
              Tool tracking software for HVAC, construction, and trades teams.
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-gray-300 mb-3 text-sm uppercase tracking-wider">Product</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link>
              </li>
              <li>
                <Link to="/#book-demo" className="text-gray-400 hover:text-white transition-colors">Book a Demo</Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-400 hover:text-white transition-colors">Login</Link>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-gray-300 mb-3 text-sm uppercase tracking-wider">Solutions</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/tool-tracking-software" className="text-gray-400 hover:text-white transition-colors">
                  Tool Tracking Software
                </Link>
              </li>
              <li>
                <Link to="/hvac-tool-tracking" className="text-gray-400 hover:text-white transition-colors">
                  HVAC Tool Tracking
                </Link>
              </li>
              <li>
                <Link to="/construction-tool-management" className="text-gray-400 hover:text-white transition-colors">
                  Construction Tool Management
                </Link>
              </li>
              <li>
                <Link to="/tool-inventory-software" className="text-gray-400 hover:text-white transition-colors">
                  Tool Inventory Software
                </Link>
              </li>
              <li>
                <Link to="/tool-checkout-system" className="text-gray-400 hover:text-white transition-colors">
                  Tool Checkout System
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-gray-300 mb-3 text-sm uppercase tracking-wider">Legal</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="text-gray-400 hover:text-white transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link to="/account-deletion" className="text-gray-400 hover:text-white transition-colors">
                  Account Deletion
                </Link>
              </li>
              <li>
                <a href="mailto:brockcoburn@smartertracks.com" className="text-gray-400 hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-gray-800 text-gray-500 text-sm text-center">
          <p>&copy; {new Date().getFullYear()} Smarter Tracks. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
