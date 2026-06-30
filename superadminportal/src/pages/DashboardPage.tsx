import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Company } from '../types'
import AddCompanyModal from '../components/AddCompanyModal'
import ViewAccessCodesModal from '../components/ViewAccessCodesModal'
import RenameCompanyModal from '../components/RenameCompanyModal'
import DeleteCompanyModal from '../components/DeleteCompanyModal'
import EditLimitsModal from '../components/EditLimitsModal'
import EditFeaturesModal from '../components/EditFeaturesModal'
import AppVersionsPage from './AppVersionsPage'
import TrackersPage from './TrackersPage'

export default function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user, signOut } = useAuth()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [codesCompany, setCodesCompany] = useState<{id:string,name:string}|null>(null)
  const [renameCompany, setRenameCompany] = useState<Company|null>(null)
  const [deleteCompany, setDeleteCompany] = useState<Company|null>(null)
  const [limitsCompany, setLimitsCompany] = useState<Company|null>(null)
  const [featuresCompany, setFeaturesCompany] = useState<Company|null>(null)
  const [activeTab, setActiveTab] = useState<'companies' | 'app-versions' | 'trackers'>('companies')
  const [purging, setPurging] = useState(false)
  const [purgeMessage, setPurgeMessage] = useState('')
  // One-off "test the scheduler" controls.
  const [schedCompanyId, setSchedCompanyId] = useState('')
  const [schedType, setSchedType] = useState<'personal' | 'company'>('personal')
  const [schedMinutes, setSchedMinutes] = useState(5)
  const [scheduling, setScheduling] = useState(false)
  const [schedMessage, setSchedMessage] = useState('')

  // Weekly automated-report schedule (when it fires, Eastern time).
  const [weekday, setWeekday] = useState(2)
  const [hour, setHour] = useState(8)
  const [minute, setMinute] = useState(0)
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleMessage, setScheduleMessage] = useState('')

  useEffect(() => {
    console.log('Dashboard useEffect: fetch companies')
    fetchCompanies()
    fetchExportSchedule()
  }, [])

  // Default the scheduler company picker to the first company once loaded.
  useEffect(() => {
    if (!schedCompanyId && companies.length > 0) {
      setSchedCompanyId(companies[0].id)
    }
  }, [companies, schedCompanyId])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      setError('')
      console.log('Fetching companies via RPC...')
      const { data, error } = await supabase.rpc('get_companies_overview')
      console.log('RPC response:', { data, error })
      if (error) throw error
      setCompanies(data || [])
    } catch (err) {
      console.error('Fetch companies error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch companies')
    } finally {
      setLoading(false)
    }
  }

  const toggleCompanyStatus = async (companyId: string, currentStatus: boolean) => {
    try {
      console.log('Toggling company status...', { companyId, currentStatus })
      const { error } = await supabase
        .from('companies')
        .update({
          is_active: !currentStatus,
          suspended_at: !currentStatus ? null : new Date().toISOString()
        })
        .eq('id', companyId)
      if (error) throw error
      await fetchCompanies()
    } catch (err) {
      console.error('Toggle status error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update company status')
    }
  }

  const handlePurgeDeletedTools = async () => {
    if (!confirm('Permanently delete all soft-deleted personal tools (and their photos) across every company? This cannot be undone.')) {
      return
    }
    try {
      setPurging(true)
      setPurgeMessage('')
      const { data, error } = await supabase.functions.invoke('purge-deleted-personal-tools')
      if (error) throw error
      const purged = data?.purged ?? 0
      const files = data?.files_removed ?? 0
      setPurgeMessage(
        purged === 0
          ? 'Nothing to purge — already clean.'
          : `Purged ${purged} tool${purged !== 1 ? 's' : ''} and removed ${files} photo file${files !== 1 ? 's' : ''}.`
      )
    } catch (err) {
      setPurgeMessage(err instanceof Error ? `Error: ${err.message}` : 'Failed to purge')
    } finally {
      setPurging(false)
    }
  }

  const fetchExportSchedule = async () => {
    try {
      setScheduleLoading(true)
      const { data, error } = await supabase
        .from('export_schedule_settings')
        .select('weekday, hour, minute')
        .eq('id', true)
        .single()
      if (error) throw error
      if (data) {
        setWeekday(data.weekday)
        setHour(data.hour)
        setMinute(data.minute)
      }
    } catch (err) {
      console.error('Fetch export schedule error:', err)
    } finally {
      setScheduleLoading(false)
    }
  }

  const handleSaveExportSchedule = async () => {
    try {
      setScheduleSaving(true)
      setScheduleMessage('')
      const { error } = await supabase.rpc('update_export_schedule', {
        p_weekday: weekday,
        p_hour: hour,
        p_minute: minute,
      })
      if (error) throw error
      setScheduleMessage('Saved. Takes effect immediately — no redeploy needed.')
    } catch (err) {
      setScheduleMessage(err instanceof Error ? `Error: ${err.message}` : 'Failed to save schedule')
    } finally {
      setScheduleSaving(false)
    }
  }

  const handleScheduleTestRun = async () => {
    if (!schedCompanyId) {
      setSchedMessage('Pick a company first.')
      return
    }
    try {
      setScheduling(true)
      setSchedMessage('')
      const { data, error } = await supabase.functions.invoke('schedule-export-run', {
        body: { company_id: schedCompanyId, type: schedType, minutes_from_now: schedMinutes },
      })
      if (error) throw error
      const runAt = data?.run_at ? new Date(data.run_at).toLocaleTimeString() : 'soon'
      setSchedMessage(
        `Scheduled a ${schedType} report for ${schedMinutes} min from now (around ${runAt}). It will send automatically once due.`
      )
    } catch (err) {
      setSchedMessage(err instanceof Error ? `Error: ${err.message}` : 'Failed to schedule')
    } finally {
      setScheduling(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const formatLimit = (limit: number | null) => {
    if (limit === null || limit === undefined) return '∞'
    return limit.toString()
  }

  console.log('DashboardPage rendering, loading:', loading)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.name || 'Loading...'}</p>
            </div>
            <button
              onClick={signOut}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('companies')}
              className={`${
                activeTab === 'companies'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              🏢 Companies
            </button>
            <button
              onClick={() => setActiveTab('app-versions')}
              className={`${
                activeTab === 'app-versions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              📱 App Versions
            </button>
            <button
              onClick={() => setActiveTab('trackers')}
              className={`${
                activeTab === 'trackers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              📍 Trackers
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'app-versions' ? (
            <AppVersionsPage />
          ) : activeTab === 'trackers' ? (
            <TrackersPage />
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {/* Debug Info (can remove later) */}
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
                <p>Debug: Total companies = {companies.length}</p>
                <p>Debug: Loading = {loading.toString()}</p>
                {error && <p>Error: {error}</p>}
              </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-end items-center gap-3 mb-4">
            {purgeMessage && (
              <span className={`text-sm ${purgeMessage.startsWith('Error') ? 'text-red-600' : 'text-gray-600'}`}>
                {purgeMessage}
              </span>
            )}
            <button
              onClick={handlePurgeDeletedTools}
              disabled={purging}
              title="Permanently remove personal tools that were deleted in the app, freeing storage space"
              className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md"
            >
              {purging ? 'Purging…' : '🧹 Purge Deleted Personal Tools'}
            </button>
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
            >
              + Add Company
            </button>
          </div>

          {/* Weekly automated-report schedule (when the recurring job fires) */}
          <div className="bg-white shadow rounded-lg p-4 mb-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-1">🗓️ Weekly report schedule</h3>
            <p className="text-sm text-gray-500 mb-3">
              When the automated weekly inventory reports go out, in Eastern time. Handles
              daylight saving automatically — no manual UTC math required.
            </p>
            {scheduleLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Day</label>
                  <select
                    value={weekday}
                    onChange={(e) => setWeekday(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Time (Eastern)</label>
                  <div className="flex items-center gap-1">
                    <select
                      value={hour}
                      onChange={(e) => setHour(Number(e.target.value))}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>
                          {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-500">:</span>
                    <select
                      value={minute}
                      onChange={(e) => setMinute(Number(e.target.value))}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                        <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleSaveExportSchedule}
                  disabled={scheduleSaving}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-md"
                >
                  {scheduleSaving ? 'Saving…' : 'Save schedule'}
                </button>
                {scheduleMessage && (
                  <span className={`text-sm ${scheduleMessage.startsWith('Error') ? 'text-red-600' : 'text-gray-600'}`}>
                    {scheduleMessage}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Test the automated-report scheduler (one-off, superadmin only) */}
          <div className="bg-white shadow rounded-lg p-4 mb-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-1">🧪 Test report scheduler</h3>
            <p className="text-sm text-gray-500 mb-3">
              Queue a one-off automated report to fire in a few minutes so you can verify the
              scheduler works — no need to wait for the weekly run. The report goes to that company's
              configured recipients.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                <select
                  value={schedCompanyId}
                  onChange={(e) => setSchedCompanyId(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Report</label>
                <select
                  value={schedType}
                  onChange={(e) => setSchedType(e.target.value as 'personal' | 'company')}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="personal">Personal tools</option>
                  <option value="company">Company tools</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Minutes from now</label>
                <input
                  type="number"
                  min={1}
                  value={schedMinutes}
                  onChange={(e) => setSchedMinutes(Math.max(1, Number(e.target.value) || 1))}
                  className="w-28 border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleScheduleTestRun}
                disabled={scheduling}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-md"
              >
                {scheduling ? 'Scheduling…' : 'Schedule test report'}
              </button>
              {schedMessage && (
                <span className={`text-sm ${schedMessage.startsWith('Error') ? 'text-red-600' : 'text-gray-600'}`}>
                  {schedMessage}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{companies.length}</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Companies</dt>
                      <dd className="text-lg font-medium text-gray-900">{companies.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{companies.filter(c => c.is_active).length}</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Companies</dt>
                      <dd className="text-lg font-medium text-gray-900">{companies.filter(c => c.is_active).length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{companies.filter(c => !c.is_active).length}</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Suspended Companies</dt>
                      <dd className="text-lg font-medium text-gray-900">{companies.filter(c => !c.is_active).length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Companies Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Companies</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Manage all companies in the system
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tools
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{company.name}</div>
                          <div className="text-sm text-gray-500">Created {formatDate(company.created_at)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          company.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {company.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {company.user_count} / {formatLimit(company.user_limit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {company.tool_count} / {formatLimit(company.tool_limit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {company.enforcement_mode ?? 'off'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(company.last_activity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setLimitsCompany(company)}
                          className="mr-2 px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                        >
                          Limits
                        </button>
                        <button
                          onClick={() => setFeaturesCompany(company)}
                          className="mr-2 px-3 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200"
                        >
                          Features
                        </button>
                        <button
                          onClick={() => toggleCompanyStatus(company.id, company.is_active)}
                          className={`mr-2 px-3 py-1 rounded text-xs font-medium ${
                            company.is_active
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {company.is_active ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => setCodesCompany({id: company.id, name: company.name})}
                          className="px-3 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                        >
                          View Codes
                        </button>
                        <button
                          onClick={() => setRenameCompany(company)}
                          className="mr-2 px-3 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => setDeleteCompany(company)}
                          className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
        </div>
      </div>

      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={fetchCompanies}
      />

      <ViewAccessCodesModal
        companyId={codesCompany?.id || null}
        companyName={codesCompany?.name || null}
        isOpen={!!codesCompany}
        onClose={() => setCodesCompany(null)}
      />

      <RenameCompanyModal
        company={renameCompany}
        isOpen={!!renameCompany}
        onClose={() => setRenameCompany(null)}
        onSuccess={fetchCompanies}
      />

      <DeleteCompanyModal
        company={deleteCompany}
        isOpen={!!deleteCompany}
        onClose={() => setDeleteCompany(null)}
        onSuccess={fetchCompanies}
      />

      <EditLimitsModal
        company={limitsCompany}
        isOpen={!!limitsCompany}
        onClose={() => setLimitsCompany(null)}
        onSuccess={fetchCompanies}
      />

      <EditFeaturesModal
        company={featuresCompany}
        isOpen={!!featuresCompany}
        onClose={() => setFeaturesCompany(null)}
        onSuccess={fetchCompanies}
      />
    </div>
  )
} 