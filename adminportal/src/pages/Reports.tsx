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
    <div className="w-full px-2 md:px-6 py-4 md:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Reports</h2>
          <p className="text-base md:text-lg text-gray-500 mt-1">View and analyze tool tracking data</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search reports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-3 md:px-5 py-2 md:py-3 border rounded-lg text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 md:px-5 py-2 md:py-3 rounded-lg mb-4 text-base md:text-lg">
          {error}
        </div>
      )}

      {/* Desktop Reports Table */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-lg">Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-lg">No reports found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  Tool
                </th>
                <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  Comments
                </th>
                <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg font-medium text-gray-900">
                      #{report.transaction?.tool?.number} - {report.transaction?.tool?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg text-gray-900">
                      {report.checklist_item?.item_name}
                      {report.checklist_item?.required && (
                        <span className="ml-2 text-base bg-blue-100 text-blue-800 px-3 py-1 rounded">Required</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-base leading-5 font-semibold rounded-full ${
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
                    <div className="text-lg text-gray-900">
                      {report.transaction?.deleted_from_user_name || report.transaction?.from_user?.name || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg text-gray-900">
                      {report.transaction?.deleted_to_user_name || report.transaction?.to_user?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg text-gray-900">
                      {new Date(report.transaction?.timestamp || report.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg text-gray-900">
                      {report.comments || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-lg font-medium">
                    <button
                      onClick={() => handleResolveOpen(report)}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-green-700 transition-colors"
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

      {/* Mobile Reports Cards */}
      <div className="md:hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-base">Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-base">No reports found</div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="bg-white shadow rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 mr-3">
                    <h3 className="font-semibold text-base text-gray-900">
                      #{report.transaction?.tool?.number} - {report.transaction?.tool?.name}
                    </h3>
                    <p className="text-sm text-gray-600">{report.checklist_item?.item_name}</p>
                    {report.checklist_item?.required && (
                      <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Required</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleResolveOpen(report)}
                    className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    Resolve
                  </button>
                </div>
                
                <div className="mb-3">
                  <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                    report.status === 'Damaged/Needs Repair'
                      ? 'bg-yellow-100 text-yellow-800'
                      : report.status === 'Needs Replacement/Resupply'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {report.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">From:</span>
                    <span className="text-gray-900">
                      {report.transaction?.deleted_from_user_name || report.transaction?.from_user?.name || 'System'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">To:</span>
                    <span className="text-gray-900">
                      {report.transaction?.deleted_to_user_name || report.transaction?.to_user?.name}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="text-gray-900">
                      {new Date(report.transaction?.timestamp || report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {report.comments && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Comments:</span>
                      <span className="text-gray-900 text-right max-w-48 truncate" title={report.comments}>
                        {report.comments}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Report Modal */}
      {reportToResolve && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={handleResolveClose}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-xl md:text-2xl font-semibold mb-6 text-green-600">Resolve Report</h3>
            <div className="space-y-4 md:space-y-5">
              <div className="bg-gray-50 p-3 md:p-5 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3 md:mb-4 text-base md:text-lg">Report Information</h4>
                <div className="space-y-2 md:space-y-3">
                  <div>
                    <span className="text-sm md:text-base text-gray-500">Tool:</span>
                    <p className="text-base md:text-lg text-gray-900">
                      #{reportToResolve.transaction?.tool?.number} - {reportToResolve.transaction?.tool?.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm md:text-base text-gray-500">Item:</span>
                    <p className="text-base md:text-lg text-gray-900">{reportToResolve.checklist_item?.item_name}</p>
                  </div>
                  <div>
                    <span className="text-sm md:text-base text-gray-500">Status:</span>
                    <p className="text-base md:text-lg text-gray-900">{reportToResolve.status}</p>
                  </div>
                  <div>
                    <span className="text-sm md:text-base text-gray-500">Comments:</span>
                    <p className="text-base md:text-lg text-gray-900">{reportToResolve.comments || '-'}</p>
                  </div>
                </div>
              </div>
              <p className="text-green-600 font-medium text-base md:text-lg">
                Are you sure you want to mark this report as resolved? This action cannot be undone.
              </p>
              {resolveError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-3 md:px-5 py-2 md:py-3 rounded-lg text-base md:text-lg">
                  {resolveError}
                </div>
              )}
              {resolveSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-3 md:px-5 py-2 md:py-3 rounded-lg text-base md:text-lg">
                  {resolveSuccess}
                </div>
              )}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 md:pt-5">
                <button
                  type="button"
                  className="px-4 md:px-6 py-2 md:py-3 rounded-lg border text-base md:text-lg hover:bg-gray-50 transition-colors"
                  onClick={handleResolveClose}
                  disabled={resolveLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-green-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg text-base md:text-lg hover:bg-green-700 transition-colors disabled:opacity-50"
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