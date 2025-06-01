import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface ChecklistReport {
  id: string
  transaction_id: string
  checklist_item_id: string
  status: 'Damaged/Needs Repair' | 'Needs Replacement/Resupply' | 'ok'
  comments: string | null
  created_at: string
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
          transaction:tool_transactions(
            tool:tools(number, name),
            from_user:users!from_user_id(name),
            to_user:users!to_user_id(name),
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
                      {report.transaction?.from_user?.name || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {report.transaction?.to_user?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {report.transaction?.timestamp 
                        ? new Date(report.transaction.timestamp).toLocaleString()
                        : new Date(report.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {report.comments || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
} 