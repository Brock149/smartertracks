import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const navLinks = [
  { to: '/admin/tools', label: 'Tools', icon: '🧰' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/transactions', label: 'Transactions', icon: '🔄' },
  { to: '/admin/reports', label: 'Reports', icon: '📊' },
  { to: '/admin/billing', label: 'Billing', icon: '💳' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [companyLoading, setCompanyLoading] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  async function fetchCompanyName(userId: string, isActive: () => boolean = () => true) {
    try {
      setCompanyLoading(true)

      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .single()

      if (userError) throw userError

      if (!userRecord?.company_id) {
        setCompanyName(null)
        return
      }

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name')
        .eq('id', userRecord.company_id)
        .single()

      if (companyError) throw companyError

      if (!isActive()) return
      setCompanyName(company?.name || null)
    } catch (error) {
      console.error('Error fetching company name:', error)
      if (isActive()) {
        setCompanyName(null)
      }
    } finally {
      if (isActive()) {
        setCompanyLoading(false)
      }
    }
  }

  useEffect(() => {
    let isMounted = true

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted) return
      setUser(user)
      if (user) {
        fetchCompanyName(user.id, () => isMounted)
      } else {
        setCompanyName(null)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchCompanyName(session.user.id, () => isMounted)
      } else {
        setCompanyName(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-gray-800 text-white flex flex-col py-6 px-4 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="text-3xl font-bold">🛠️</span>
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-bold tracking-wide">Smarter Tracks Admin</span>
            <span className="text-sm text-gray-300">
              {companyLoading ? 'Loading company...' : companyName || 'Company'}
            </span>
          </div>
        </div>
        <nav className="flex-1">
          <ul className="space-y-2">
            {navLinks.map(link => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors text-base font-medium ${location.pathname.startsWith(link.to) ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                >
                  <span className="text-lg">{link.icon}</span>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto pt-8 border-t border-gray-700">
          <div className="flex items-center gap-3 px-2">
            <span className="inline-block w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-xl">👤</span>
            <div>
              <div className="font-semibold text-sm md:text-base">{user?.email || 'Loading...'}</div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-300 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-0">
        {/* Header */}
        <header className="bg-white shadow flex items-center px-4 md:px-8 h-16 justify-between">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex items-center gap-2 md:gap-4 flex-1 md:flex-none">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">{navLinks.find(l => location.pathname.startsWith(l.to))?.label || 'Dashboard'}</h1>
            <span className="hidden md:inline ml-4 text-gray-400">|</span>
            <span className="hidden md:inline text-gray-500">Smarter Tracks - Tool Tracking System</span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <input
              type="text"
              placeholder="Search..."
              className="hidden sm:block rounded-md border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32 md:w-auto"
            />
            <button className="relative">
              <span className="text-xl md:text-2xl">🔔</span>
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
            </button>
            <span className="inline-block w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-300 flex items-center justify-center text-base md:text-lg">👤</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8">
          <div className="bg-white rounded-lg shadow p-4 md:p-8 min-h-[60vh]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
} 