import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface CompanyData {
  id: string
  name: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_status: string | null
  current_period_end: string | null
}

export default function Billing() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null)
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [billingLoading, setBillingLoading] = useState(true)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [creatingCheckout, setCreatingCheckout] = useState(false)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [userLoading, setUserLoading] = useState(true)

  useEffect(() => {
    fetchUserRole()
  }, [])

  useEffect(() => {
    if (userRole && userCompanyId) {
      fetchCompanyData()
    }
  }, [userRole, userCompanyId])

  async function fetchUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role, company_id')
          .eq('id', user.id)
          .single()

        if (data) {
          setUserRole(data.role)
          setUserCompanyId(data.company_id)
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
      setBillingError('Failed to fetch user information')
    } finally {
      setUserLoading(false)
    }
  }

  async function fetchCompanyData() {
    try {
      if (!userCompanyId) return

      setBillingLoading(true)
      setBillingError(null)

      const { data, error } = await supabase
        .from('companies')
        .select('id, name, stripe_customer_id, stripe_subscription_id, stripe_status, current_period_end')
        .eq('id', userCompanyId)
        .single()

      if (error) throw error
      setCompanyData(data)
    } catch (error: any) {
      console.error('Error fetching company data:', error)
      setBillingError('Failed to fetch billing information: ' + error.message)
    } finally {
      setBillingLoading(false)
    }
  }

  async function handleCreateCheckout() {
    try {
      setCreatingCheckout(true)
      setBillingError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session found')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create checkout session')
      }

      window.location.href = result.url
    } catch (error: any) {
      console.error('Error creating checkout:', error)
      setBillingError('Failed to start checkout: ' + error.message)
    } finally {
      setCreatingCheckout(false)
    }
  }

  async function handleOpenBillingPortal() {
    try {
      setOpeningPortal(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-billing-portal-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to create portal session')
      window.location.href = result.url
    } catch (err: any) {
      console.error('Error opening billing portal:', err)
      setBillingError(err.message)
    } finally {
      setOpeningPortal(false)
    }
  }

  if (userLoading) {
    return <div className="text-center py-8 text-gray-500 text-lg">Loading billing...</div>
  }

  if (userRole && userRole !== 'admin') {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 text-lg">
          You do not have permission to access this page. Only administrators can manage billing.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold">Billing & Subscription</h3>
          <p className="text-lg text-gray-500 mt-1">Manage your subscription and billing information</p>
        </div>
      </div>

      {billingError && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-3 rounded-lg mb-6 text-lg">
          {billingError}
        </div>
      )}

      {billingLoading ? (
        <div className="p-8 text-center text-gray-500">Loading billing information...</div>
      ) : (
        <div className="space-y-6">
          {/* Subscription Status */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-800 mb-4">Subscription Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Status:</span>
                <div className="mt-1">
                  {companyData?.stripe_status ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      companyData.stripe_status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : companyData.stripe_status === 'past_due'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {companyData.stripe_status === 'active' ? '✓ Active' : 
                       companyData.stripe_status === 'past_due' ? '⚠ Past Due' :
                       companyData.stripe_status === 'canceled' ? '✗ Canceled' :
                       companyData.stripe_status}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      No Subscription
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Next Billing Date:</span>
                <div className="mt-1 text-gray-900">
                  {companyData?.current_period_end 
                    ? new Date(companyData.current_period_end).toLocaleDateString()
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {!companyData?.stripe_subscription_id ? (
              <button
                onClick={handleCreateCheckout}
                disabled={creatingCheckout}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingCheckout ? 'Starting Checkout...' : 'Start Subscription - $350/month'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleOpenBillingPortal}
                  disabled={openingPortal}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {openingPortal ? 'Loading...' : 'Update Payment Method'}
                </button>
                <button
                  onClick={handleOpenBillingPortal}
                  disabled={openingPortal}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {openingPortal ? 'Loading...' : 'Manage Billing'}
                </button>
              </>
            )}
          </div>

          {/* Information Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-blue-500 text-xl">💳</span>
              </div>
              <div className="ml-3">
                <h4 className="text-lg font-medium text-blue-800">Billing Information</h4>
                <div className="mt-2 text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Monthly subscription: $350/month</li>
                    <li>Cancel anytime - no long-term contracts</li>
                    <li>Secure payments processed by Stripe</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
