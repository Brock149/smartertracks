import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { submitDamageReport, type FlaggedChecklistItem } from '../lib/toolCustodyEvents'
import AdminModal from './AdminModal'

type ChecklistRow = {
  id: string
  item_name: string
  required: boolean
  status: 'ok' | 'damaged' | 'needs_replacement'
  comments: string
}

type Props = {
  toolId: string
  toolLabel: string
  onClose: () => void
  onSubmitted: () => void
}

export default function ReportDamageModal({ toolId, toolLabel, onClose, onSubmitted }: Props) {
  const [items, setItems] = useState<ChecklistRow[]>([])
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
        const { data, error: fetchError } = await supabase
          .from('tool_checklists')
          .select('id, item_name, required')
          .eq('tool_id', toolId)
          .order('item_name')
        if (fetchError) throw fetchError
        if (cancelled) return
        setItems(
          (data || []).map((item) => ({
            id: item.id,
            item_name: item.item_name,
            required: item.required,
            status: 'ok',
            comments: '',
          }))
        )
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load checklist')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [toolId])

  function updateItem(id: string, patch: Partial<ChecklistRow>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  async function handleSubmit() {
    const flagged: FlaggedChecklistItem[] = items
      .filter((item) => item.status !== 'ok')
      .map((item) => ({
        id: item.id,
        item_name: item.item_name,
        status: item.status === 'damaged' ? 'damaged' : 'needs_replacement',
        comments: item.comments,
      }))
    if (flagged.length === 0) {
      setError('Check at least one item that needs repair or replacement.')
      return
    }
    try {
      setSaving(true)
      setError(null)
      await submitDamageReport({ toolId, flaggedItems: flagged, notes })
      onSubmitted()
    } catch (err: any) {
      setError(err.message || 'Failed to submit report')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminModal
      title={`Report damage — ${toolLabel}`}
      onClose={onClose}
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
            className="bg-amber-600 text-white px-5 py-3 rounded-lg text-base hover:bg-amber-700 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={saving || loading || items.length === 0}
          >
            {saving ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-gray-600 mb-4">
        Possession stays with the current owner. This logs damage without claiming the tool.
      </p>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}
      {loading ? (
        <p className="text-gray-500">Loading checklist…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">This tool has no checklist items, so a damage report cannot be filed.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="font-medium text-gray-900">{item.item_name}</span>
                {item.required && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Required
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.status === 'damaged'}
                    onChange={() =>
                      updateItem(item.id, { status: item.status === 'damaged' ? 'ok' : 'damaged' })
                    }
                  />
                  Needs Repair
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.status === 'needs_replacement'}
                    onChange={() =>
                      updateItem(item.id, {
                        status: item.status === 'needs_replacement' ? 'ok' : 'needs_replacement',
                      })
                    }
                  />
                  Needs Replacement
                </label>
              </div>
              {item.status !== 'ok' && (
                <textarea
                  className="mt-3 w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Add comments about the issue..."
                  rows={2}
                  value={item.comments}
                  onChange={(e) => updateItem(item.id, { comments: e.target.value })}
                />
              )}
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={3}
              placeholder="Anything else about this report..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      )}
    </AdminModal>
  )
}
