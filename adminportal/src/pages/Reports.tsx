import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import AdminModal from '../components/AdminModal'

type IssueStatus = 'Damaged/Needs Repair' | 'Needs Replacement/Resupply' | 'ok'
type ResolutionStatus = 'no_change' | 'in_progress' | 'resolved'

interface ResolutionUpdate {
  id: string
  resolution_status: ResolutionStatus
  notes: string | null
  created_at: string
  actor_name: string | null
}

interface ChecklistReport {
  id: string
  transaction_id: string
  checklist_item_id: string
  status: IssueStatus
  comments: string | null
  created_at: string
  deleted_user_name?: string
  resolution_status?: ResolutionStatus | null
  resolution_notes?: string | null
  resolution_updated_at?: string | null
  resolution_updated_by_name?: string | null
  resolved_at?: string | null
  resolved_by_name?: string | null
  transaction?: {
    tool: {
      number: string
      name: string
    } | null
    from_user: {
      name: string
    } | null
    to_user: {
      name: string
    } | null
    deleted_from_user_name?: string
    deleted_to_user_name?: string
    deleted_tool_number?: string
    deleted_tool_name?: string
    timestamp: string
  }
  checklist_item?: {
    item_name: string
    required: boolean
  }
  resolution_updates?: ResolutionUpdate[]
}

function resolutionOf(report: ChecklistReport): ResolutionStatus {
  return report.resolution_status || 'no_change'
}

function resolutionLabel(status: ResolutionStatus) {
  if (status === 'in_progress') return 'In progress'
  if (status === 'resolved') return 'Resolved'
  return 'No change'
}

function resolutionBadgeClass(status: ResolutionStatus) {
  if (status === 'in_progress') return 'bg-blue-100 text-blue-800'
  if (status === 'resolved') return 'bg-green-100 text-green-800'
  return 'bg-gray-100 text-gray-700'
}

function issueBadgeClass(status: IssueStatus) {
  if (status === 'Damaged/Needs Repair') return 'bg-yellow-100 text-yellow-800'
  if (status === 'Needs Replacement/Resupply') return 'bg-red-100 text-red-800'
  return 'bg-green-100 text-green-800'
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

function toolLabel(report: ChecklistReport) {
  const number = report.transaction?.tool?.number || report.transaction?.deleted_tool_number
  const name = report.transaction?.tool?.name || report.transaction?.deleted_tool_name
  if (number || name) return `#${number || '?'} - ${name || 'Unknown tool'}`
  return 'Unknown tool'
}

function matchesSearch(report: ChecklistReport, term: string) {
  if (!term) return true
  const haystack = [
    report.transaction?.tool?.name,
    report.transaction?.tool?.number,
    report.transaction?.deleted_tool_name,
    report.transaction?.deleted_tool_number,
    report.checklist_item?.item_name,
    report.status,
    report.comments,
    report.transaction?.from_user?.name,
    report.transaction?.to_user?.name,
    report.transaction?.deleted_from_user_name,
    report.transaction?.deleted_to_user_name,
    resolutionLabel(resolutionOf(report)),
    report.resolution_notes,
    report.resolution_updated_by_name,
    report.resolved_by_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(term)
}

export default function Reports() {
  const [reports, setReports] = useState<ChecklistReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [canManage, setCanManage] = useState(false)
  const [showResolved, setShowResolved] = useState(false)

  const [statusReport, setStatusReport] = useState<ChecklistReport | null>(null)
  const [statusValue, setStatusValue] = useState<ResolutionStatus>('no_change')
  const [statusNotes, setStatusNotes] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const [reportToResolve, setReportToResolve] = useState<ChecklistReport | null>(null)
  const [resolveNotes, setResolveNotes] = useState('')
  const [resolveLoading, setResolveLoading] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
      setCanManage(data?.role === 'admin' || data?.role === 'superadmin')
    })
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
      const rows = (data || []) as ChecklistReport[]
      const ids = rows.map((report) => report.id)
      let updatesByReport = new Map<string, ResolutionUpdate[]>()
      if (ids.length > 0) {
        const { data: updates } = await supabase
          .from('checklist_report_updates')
          .select('id, report_id, resolution_status, notes, created_at, actor_name')
          .in('report_id', ids)
          .order('created_at', { ascending: false })
        if (updates) {
          updatesByReport = updates.reduce((map, update: ResolutionUpdate & { report_id: string }) => {
            const list = map.get(update.report_id) || []
            list.push(update)
            map.set(update.report_id, list)
            return map
          }, new Map<string, ResolutionUpdate[]>())
        }
      }
      setReports(rows.map((report) => ({
        ...report,
        resolution_updates: updatesByReport.get(report.id) || [],
      })))
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const term = searchTerm.toLowerCase().trim()
  const filteredReports = useMemo(
    () => reports.filter((report) => matchesSearch(report, term)),
    [reports, term]
  )
  const openReports = filteredReports.filter((report) => resolutionOf(report) !== 'resolved')
  const resolvedReports = filteredReports.filter((report) => resolutionOf(report) === 'resolved')
  const resolvedCount = reports.filter((report) => resolutionOf(report) === 'resolved').length

  async function callUpdate(id: string, resolution_status: ResolutionStatus, notes: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('You must be logged in to update reports')
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-checklist-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id, resolution_status, notes }),
    })
    const result = await res.json()
    if (!res.ok || result.error) {
      throw new Error(result.error || 'Failed to update report')
    }
  }

  function handleStatusOpen(report: ChecklistReport, next?: ResolutionStatus) {
    const current = resolutionOf(report) === 'resolved' ? 'in_progress' : resolutionOf(report)
    setStatusReport(report)
    setStatusValue(next || current)
    setStatusNotes('')
    setStatusError(null)
  }

  function handleStatusClose() {
    setStatusReport(null)
    setStatusNotes('')
    setStatusError(null)
    setStatusLoading(false)
  }

  async function handleStatusSave() {
    if (!statusReport) return
    setStatusLoading(true)
    setStatusError(null)
    try {
      await callUpdate(statusReport.id, statusValue, statusNotes)
      handleStatusClose()
      fetchReports()
    } catch (err: any) {
      setStatusError(err.message || 'Failed to update report')
    } finally {
      setStatusLoading(false)
    }
  }

  function handleResolveOpen(report: ChecklistReport) {
    setReportToResolve(report)
    setResolveNotes(report.resolution_notes || '')
    setResolveError(null)
  }

  function handleResolveClose() {
    setReportToResolve(null)
    setResolveNotes('')
    setResolveError(null)
    setResolveLoading(false)
  }

  async function handleResolveReport() {
    if (!reportToResolve) return
    setResolveLoading(true)
    setResolveError(null)
    try {
      await callUpdate(reportToResolve.id, 'resolved', resolveNotes)
      handleResolveClose()
      fetchReports()
    } catch (err: any) {
      setResolveError(err.message || 'Failed to resolve report')
    } finally {
      setResolveLoading(false)
    }
  }

  function renderIssueBadge(report: ChecklistReport) {
    return (
      <span className={`px-3 py-1 inline-flex text-base leading-5 font-semibold rounded-full whitespace-nowrap ${issueBadgeClass(report.status)}`}>
        {report.status}
      </span>
    )
  }

  function renderWorkStatus(report: ChecklistReport, compact = false) {
    const status = resolutionOf(report)
    return (
      <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
        <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full whitespace-nowrap ${resolutionBadgeClass(status)}`}>
          {resolutionLabel(status)}
        </span>
        {status !== 'no_change' && report.resolution_notes && (
          <p className={`${compact ? 'text-sm' : 'text-base'} text-gray-700 whitespace-normal break-words`}>
            {report.resolution_notes}
          </p>
        )}
        {status !== 'no_change' && (report.resolution_updated_at || report.resolved_at) && (
          <p className="text-sm text-gray-500">
            {status === 'resolved' ? 'Resolved' : 'Updated'}{' '}
            {formatDate(status === 'resolved' ? report.resolved_at : report.resolution_updated_at)}
            {(status === 'resolved' ? report.resolved_by_name : report.resolution_updated_by_name)
              ? ` · ${status === 'resolved' ? report.resolved_by_name : report.resolution_updated_by_name}`
              : ''}
          </p>
        )}
      </div>
    )
  }

  function renderActions(report: ChecklistReport, resolved = false) {
    if (!canManage) return <span className="text-gray-400 text-base">View only</span>
    if (resolved) {
      return (
        <button
          onClick={() => handleStatusOpen(report, 'in_progress')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-base hover:bg-blue-700 transition-colors"
        >
          Reopen
        </button>
      )
    }
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleStatusOpen(report)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-base hover:bg-blue-700 transition-colors"
        >
          Update
        </button>
        <button
          onClick={() => handleResolveOpen(report)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-base hover:bg-green-700 transition-colors"
        >
          Resolved
        </button>
      </div>
    )
  }

  function renderDesktopTable(rows: ChecklistReport[], emptyLabel: string, resolved = false) {
    if (loading) {
      return <div className="p-8 text-center text-gray-500 text-lg">Loading reports...</div>
    }
    if (rows.length === 0) {
      return <div className="p-8 text-center text-gray-500 text-lg">{emptyLabel}</div>
    }
    return (
      <table className="w-full table-fixed divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider w-[16%]">Tool</th>
            <th className="px-4 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider w-[12%]">Item</th>
            <th className="px-4 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider w-[12%]">Issue</th>
            <th className="px-4 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider w-[16%]">Work status</th>
            <th className="px-4 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider w-[8%]">From</th>
            <th className="px-4 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider w-[8%]">To</th>
            <th className="px-4 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider w-[10%]">
              {resolved ? 'Resolved' : 'Reported'}
            </th>
            <th className="px-4 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider w-[10%]">Comments</th>
            <th className="px-4 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider w-[8%]">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((report) => (
            <tr key={report.id} className="hover:bg-gray-50">
              <td className="px-4 py-4 align-top">
                <div className="text-lg font-medium text-gray-900 break-words">{toolLabel(report)}</div>
              </td>
              <td className="px-4 py-4 align-top">
                <div className="text-lg text-gray-900 break-words">
                  {report.checklist_item?.item_name}
                  {report.checklist_item?.required && (
                    <span className="ml-2 text-base bg-blue-100 text-blue-800 px-3 py-1 rounded">Required</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 align-top">{renderIssueBadge(report)}</td>
              <td className="px-4 py-4 align-top">{renderWorkStatus(report)}</td>
              <td className="px-4 py-4 align-top">
                <div className="text-lg text-gray-900 break-words">
                  {report.transaction?.deleted_from_user_name || report.transaction?.from_user?.name || 'System'}
                </div>
              </td>
              <td className="px-4 py-4 align-top">
                <div className="text-lg text-gray-900 break-words">
                  {report.transaction?.deleted_to_user_name || report.transaction?.to_user?.name}
                </div>
              </td>
              <td className="px-4 py-4 align-top">
                <div className="text-lg text-gray-900 break-words">
                  {formatDateTime(
                    resolved
                      ? (report.resolved_at || report.resolution_updated_at || report.created_at)
                      : (report.transaction?.timestamp || report.created_at)
                  )}
                </div>
              </td>
              <td className="px-4 py-4 align-top">
                <div className="text-lg text-gray-900 whitespace-normal break-words">{report.comments || '-'}</div>
              </td>
              <td className="px-4 py-4 align-top whitespace-nowrap text-lg font-medium">
                {renderActions(report, resolved)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  function renderMobileCards(rows: ChecklistReport[], emptyLabel: string, resolved = false) {
    if (loading) {
      return <div className="p-8 text-center text-gray-500 text-base">Loading reports...</div>
    }
    if (rows.length === 0) {
      return <div className="p-8 text-center text-gray-500 text-base">{emptyLabel}</div>
    }
    return (
      <div className="space-y-4">
        {rows.map((report) => (
          <div key={report.id} className="bg-white shadow rounded-lg p-4 border border-gray-200">
            <div className="flex justify-between items-start mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base text-gray-900">{toolLabel(report)}</h3>
                <p className="text-sm text-gray-600">{report.checklist_item?.item_name}</p>
                {report.checklist_item?.required && (
                  <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Required</span>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {resolved ? (
                  canManage && (
                    <button
                      onClick={() => handleStatusOpen(report, 'in_progress')}
                      className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Reopen
                    </button>
                  )
                ) : (
                  canManage && (
                    <>
                      <button
                        onClick={() => handleStatusOpen(report)}
                        className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => handleResolveOpen(report)}
                        className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Resolve
                      </button>
                    </>
                  )
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${issueBadgeClass(report.status)}`}>
                {report.status}
              </span>
            </div>
            <div className="mb-3">{renderWorkStatus(report, true)}</div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">From:</span>
                <span className="text-gray-900 text-right">
                  {report.transaction?.deleted_from_user_name || report.transaction?.from_user?.name || 'System'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">To:</span>
                <span className="text-gray-900 text-right">
                  {report.transaction?.deleted_to_user_name || report.transaction?.to_user?.name}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">{resolved ? 'Resolved:' : 'Date:'}</span>
                <span className="text-gray-900">
                  {formatDate(
                    resolved
                      ? (report.resolved_at || report.resolution_updated_at || report.created_at)
                      : (report.transaction?.timestamp || report.created_at)
                  )}
                </span>
              </div>
              {report.comments && (
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500">Comments:</span>
                  <span className="text-gray-900 break-words">{report.comments}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const statusHistory = statusReport?.resolution_updates || []

  return (
    <div className="w-full px-2 md:px-6 py-4 md:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Reports</h2>
          <p className="text-base md:text-lg text-gray-500 mt-1">
            Track open damage reports and the work being done to resolve them
          </p>
        </div>
      </div>

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

      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        {renderDesktopTable(openReports, 'No open reports found')}
      </div>
      <div className="md:hidden">
        {renderMobileCards(openReports, 'No open reports found')}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={() => setShowResolved((open) => !open)}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-base md:text-lg text-gray-800 hover:bg-gray-50 transition-colors"
        >
          {showResolved ? 'Hide resolved conflicts' : `Show resolved conflicts${resolvedCount ? ` (${resolvedCount})` : ''}`}
        </button>
        {showResolved && (
          <div className="mt-4">
            <h3 className="text-xl md:text-2xl font-semibold mb-3">Resolved past conflicts</h3>
            <p className="text-gray-500 mb-4">
              Full history of reports that have been closed. These no longer warn people claiming the tool.
            </p>
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              {renderDesktopTable(resolvedReports, 'No resolved conflicts found', true)}
            </div>
            <div className="md:hidden">
              {renderMobileCards(resolvedReports, 'No resolved conflicts found', true)}
            </div>
          </div>
        )}
      </div>

      {statusReport && (
        <AdminModal
          title={resolutionOf(statusReport) === 'resolved' ? 'Reopen report' : 'Update work status'}
          onClose={handleStatusClose}
          maxWidthClass="max-w-lg"
          footer={
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                className="px-4 md:px-6 py-2 md:py-3 rounded-lg border text-base md:text-lg hover:bg-gray-50 transition-colors"
                onClick={handleStatusClose}
                disabled={statusLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg text-base md:text-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                onClick={handleStatusSave}
                disabled={statusLoading}
              >
                {statusLoading ? 'Saving...' : 'Save status'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 md:p-4 rounded-lg space-y-2">
              <p className="text-base md:text-lg text-gray-900">{toolLabel(statusReport)}</p>
              <p className="text-sm md:text-base text-gray-600">{statusReport.checklist_item?.item_name}</p>
              <p className="text-sm md:text-base text-gray-600">Issue: {statusReport.status}</p>
              {statusReport.comments && (
                <p className="text-sm md:text-base text-gray-600 break-words">Report comments: {statusReport.comments}</p>
              )}
              {statusReport.resolution_notes && (
                <p className="text-sm md:text-base text-gray-600 break-words">
                  Latest staff note: {statusReport.resolution_notes}
                </p>
              )}
            </div>
            <label className="block">
              <span className="text-sm md:text-base text-gray-600">Work status</span>
              <select
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value as ResolutionStatus)}
                className="mt-1 w-full px-3 py-2 border rounded-lg text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="no_change">No change</option>
                <option value="in_progress">In progress</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm md:text-base text-gray-600">
                Staff comments {statusValue === 'in_progress' ? '(required)' : '(optional)'}
              </span>
              <textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={4}
                placeholder="Waiting on parts, repair scheduled, ordered replacement, etc."
                className="mt-1 w-full px-3 py-2 border rounded-lg text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">Each save is kept in the report history.</p>
            </label>
            {statusHistory.length > 0 && (
              <div>
                <h4 className="text-sm md:text-base font-medium text-gray-700 mb-2">Status history</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {statusHistory.map((update) => (
                    <div key={update.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${resolutionBadgeClass(update.resolution_status)}`}>
                          {resolutionLabel(update.resolution_status)}
                        </span>
                        <span className="text-gray-500">{formatDateTime(update.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{update.actor_name || 'Staff'}</p>
                      {update.notes && <p className="text-sm text-gray-800 mt-1 break-words">{update.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {statusError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-base">
                {statusError}
              </div>
            )}
          </div>
        </AdminModal>
      )}

      {reportToResolve && (
        <AdminModal
          title="Resolve report"
          onClose={handleResolveClose}
          maxWidthClass="max-w-md"
          footer={
            <div className="flex flex-col sm:flex-row justify-end gap-3">
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
                {resolveLoading ? 'Resolving...' : 'Confirm resolve'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 md:p-4 rounded-lg space-y-2">
              <p className="text-base md:text-lg text-gray-900">{toolLabel(reportToResolve)}</p>
              <p className="text-sm md:text-base text-gray-600">{reportToResolve.checklist_item?.item_name}</p>
              <p className="text-sm md:text-base text-gray-600">Issue: {reportToResolve.status}</p>
            </div>
            <p className="text-gray-700 text-base md:text-lg">
              This keeps a history record instead of deleting the report. It will move to resolved conflicts and will no longer warn people claiming this tool.
            </p>
            <label className="block">
              <span className="text-sm md:text-base text-gray-600">Resolution notes (optional)</span>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={3}
                placeholder="Replaced hose, repaired motor, restocked parts, etc."
                className="mt-1 w-full px-3 py-2 border rounded-lg text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            {resolveError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-base">
                {resolveError}
              </div>
            )}
          </div>
        </AdminModal>
      )}
    </div>
  )
}
