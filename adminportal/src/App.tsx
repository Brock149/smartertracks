import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import GetStarted from './pages/GetStarted'
import GetStartedSuccess from './pages/GetStartedSuccess'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Tools from './pages/Tools'
import ToolGroups from './pages/ToolGroups'
import Users from './pages/Users'
import Transactions from './pages/Transactions'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import ToolCosts from './pages/ToolCosts'
import Billing from './pages/Billing'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsAndConditions from './pages/TermsAndConditions'
import AccountDeletion from './pages/AccountDeletion'
import ToolTrackingSoftware from './pages/ToolTrackingSoftware'
import ConstructionToolManagement from './pages/ConstructionToolManagement'
import HvacToolTracking from './pages/HvacToolTracking'
import ToolInventorySoftware from './pages/ToolInventorySoftware'
import ToolCheckoutSystem from './pages/ToolCheckoutSystem'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (isAuthenticated === null) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!mounted || !user) { setLoading(false); return }
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      if (mounted) {
        setRole(data?.role ?? null)
        setLoading(false)
      }
    })
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (role !== 'admin' && role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Access Only</h2>
        <p className="text-gray-600 max-w-md">
          This page is only accessible by administrators. If you believe you should have access, please contact your company admin.
        </p>
      </div>
    )
  }

  return <>{children}</>
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/get-started/success" element={<GetStartedSuccess />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/account-deletion" element={<AccountDeletion />} />
        <Route path="/tool-tracking-software" element={<ToolTrackingSoftware />} />
        <Route path="/construction-tool-management" element={<ConstructionToolManagement />} />
        <Route path="/hvac-tool-tracking" element={<HvacToolTracking />} />
        <Route path="/tool-inventory-software" element={<ToolInventorySoftware />} />
        <Route path="/tool-checkout-system" element={<ToolCheckoutSystem />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<div>Welcome to Smarter Tracks - Tool Tracking System</div>} />
          <Route path="tools" element={<Tools />} />
          <Route path="tool-costs" element={<AdminOnlyRoute><ToolCosts /></AdminOnlyRoute>} />
          <Route path="groups" element={<ToolGroups />} />
          <Route path="users" element={<Users />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="billing" element={<AdminOnlyRoute><Billing /></AdminOnlyRoute>} />
          <Route path="settings" element={<AdminOnlyRoute><Settings /></AdminOnlyRoute>} />
        </Route>
      </Routes>
    </Router>
  )
}
