import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface ChecklistReport {
  id: string
  transaction_id: string
  checklist_item_id: string
  status: 'Damaged/Needs Repair' | 'Needs Replacement/Resupply' | 'ok'
  comments: string | null
  created_at: string
  deleted_user_name?: string
  transaction?: {
    tool: {
      number: string
      name: string
    }
    from_user: {
      name: string
    }
    to_user: {
      name: string
    }
    deleted_from_user_name?: string
    deleted_to_user_name?: string
    timestamp: string
  }
  checklist_item?: {
    item_name: string
    required: boolean
  }
}

export default function Reports() {
  const [reports, setReports] = useState<ChecklistReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [reportToResolve, setReportToResolve] = useState<ChecklistReport | null>(null)
  const [resolveLoading, setResolveLoading] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [resolveSuccess, setResolveSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('checklist_reports')
        .select(`
          *,
          transaction:tool_transactions!inner(
            tool:tools(number, name),
            from_user:users!from_user_id(name),
            to_user:users!to_user_id(name),
            deleted_from_user_name,
            deleted_to_user_name,
            deleted_tool_number,
            deleted_tool_name,
            timestamp
          ),
          checklist_item:tool_checklists(item_name, required)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReports(data || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter reports based on search term
  const filteredReports = reports.filter(report => 
    report.transaction?.tool?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.transaction?.tool?.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.checklist_item?.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.transaction?.from_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.transaction?.to_user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  async function handleResolveReport() {
    if (!reportToResolve) return
    setResolveLoading(true)
    setResolveError(null)
    setResolveSuccess(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setResolveError('You must be logged in to resolve reports')
        setResolveLoading(false)
        return
      }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-checklist-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id: reportToResolve.id })
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setResolveError(result.error || 'Failed to resolve report')
        setResolveLoading(false)
        return
      }
      setResolveSuccess('Report resolved successfully!')
      setResolveLoading(false)
      setReportToResolve(null)
      fetchReports()
    } catch (err: any) {
      setResolveError(err.message || 'Failed to resolve report')
      setResolveLoading(false)
    }
  }

  function handleResolveOpen(report: ChecklistReport) {
    setReportToResolve(report)
  }

  function handleResolveClose() {
    setReportToResolve(null)
    setResolveError(null)
    setResolveSuccess(null)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <p className="text-gray-500 mt-1">View and analyze tool tracking data</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search reports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No reports found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tool
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      #{report.transaction?.tool?.number} - {report.transaction?.tool?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {report.checklist_item?.item_name}
                      {report.checklist_item?.required && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Required</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      report.status === 'Damaged/Needs Repair'
                        ? 'bg-yellow-100 text-yellow-800'
                        : report.status === 'Needs Replacement/Resupply'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {report.transaction?.deleted_from_user_name || report.transaction?.from_user?.name || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {report.transaction?.deleted_to_user_name || report.transaction?.to_user?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(report.transaction?.timestamp || report.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {report.comments || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleResolveOpen(report)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Resolved
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Resolve Report Modal */}
      {reportToResolve && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={handleResolveClose}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-xl font-semibold mb-6 text-green-600">Resolve Report</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Report Information</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Tool:</span>
                    <p className="text-gray-900">
                      #{reportToResolve.transaction?.tool?.number} - {reportToResolve.transaction?.tool?.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Item:</span>
                    <p className="text-gray-900">{reportToResolve.checklist_item?.item_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Status:</span>
                    <p className="text-gray-900">{reportToResolve.status}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Comments:</span>
                    <p className="text-gray-900">{reportToResolve.comments || '-'}</p>
                  </div>
                </div>
              </div>
              <p className="text-green-600 font-medium">
                Are you sure you want to mark this report as resolved? This action cannot be undone.
              </p>
              {resolveError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg">
                  {resolveError}
                </div>
              )}
              {resolveSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-2 rounded-lg">
                  {resolveSuccess}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                  onClick={handleResolveClose}
                  disabled={resolveLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  onClick={handleResolveReport}
                  disabled={resolveLoading}
                >
                  {resolveLoading ? 'Resolving...' : 'Confirm Resolve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 