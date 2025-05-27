import { Link, Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const navLinks = [
  { to: '/tools', label: 'Tools', icon: '🧰' },
  { to: '/users', label: 'Users', icon: '👥' },
  { to: '/transactions', label: 'Transactions', icon: '🔄' },
]

export default function Layout() {
  const location = useLocation()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)

  // Check if we're already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
    })
  }, [])

  async function handleLogin() {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'admin1',
      })
      if (error) throw error
      setIsLoggedIn(true)
    } catch (error) {
      console.error('Error logging in:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col py-6 px-4">
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="text-3xl font-bold">🛠️</span>
          <span className="text-xl font-bold tracking-wide">Sasi Admin</span>
        </div>
        <nav className="flex-1">
          <ul className="space-y-2">
            {navLinks.map(link => (
              <li key={link.to}>
                <Link
                  to={link.to}
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
              <div className="font-semibold">Admin User</div>
              <div className="text-xs text-gray-300">admin@company.com</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white shadow flex items-center px-8 h-16 justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">{navLinks.find(l => location.pathname.startsWith(l.to))?.label || 'Dashboard'}</h1>
            <span className="ml-4 text-gray-400">|</span>
            <span className="text-gray-500">Sasi HVAC Tool Tracker</span>
          </div>
          <div className="flex items-center gap-4">
            {!isLoggedIn ? (
              <button
                onClick={handleLogin}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login as Admin'}
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            )}
            <input
              type="text"
              placeholder="Search..."
              className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button className="relative">
              <span className="text-2xl">🔔</span>
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
            </button>
            <span className="inline-block w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-lg">👤</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="bg-white rounded-lg shadow p-8 min-h-[60vh]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
} 