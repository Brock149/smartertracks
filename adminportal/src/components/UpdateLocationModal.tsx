import { useEffect, useState } from 'react'
import { fetchLatestCustody, STORED_AT_OPTIONS, submitLocationUpdate } from '../lib/toolCustodyEvents'
import AdminModal from './AdminModal'

type Props = {
  toolId: string
  toolLabel: string
  onClose: () => void
  onSubmitted: () => void
}

export default function UpdateLocationModal({ toolId, toolLabel, onClose, onSubmitted }: Props) {
  const [location, setLocation] = useState('')
  const [storedAt, setStoredAt] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const latest = await fetchLatestCustody(toolId)
        if (cancelled) return
        setLocation(latest.location || '')
        setStoredAt(latest.stored_at && latest.stored_at !== 'Unknown' ? latest.stored_at : '')
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load current location')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [toolId])

  async function handleSubmit() {
    try {
      setSaving(true)
      setError(null)
      await submitLocationUpdate({ toolId, location, storedAt, notes })
      onSubmitted()
    } catch (err: any) {
      setError(err.message || 'Failed to update location')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminModal
      title={`Update location — ${toolLabel}`}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-5 py-3 rounded-lg border text-base hover:bg-gray-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bg-blue-600 text-white px-5 py-3 rounded-lg text-base hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={saving || loading}
          >
            {saving ? 'Saving...' : 'Save Location'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-gray-600 mb-4">
        Possession does not change. This only updates where the tool is stored.
      </p>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}
      {loading ? (
        <p className="text-gray-500">Loading current location…</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Location *</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where is this tool now?"
              autoCapitalize="words"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Stored At *</label>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={storedAt}
              onChange={(e) => setStoredAt(e.target.value)}
            >
              <option value="">Select storage location</option>
              {STORED_AT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {storedAt && !(STORED_AT_OPTIONS as readonly string[]).includes(storedAt) && (
                <option value={storedAt}>{storedAt}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={3}
              placeholder="Why did the location change?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      )}
    </AdminModal>
  )
}
