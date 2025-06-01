import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface Transaction {
  id: string
  tool_id: string | null
  from_user_id: string | null
  to_user_id: string
  location: string
  stored_at: string
  notes: string | null
  timestamp: string
  created_at: string
  deleted_from_user_name?: string
  deleted_to_user_name?: string
  deleted_tool_number?: string
  deleted_tool_name?: string
  tool?: {
    number: string
    name: string
  }
  from_user?: {
    name: string
  }
  to_user?: {
    name: string
  }
}

interface Tool {
  id: string
  number: string
  name: string
}

interface User {
  id: string
  name: string
}

interface ChecklistItem {
  id: string
  tool_id: string
  item_name: string
  required: boolean
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [tools, setTools] = useState<Tool[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [loadingChecklist, setLoadingChecklist] = useState(false)
  const [newTransaction, setNewTransaction] = useState<{
    tool_id: string
    from_user_id: string | null
    to_user_id: string
    location: string
    stored_at: string
    notes: string
  }>({
    tool_id: '',
    from_user_id: null,
    to_user_id: '',
    location: '',
    stored_at: '',
    notes: ''
  })
  const [currentToolHolder, setCurrentToolHolder] = useState<{ id: string; name: string } | null>(null)
  const [checklistStatus, setChecklistStatus] = useState<{ [itemId: string]: null | 'damaged' | 'replace' }>({})

  // Fetch transactions
  useEffect(() => {
    fetchTransactions()
    fetchTools()
    fetchUsers()
  }, [])

  async function fetchTransactions() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('tool_transactions')
        .select(`
          *,
          tool:tools(number, name),
          from_user:users!from_user_id(name),
          to_user:users!to_user_id(name),
          deleted_from_user_name,
          deleted_to_user_name,
          deleted_tool_number,
          deleted_tool_name
        `)
        .order('timestamp', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTools() {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('id, number, name')
        .order('number', { ascending: true })

      if (error) throw error
      setTools(data || [])
    } catch (error: any) {
      console.error('Error fetching tools:', error)
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (error: any) {
      console.error('Error fetching users:', error)
    }
  }

  async function handleCreateTransaction() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('You must be logged in to create transactions')
        return
      }

      // Build checklist_reports array from checklistStatus
      const checklist_reports = Object.entries(checklistStatus)
        .filter(([_, status]) => status)
        .map(([itemId, status]) => ({
          checklist_item_id: itemId,
          status: status === 'damaged' ? 'Damaged/Needs Repair' : status === 'replace' ? 'Needs Replacement/Resupply' : undefined
        }))
        .filter(r => r.status)

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-transaction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            ...newTransaction,
            checklist_reports
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create transaction')
      }

      // Reset form and close modal
      setNewTransaction({
        tool_id: '',
        from_user_id: null,
        to_user_id: '',
        location: '',
        stored_at: '',
        notes: ''
      })
      setChecklistStatus({})
      setIsCreateModalOpen(false)
      fetchTransactions() // Refresh the transactions list
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred')
    }
  }

  // Add function to fetch current tool holder
  async function fetchCurrentToolHolder(toolId: string) {
    try {
      const { data, error } = await supabase
        .from('tool_transactions')
        .select('to_user_id, to_user:users!to_user_id(name)')
        .eq('tool_id', toolId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      if (error) throw error
      if (data) {
        const userName = data.to_user && typeof data.to_user === 'object' && 'name' in data.to_user 
          ? String(data.to_user.name) 
          : 'Unknown User'
        
        setCurrentToolHolder({ 
          id: data.to_user_id, 
          name: userName
        })
        setNewTransaction(prev => ({ ...prev, from_user_id: data.to_user_id }))
      } else {
        // If no transactions found, it's a new tool
        setCurrentToolHolder({ id: '', name: 'System (New Tool)' })
        setNewTransaction(prev => ({ ...prev, from_user_id: null }))
      }
    } catch (error: any) {
      console.error('Error fetching current tool holder:', error)
      // If error, assume it's a new tool
      setCurrentToolHolder({ id: '', name: 'System (New Tool)' })
      setNewTransaction(prev => ({ ...prev, from_user_id: null }))
    }
  }

  // Add function to fetch checklist items
  async function fetchChecklist(toolId: string) {
    try {
      setLoadingChecklist(true)
      const { data, error } = await supabase
        .from('tool_checklists')
        .select('*')
        .eq('tool_id', toolId)
        .order('item_name', { ascending: true })

      if (error) throw error
      setChecklistItems(data || [])
    } catch (error: any) {
      console.error('Error fetching checklist:', error)
    } finally {
      setLoadingChecklist(false)
    }
  }

  // Filter transactions based on search term
  const filteredTransactions = transactions.filter(transaction => 
    transaction.tool?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.tool?.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.from_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.to_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.stored_at?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Tool Transactions</h2>
          <p className="text-gray-500 mt-1">View all tool transfers and movements</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Create New Transaction
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search transactions..."
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

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No transactions found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tool
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stored At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {transaction.tool_id ? (
                        <>#{transaction.tool?.number} - {transaction.tool?.name}</>
                      ) : (
                        <>#{transaction.deleted_tool_number} - {transaction.deleted_tool_name} (Deleted)</>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {transaction.deleted_from_user_name || transaction.from_user?.name || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {transaction.deleted_to_user_name || transaction.to_user?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{transaction.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{transaction.stored_at}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(transaction.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {transaction.notes || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Transaction Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setIsCreateModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-xl font-semibold mb-6">Create New Transaction</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateTransaction(); }} className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Tool</label>
                <select
                  value={newTransaction.tool_id}
                  onChange={(e) => {
                    setNewTransaction(prev => ({ ...prev, tool_id: e.target.value }))
                    if (e.target.value) {
                      fetchCurrentToolHolder(e.target.value)
                      fetchChecklist(e.target.value)
                    } else {
                      setCurrentToolHolder(null)
                      setChecklistItems([])
                    }
                  }}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a tool</option>
                  {tools.map(tool => (
                    <option key={tool.id} value={tool.id}>
                      #{tool.number} - {tool.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">From User</label>
                {currentToolHolder ? (
                  <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-700">
                    {currentToolHolder.name}
                  </div>
                ) : (
                  <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-500">
                    Select a tool to see current owner
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium mb-1">To User</label>
                <select
                  value={newTransaction.to_user_id}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, to_user_id: e.target.value }))}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={newTransaction.location}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, location: e.target.value }))}
                  required
                  placeholder="Where is the tool going?"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Stored At</label>
                <select
                  value={newTransaction.stored_at}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, stored_at: e.target.value }))}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select storage location</option>
                  <option value="on job site">On Job Site</option>
                  <option value="on truck">On Truck</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              {/* Add Checklist Display */}
              {newTransaction.tool_id && (
                <div>
                  <label className="block font-medium mb-1">Tool Checklist</label>
                  {loadingChecklist ? (
                    <div className="text-gray-500">Loading checklist...</div>
                  ) : checklistItems.length > 0 ? (
                    <div className="space-y-2 max-h-105 overflow-y-auto bg-gray-50 p-3 rounded-lg">
                      {checklistItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between bg-white p-2 rounded border"
                        >
                          <div className="flex items-center gap-2">
                            <span>{item.item_name}</span>
                            {item.required && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Required</span>
                            )}
                          </div>
                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={checklistStatus[item.id] === 'damaged'}
                                onChange={() => {
                                  setChecklistStatus(prev => ({
                                    ...prev,
                                    [item.id]: prev[item.id] === 'damaged' ? null : 'damaged'
                                  }))
                                }}
                                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                              />
                              <span>Damaged/Needs Repair</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={checklistStatus[item.id] === 'replace'}
                                onChange={() => {
                                  setChecklistStatus(prev => ({
                                    ...prev,
                                    [item.id]: prev[item.id] === 'replace' ? null : 'replace'
                                  }))
                                }}
                                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                              />
                              <span>Needs Replacement/Resupply</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 bg-gray-50 p-3 rounded-lg">
                      No checklist items found for this tool.
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-medium mb-1">Notes</label>
                <textarea
                  value={newTransaction.notes}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes about the transaction"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 