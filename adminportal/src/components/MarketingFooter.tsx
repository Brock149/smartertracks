import { Link } from 'react-router-dom'

export default function MarketingFooter() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h4 className="text-2xl font-bold mb-4">Smarter Tracks</h4>
          <p className="text-gray-400 mb-8">
            Tool tracking software for HVAC, construction, and trades teams.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
              Home
            </Link>
            <Link to="/#pricing" className="text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link to="/#contact" className="text-gray-400 hover:text-white transition-colors">
              Demo
            </Link>
            <Link to="/#contact" className="text-gray-400 hover:text-white transition-colors">
              Contact
            </Link>
            <Link to="/tool-tracking-software" className="text-gray-400 hover:text-white transition-colors">
              Tool Tracking
            </Link>
            <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
              Login
            </Link>
            <Link to="/signup" className="text-gray-400 hover:text-white transition-colors">
              Sign Up
            </Link>
            <Link to="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-and-conditions" className="text-gray-400 hover:text-white transition-colors">
              Terms & Conditions
            </Link>
            <Link to="/account-deletion" className="text-gray-400 hover:text-white transition-colors">
              Account Deletion
            </Link>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-gray-400 text-sm">
            <p>&copy; 2024 Smarter Tracks. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
