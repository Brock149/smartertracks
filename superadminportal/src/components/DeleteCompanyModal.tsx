import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Company } from '../types'

interface Props {
  company: Company | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function DeleteCompanyModal({ company, isOpen, onClose, onSuccess }: Props) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !company) return null

  const disabled = confirmText !== company.name || loading

  const handleDelete = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.functions.invoke('purge-company', {
        body: { company_id: company.id },
      })
      if (error) throw error
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete company')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-red-600">Delete Company</h2>
        <p className="mb-4 text-sm text-gray-700">
          This will permanently delete <span className="font-semibold">{company.name}</span> and all its related data (users, tools, transactions, images, etc.).
          <br />
          Type the company name to confirm.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-red-500 focus:border-red-500"
        />
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border text-gray-700 hover:bg-gray-100"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={disabled}
            className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
} 