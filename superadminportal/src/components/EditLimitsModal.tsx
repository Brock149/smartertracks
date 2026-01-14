import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Company } from '../types'

interface Props {
  company: Company | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const enforcementOptions: Array<Company['enforcement_mode']> = ['off', 'observe', 'enforce']
const billingOptions: Array<Company['billing_cycle']> = ['monthly', 'annual']

export default function EditLimitsModal({ company, isOpen, onClose, onSuccess }: Props) {
  const [userLimit, setUserLimit] = useState('')
  const [toolLimit, setToolLimit] = useState('')
  const [enforcementMode, setEnforcementMode] = useState<Company['enforcement_mode']>('off')
  const [tierName, setTierName] = useState('')
  const [billingCycle, setBillingCycle] = useState<Company['billing_cycle']>(null)
  const [planId, setPlanId] = useState('')
  const [trialExpires, setTrialExpires] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!company) return
    setUserLimit(company.user_limit != null ? company.user_limit.toString() : '')
    setToolLimit(company.tool_limit != null ? company.tool_limit.toString() : '')
    setEnforcementMode(company.enforcement_mode ?? 'off')
    setTierName(company.tier_name ?? '')
    setBillingCycle(company.billing_cycle ?? null)
    setPlanId(company.plan_id ?? '')
    setTrialExpires(company.trial_expires_at ? company.trial_expires_at.split('T')[0] : '')
    setError('')
  }, [company])

  if (!isOpen || !company) return null

  const parseLimit = (value: string) => {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const parsed = Number(trimmed)
    if (Number.isNaN(parsed) || parsed < 0) {
      throw new Error('Limits must be zero or a positive number')
    }
    return parsed
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError('')

      const user_limit = parseLimit(userLimit)
      const tool_limit = parseLimit(toolLimit)
      const trial_expires_at =
        trialExpires.trim() === '' ? null : new Date(trialExpires).toISOString()

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          user_limit,
          tool_limit,
          enforcement_mode: enforcementMode,
          tier_name: tierName.trim() || null,
          billing_cycle: billingCycle,
          plan_id: planId.trim() || null,
          trial_expires_at,
        })
        .eq('id', company.id)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update limits')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">Edit Limits & Billing</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Limit</label>
              <input
                type="number"
                min="0"
                value={userLimit}
                onChange={(e) => setUserLimit(e.target.value)}
                placeholder="Blank = unlimited"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tool Limit</label>
              <input
                type="number"
                min="0"
                value={toolLimit}
                onChange={(e) => setToolLimit(e.target.value)}
                placeholder="Blank = unlimited"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enforcement Mode</label>
              <select
                value={enforcementMode}
                onChange={(e) => setEnforcementMode(e.target.value as Company['enforcement_mode'])}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {enforcementOptions.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
              <select
                value={billingCycle ?? ''}
                onChange={(e) =>
                  setBillingCycle(
                    e.target.value === '' ? null : (e.target.value as Company['billing_cycle'])
                  )
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Not set</option>
                {billingOptions.map((cycle) => (
                  <option key={cycle} value={cycle}>
                    {cycle}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tier / Plan Name</label>
              <input
                type="text"
                value={tierName}
                onChange={(e) => setTierName(e.target.value)}
                placeholder="e.g., Tier 1"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan ID (optional)</label>
              <input
                type="text"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                placeholder="Stripe price/plan id"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trial Expires</label>
              <input
                type="date"
                value={trialExpires}
                onChange={(e) => setTrialExpires(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 rounded-md border text-gray-700 hover:bg-gray-100"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
