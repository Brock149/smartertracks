import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

type PlanId = 'trial' | 'tier2' | 'tier3'
type BillingCycle = 'monthly' | 'annual'

const PLAN_OPTIONS: Array<{
  id: PlanId
  name: string
  monthly: number
  annual: number
  users: number
  tools: number
  requiresPayment: boolean
}> = [
  { id: 'trial', name: 'Free Trial', monthly: 0, annual: 0, users: 3, tools: 5, requiresPayment: false },
  { id: 'tier2', name: 'Tier 2', monthly: 200, annual: 2220, users: 15, tools: 150, requiresPayment: true },
  { id: 'tier3', name: 'Tier 3', monthly: 350, annual: 3780, users: 75, tools: 750, requiresPayment: true },
]

export default function GetStarted() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const initialPlan = (params.get('plan') as PlanId | null) || 'trial'
  const initialBilling = (params.get('billing') as BillingCycle | null) || 'monthly'

  const [companyName, setCompanyName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')
  const [planId, setPlanId] = useState<PlanId>(initialPlan)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialBilling)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const selectedPlan = useMemo(
    () => PLAN_OPTIONS.find((plan) => plan.id === planId) ?? PLAN_OPTIONS[0],
    [planId]
  )
  const price = billingCycle === 'annual' ? selectedPlan.annual : selectedPlan.monthly

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/self-serve-signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            company_name: companyName.trim(),
            admin_name: adminName.trim(),
            admin_email: adminEmail.trim().toLowerCase(),
            password: password,
            plan_id: planId,
            billing_cycle: billingCycle,
          }),
        }
      )

      const result = await res.json().catch(() => ({}))
      if (!res.ok || result?.error) {
        throw new Error(result?.error || 'Failed to start signup')
      }

      if (result?.url) {
        window.location.href = result.url
        return
      }

      navigate('/login', {
        state: { successMessage: 'Account created. You can log in now.' },
      })
    } catch (err: any) {
      setError(err.message || 'Failed to start signup')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-start mb-6">
          <Link to="/" className="text-gray-600 hover:text-gray-900">
            ← Back to Home
          </Link>
        </div>

        <div className="bg-white shadow-lg rounded-2xl p-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Get started</h1>
          <p className="mt-2 text-gray-600">
            Create your company and set up your admin account in minutes.
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Acme Construction"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Your name</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Work email</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!selectedPlan.requiresPayment}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 pr-10"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-700">Choose plan</div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {PLAN_OPTIONS.map((plan) => (
                  <button
                    type="button"
                    key={plan.id}
                    onClick={() => setPlanId(plan.id)}
                    className={`rounded-lg border px-4 py-3 text-left ${
                      planId === plan.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold">{plan.name}</div>
                    <div className="text-sm text-gray-500">
                      {plan.users} users • {plan.tools} tools
                    </div>
                  </button>
                ))}
              </div>

              {planId !== 'trial' && (
                <div className="mt-4 flex gap-3">
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                  <div className="text-lg font-semibold text-gray-900">
                    ${price}/{billingCycle === 'annual' ? 'year' : 'month'}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? 'Processing...'
                : selectedPlan.requiresPayment
                ? 'Continue to payment'
                : 'Start free trial'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
