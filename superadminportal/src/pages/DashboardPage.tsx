import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Company } from '../types'
import AddCompanyModal from '../components/AddCompanyModal'
import ViewAccessCodesModal from '../components/ViewAccessCodesModal'
import RenameCompanyModal from '../components/RenameCompanyModal'
import DeleteCompanyModal from '../components/DeleteCompanyModal'
import EditLimitsModal from '../components/EditLimitsModal'
import AppVersionsPage from './AppVersionsPage'

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
  const [activeTab, setActiveTab] = useState<'companies' | 'app-versions'>('companies')

  useEffect(() => {
    console.log('Dashboard useEffect: fetch companies')
    fetchCompanies()
  }, [])

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
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'app-versions' ? (
            <AppVersionsPage />
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

          {/* Add Company Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
            >
              + Add Company
            </button>
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
    </div>
  )
} 