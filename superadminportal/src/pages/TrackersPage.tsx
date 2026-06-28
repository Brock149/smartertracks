import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface PoolTracker {
  serial: string
  label: string | null
  last_seen_at: string | null
  first_seen_at: string | null
}

interface CompanyTracker {
  serial: string
  label: string | null
  company_id: string
  company_name: string
  assigned_at: string | null
  last_seen_at: string | null
  tool_id: string | null
  tool_name: string | null
  company_number: number | null
}

interface CompanyOption {
  id: string
  name: string
}

export default function TrackersPage() {
  const [pool, setPool] = useState<PoolTracker[]>([])
  const [assigned, setAssigned] = useState<CompanyTracker[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Assign form
  const [assignSerial, setAssignSerial] = useState('')
  const [assignCompanyId, setAssignCompanyId] = useState('')
  const [assignNumber, setAssignNumber] = useState('')
  const [busy, setBusy] = useState(false)

  // History viewer
  const [historyCompanyId, setHistoryCompanyId] = useState('')
  const [history, setHistory] = useState<
    { serial: string; label: string | null; assigned_at: string | null; released_at: string | null; is_active: boolean; company_number: number | null }[]
  >([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchAll = async () => {
    try {
      setLoading(true)
      setError('')
      const [poolRes, assignedRes, companiesRes] = await Promise.all([
        supabase.rpc('superadmin_global_tracker_pool'),
        supabase.rpc('superadmin_company_trackers'),
        supabase.rpc('get_companies_overview'),
      ])
      if (poolRes.error) throw poolRes.error
      if (assignedRes.error) throw assignedRes.error
      if (companiesRes.error) throw companiesRes.error
      setPool(poolRes.data || [])
      setAssigned(assignedRes.data || [])
      setCompanies(
        (companiesRes.data || []).map((c: any) => ({ id: c.id, name: c.name }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trackers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  // Auto-suggest the next free tracker number whenever the target company changes.
  useEffect(() => {
    if (!assignCompanyId) {
      setAssignNumber('')
      return
    }
    let active = true
    ;(async () => {
      const { data, error } = await supabase.rpc('next_company_tracker_number', {
        p_company_id: assignCompanyId,
      })
      if (active && !error && data != null) setAssignNumber(String(data))
    })()
    return () => {
      active = false
    }
  }, [assignCompanyId])

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    const serial = assignSerial.trim()
    if (!serial || !assignCompanyId) {
      setMessage('Pick a serial and a company first.')
      return
    }
    try {
      setBusy(true)
      setMessage('')
      const parsedNum = assignNumber.trim() === '' ? null : parseInt(assignNumber, 10)
      if (parsedNum != null && (Number.isNaN(parsedNum) || parsedNum < 1)) {
        setMessage('Tracker number must be a positive whole number.')
        setBusy(false)
        return
      }
      const { error } = await supabase.rpc('assign_tracker_to_company', {
        p_serial: serial,
        p_company_id: assignCompanyId,
        p_company_number: parsedNum,
      })
      if (error) throw error
      setMessage(
        parsedNum != null
          ? `Assigned ${serial} as Tracker ${parsedNum}.`
          : `Assigned ${serial} to company.`
      )
      setAssignSerial('')
      // Refresh the suggested number for the next assignment.
      const { data: nextNum } = await supabase.rpc('next_company_tracker_number', {
        p_company_id: assignCompanyId,
      })
      if (nextNum != null) setAssignNumber(String(nextNum))
      await fetchAll()
    } catch (err) {
      setMessage(err instanceof Error ? `Error: ${err.message}` : 'Failed to assign')
    } finally {
      setBusy(false)
    }
  }

  const handleReclaim = async (serial: string) => {
    if (!confirm(`Reclaim tracker ${serial} back to the global pool? This also detaches it from any tool.`)) {
      return
    }
    try {
      setBusy(true)
      setMessage('')
      const { error } = await supabase.rpc('reclaim_tracker_to_global', { p_serial: serial })
      if (error) throw error
      setMessage(`Reclaimed ${serial} to global pool.`)
      await fetchAll()
    } catch (err) {
      setMessage(err instanceof Error ? `Error: ${err.message}` : 'Failed to reclaim')
    } finally {
      setBusy(false)
    }
  }

  const loadHistory = async (companyId: string) => {
    setHistoryCompanyId(companyId)
    if (!companyId) {
      setHistory([])
      return
    }
    try {
      setHistoryLoading(true)
      const { data, error } = await supabase.rpc('superadmin_company_tracker_history', {
        p_company_id: companyId,
      })
      if (error) throw error
      setHistory(data || [])
    } catch (err) {
      setMessage(err instanceof Error ? `Error: ${err.message}` : 'Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : '—')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      )}
      {message && (
        <div
          className={`px-4 py-3 rounded border ${
            message.startsWith('Error')
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}
        >
          {message}
        </div>
      )}

      {/* Assign a tracker to a company */}
      <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-1">Assign a tracker to a company</h3>
        <p className="text-sm text-gray-500 mb-3">
          Pick a serial from the global pool (or type a serial that hasn't pinged yet) and ship it to
          a paying company. The company's own admins then attach it to their tools.
        </p>
        <form onSubmit={handleAssign} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Serial</label>
            <input
              list="pool-serials"
              value={assignSerial}
              onChange={(e) => setAssignSerial(e.target.value)}
              placeholder="e.g. 1813939"
              className="w-48 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <datalist id="pool-serials">
              {pool.map((p) => (
                <option key={p.serial} value={p.serial} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
            <select
              value={assignCompanyId}
              onChange={(e) => setAssignCompanyId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">Select a company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tracker #
            </label>
            <input
              type="number"
              min={1}
              value={assignNumber}
              onChange={(e) => setAssignNumber(e.target.value)}
              placeholder="auto"
              title="The number to write on the unit. Auto-fills to the next free number for this company."
              className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm"
              disabled={!assignCompanyId}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-md"
          >
            {busy ? 'Working…' : 'Assign'}
          </button>
        </form>
      </div>

      {/* Global unassigned pool */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Global unassigned pool ({pool.length})
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Trackers you own that haven't been sold/shipped to any company yet.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last seen</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pool.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-sm text-gray-500">
                    No unassigned trackers.
                  </td>
                </tr>
              ) : (
                pool.map((p) => (
                  <tr key={p.serial}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.serial}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.label || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmt(p.last_seen_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assigned to companies */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Assigned to companies ({assigned.length})
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Per-company assignments. A tracker may be assigned to a company but not yet attached to a tool.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracker #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attached tool</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last seen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assigned.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-sm text-gray-500">
                    No trackers assigned to any company yet.
                  </td>
                </tr>
              ) : (
                assigned.map((a) => (
                  <tr key={a.serial}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {a.company_number != null ? `Tracker ${a.company_number}` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.serial}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.company_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {a.tool_name || <span className="text-amber-600">Unattached</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmt(a.assigned_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmt(a.last_seen_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleReclaim(a.serial)}
                        disabled={busy}
                        className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50"
                      >
                        Reclaim
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-company assignment history */}
      <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-1">Assignment history by company</h3>
        <p className="text-sm text-gray-500 mb-3">
          Every tracker that has ever belonged to a company, including reclaimed (released) ones.
        </p>
        <select
          value={historyCompanyId}
          onChange={(e) => loadHistory(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white mb-3"
        >
          <option value="">Select a company…</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {historyLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : historyCompanyId && history.length === 0 ? (
          <p className="text-sm text-gray-500">No history for this company.</p>
        ) : history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tracker #</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Serial</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Released</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((h, i) => (
                  <tr key={`${h.serial}-${i}`}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {h.company_number != null ? `Tracker ${h.company_number}` : '—'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{h.serial}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{fmt(h.assigned_at)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{fmt(h.released_at)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          h.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {h.is_active ? 'Active' : 'Released'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )
}
