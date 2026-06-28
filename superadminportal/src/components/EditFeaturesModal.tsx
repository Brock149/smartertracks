import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Company } from '../types'

interface Props {
  company: Company | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const FEATURES: Array<{
  key: 'personal_tools_enabled' | 'trackers_enabled' | 'tool_costing_enabled'
  label: string
  description: string
}> = [
  {
    key: 'personal_tools_enabled',
    label: 'Personal Tech Tools',
    description:
      "Employees can track their own personal tools in the app, plus the admin Personal Tools tab and automated personal inventory reports.",
  },
  {
    key: 'trackers_enabled',
    label: 'GPS Trackers',
    description:
      'Digital Matter GPS tracker features: the Trackers tab, live fleet map, and attaching trackers to tools.',
  },
  {
    key: 'tool_costing_enabled',
    label: 'Tool Costing',
    description:
      'The Tool Costs page and the estimated cost field when creating or editing company tools.',
  },
]

export default function EditFeaturesModal({ company, isOpen, onClose, onSuccess }: Props) {
  const [flags, setFlags] = useState({
    personal_tools_enabled: false,
    trackers_enabled: false,
    tool_costing_enabled: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!company) return
    setFlags({
      personal_tools_enabled: company.personal_tools_enabled,
      trackers_enabled: company.trackers_enabled,
      tool_costing_enabled: company.tool_costing_enabled,
    })
    setError('')
  }, [company])

  if (!isOpen || !company) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError('')

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          personal_tools_enabled: flags.personal_tools_enabled,
          trackers_enabled: flags.trackers_enabled,
          tool_costing_enabled: flags.tool_costing_enabled,
        })
        .eq('id', company.id)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update features')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold mb-1">Features</h2>
        <p className="text-sm text-gray-500 mb-4">{company.name}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.key}
              className="flex items-start justify-between gap-4 p-3 bg-gray-50 border border-gray-200 rounded-md"
            >
              <div>
                <label className="text-sm font-medium text-gray-700">{feature.label}</label>
                <p className="text-xs text-gray-500 mt-0.5">{feature.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                <input
                  type="checkbox"
                  checked={flags[feature.key]}
                  onChange={(e) => setFlags({ ...flags, [feature.key]: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}

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
