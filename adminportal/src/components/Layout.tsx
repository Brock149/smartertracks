import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const allNavLinks = [
  { to: '/admin/tools', label: 'Tools', icon: '🧰', adminOnly: false },
  { to: '/admin/tool-costs', label: 'Tool Costs', icon: '💰', adminOnly: true },
  { to: '/admin/groups', label: 'Groups', icon: '🧩', adminOnly: false },
  { to: '/admin/users', label: 'Users', icon: '👥', adminOnly: false },
  { to: '/admin/transactions', label: 'Transactions', icon: '🔄', adminOnly: false },
  { to: '/admin/reports', label: 'Reports', icon: '📊', adminOnly: false },
  { to: '/admin/billing', label: 'Billing', icon: '💳', adminOnly: true },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️', adminOnly: true },
  { to: '/admin/app-versions', label: 'App Versions', icon: '📱', adminOnly: true },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [companyStatus, setCompanyStatus] = useState<{
    isActive: boolean
    userLimit: number | null
    toolLimit: number | null
    userCount: number
    toolCount: number
  } | null>(null)
  const [companyLoading, setCompanyLoading] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  async function fetchCompanyName(userId: string, isActive: () => boolean = () => true) {
    try {
      setCompanyLoading(true)

      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', userId)
        .single()

      if (userError) throw userError

      if (isActive()) {
        setUserRole(userRecord?.role ?? null)
      }

      if (!userRecord?.company_id) {
        setCompanyName(null)
        return
      }

      const [{ data: company, error: companyError }, { count: userCount, error: userCountError }, { count: toolCount, error: toolCountError }] =
        await Promise.all([
          supabase
        .from('companies')
            .select('name, is_active, user_limit, tool_limit')
        .eq('id', userRecord.company_id)
            .single(),
          supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', userRecord.company_id),
          supabase
            .from('tools')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', userRecord.company_id),
        ])

      if (companyError) throw companyError
      if (userCountError) throw userCountError
      if (toolCountError) throw toolCountError

      if (!isActive()) return
      setCompanyName(company?.name || null)
      setCompanyStatus({
        isActive: company?.is_active ?? true,
        userLimit: company?.user_limit ?? null,
        toolLimit: company?.tool_limit ?? null,
        userCount: userCount ?? 0,
        toolCount: toolCount ?? 0,
      })
    } catch (error) {
      console.error('Error fetching company name:', error)
      if (isActive()) {
        setCompanyName(null)
        setCompanyStatus(null)
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
        setCompanyStatus(null)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchCompanyName(session.user.id, () => isMounted)
      } else {
        setCompanyName(null)
      setCompanyStatus(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileMenuOpen])

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
            {allNavLinks
              .filter(link => !link.adminOnly || userRole === 'admin' || userRole === 'superadmin')
              .map(link => (
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
            <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">{allNavLinks.find(l => location.pathname.startsWith(l.to))?.label || 'Dashboard'}</h1>
            <span className="hidden md:inline ml-4 text-gray-400">|</span>
            <span className="hidden md:inline text-gray-500">Smarter Tracks - Tool Tracking System</span>
          </div>
          
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 text-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-haspopup="true"
              aria-expanded={isProfileMenuOpen}
            >
              👤
            </button>
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="px-4 py-3 border-b">
                  <p className="text-sm text-gray-500">Signed in as</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.email || 'Loading...'}</p>
                </div>
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false)
                    handleLogout()
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8">
          {companyStatus && !companyStatus.isActive && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
              <div className="font-semibold">Account suspended</div>
              <div className="text-sm">
                {((companyStatus.userLimit !== null && companyStatus.userCount > companyStatus.userLimit) ||
                  (companyStatus.toolLimit !== null && companyStatus.toolCount > companyStatus.toolLimit))
                  ? `Over limit: ${companyStatus.userCount}/${companyStatus.userLimit ?? '∞'} users, ${companyStatus.toolCount}/${companyStatus.toolLimit ?? '∞'} tools. Delete users/tools or upgrade your plan to restore access.`
                  : 'Please delete users/tools or upgrade your plan to restore access.'}
              </div>
            </div>
          )}
          <div className="bg-white rounded-lg shadow p-4 md:p-8 min-h-[60vh]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
} 