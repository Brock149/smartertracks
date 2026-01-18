import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type PlanId = 'tier2' | 'tier3'
type BillingCycle = 'monthly' | 'annual'

const PLAN_OPTIONS: Array<{
  id: PlanId
  name: string
  monthly: number
  annual: number
  users: number
  tools: number
}> = [
  { id: 'tier2', name: 'Tier 2', monthly: 200, annual: 2220, users: 15, tools: 150 },
  { id: 'tier3', name: 'Tier 3', monthly: 350, annual: 3780, users: 75, tools: 750 },
]

interface CompanyData {
  id: string
  name: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_status: string | null
  current_period_end: string | null
  user_limit: number | null
  tool_limit: number | null
  tier_name: string | null
  plan_id: string | null
  billing_cycle: 'monthly' | 'annual' | null
  user_count: number
  tool_count: number
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
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('tier3')
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle>('monthly')

  const selectedPlan = useMemo(
    () => PLAN_OPTIONS.find((plan) => plan.id === selectedPlanId) ?? PLAN_OPTIONS[0],
    [selectedPlanId]
  )
  const selectedPrice =
    selectedBillingCycle === 'annual' ? selectedPlan.annual : selectedPlan.monthly

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

      const [
        { data: company, error: companyError },
        { count: usersCount, error: usersError },
        { count: toolsCount, error: toolsError },
      ] = await Promise.all([
        supabase
          .from('companies')
          .select('id, name, stripe_customer_id, stripe_subscription_id, stripe_status, current_period_end, user_limit, tool_limit, tier_name, plan_id, billing_cycle')
          .eq('id', userCompanyId)
          .single(),
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', userCompanyId),
        supabase
          .from('tools')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', userCompanyId),
      ])

      if (companyError) throw companyError
      if (usersError) throw usersError
      if (toolsError) throw toolsError
      if (!company) throw new Error('Company not found')

      const planIdFromDb =
        company.plan_id === 'tier2' || company.plan_id === 'tier3' ? company.plan_id : null
      const billingCycleFromDb =
        company.billing_cycle === 'monthly' || company.billing_cycle === 'annual'
          ? company.billing_cycle
          : null

      setCompanyData({
        ...company,
        user_count: usersCount ?? 0,
        tool_count: toolsCount ?? 0,
      })

      if (planIdFromDb) {
        setSelectedPlanId(planIdFromDb)
      }
      if (billingCycleFromDb) {
        setSelectedBillingCycle(billingCycleFromDb)
      }
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
        body: JSON.stringify({
          plan_id: selectedPlanId,
          billing_cycle: selectedBillingCycle,
        }),
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

  async function handleChangePlan() {
    try {
      setCreatingCheckout(true)
      setBillingError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session found')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-subscription-plan`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update subscription')
      }

      if (!result.url) {
        throw new Error('Missing Stripe portal URL')
      }

      window.location.href = result.url
    } catch (error: any) {
      console.error('Error changing plan:', error)
      setBillingError('Failed to change plan: ' + error.message)
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

  const formatLimit = (limit: number | null | undefined) => {
    if (limit === null || limit === undefined) return 'Unlimited'
    return limit.toString()
  }

  const usageItems = [
    {
      label: 'Users',
      used: companyData?.user_count ?? 0,
      limit: companyData?.user_limit ?? null,
    },
    {
      label: 'Tools',
      used: companyData?.tool_count ?? 0,
      limit: companyData?.tool_limit ?? null,
    },
  ]

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

  const hasActiveSubscription = companyData?.stripe_status === 'active'
  const canManageSubscription = companyData?.stripe_subscription_id && companyData?.stripe_status
  const canChangePlan = hasActiveSubscription && !!companyData?.stripe_subscription_id

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
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              {!hasActiveSubscription && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value as PlanId)}
                    className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PLAN_OPTIONS.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.users} users / {plan.tools} tools)
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedBillingCycle}
                    onChange={(e) => setSelectedBillingCycle(e.target.value as BillingCycle)}
                    className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              )}
              {!hasActiveSubscription && (
                <button
                  onClick={handleCreateCheckout}
                  disabled={creatingCheckout}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingCheckout
                    ? 'Starting Checkout...'
                    : `Start Subscription - $${selectedPrice}/${selectedBillingCycle === 'annual' ? 'year' : 'month'}`}
                </button>
              )}
              {canChangePlan && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleChangePlan}
                    disabled={creatingCheckout}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingCheckout ? 'Opening Stripe...' : 'Review plan change in Stripe'}
                  </button>
                </div>
              )}
            </div>
            {canManageSubscription && (
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

          {/* Usage & Limits */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <h4 className="text-lg font-medium text-gray-800">Usage & Limits</h4>
                <p className="text-sm text-gray-500">Track your current usage against your plan.</p>
              </div>
              {companyData?.tier_name && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {companyData.tier_name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {usageItems.map((item) => {
                const percent = item.limit ? Math.min(100, Math.round((item.used / item.limit) * 100)) : 0
                return (
                  <div key={item.label} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-700">{item.label}</div>
                      <div className="text-xs text-gray-500">Limit: {formatLimit(item.limit)}</div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <div className="text-3xl font-semibold text-gray-900">{item.used}</div>
                      <div className="text-sm text-gray-500">
                        of {formatLimit(item.limit)}
                      </div>
                    </div>
                    {item.limit ? (
                      <div className="mt-3">
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-2 bg-blue-600 rounded-full"
                            style={{ width: `${percent}%` }}
                            aria-label={`${item.label} usage ${percent}%`}
                          />
                        </div>
                        <div className="mt-1 text-xs text-gray-500">{percent}% used</div>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-gray-500">Unlimited</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
