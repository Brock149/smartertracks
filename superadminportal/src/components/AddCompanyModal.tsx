import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { getPlanById } from '../config/plans'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddCompanyModal({ isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const trialPlan = getPlanById('trial')
      const defaults = trialPlan
        ? {
            user_limit: trialPlan.userLimit,
            tool_limit: trialPlan.toolLimit,
            enforcement_mode: trialPlan.enforcementMode,
            tier_name: trialPlan.name,
            plan_id: trialPlan.id,
            billing_cycle: trialPlan.billingCycle,
            trial_expires_at: null,
          }
        : {}
      const { error } = await supabase
        .from('companies')
        .insert({ name: name.trim(), notes, ...defaults })
      if (error) throw error
      onSuccess()
      setName('')
      setNotes('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add company')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Add Company</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
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
              {loading ? 'Adding...' : 'Add Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 