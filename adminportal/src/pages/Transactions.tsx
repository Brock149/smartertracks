import { useState, useEffect, useMemo } from 'react'
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
  company_id: string
}

interface User {
  id: string
  name: string
  company_id: string
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
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  // Searchable selects state
  const [toolSearchTerm, setToolSearchTerm] = useState('')
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [showToolResults, setShowToolResults] = useState(false)
  const [showUserResults, setShowUserResults] = useState(false)

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
        .select('id, number, name, company_id')
        .order('number', { ascending: true })

      if (error) throw error
      const list = data || []
      list.sort((a, b) => {
        const an = parseInt(String(a.number), 10)
        const bn = parseInt(String(b.number), 10)
        if (Number.isNaN(an) && Number.isNaN(bn)) return String(a.number).localeCompare(String(b.number))
        if (Number.isNaN(an)) return 1
        if (Number.isNaN(bn)) return -1
        return an - bn
      })
      setTools(list)
    } catch (error: any) {
      console.error('Error fetching tools:', error)
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, company_id')
        .order('name', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (error: any) {
      console.error('Error fetching users:', error)
    }
  }

  // Keep search inputs in sync when selection changes
  useEffect(() => {
    if (newTransaction.tool_id) {
      const t = tools.find(t => t.id === newTransaction.tool_id)
      if (t) setToolSearchTerm(`#${t.number} - ${t.name}`)
    } else {
      setToolSearchTerm('')
    }
  }, [newTransaction.tool_id, tools])

  useEffect(() => {
    if (newTransaction.to_user_id) {
      const u = users.find(u => u.id === newTransaction.to_user_id)
      if (u) setUserSearchTerm(u.name)
    } else {
      setUserSearchTerm('')
    }
  }, [newTransaction.to_user_id, users])

  // Filtered results for search dropdowns
  const filteredToolResults = useMemo(() => {
    const term = toolSearchTerm.trim().toLowerCase()
    if (!term) return tools.slice(0, 50)
    return tools
      .filter(t =>
        t.number.toLowerCase().includes(term) ||
        (t.name || '').toLowerCase().includes(term)
      )
      .slice(0, 50)
  }, [toolSearchTerm, tools])

  const filteredUserResults = useMemo(() => {
    const term = userSearchTerm.trim().toLowerCase()
    if (!term) return users.slice(0, 50)
    return users
      .filter(u => (u.name || '').toLowerCase().includes(term))
      .slice(0, 50)
  }, [userSearchTerm, users])

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
  const filteredTransactions = useMemo(
    () =>
      transactions.filter(transaction =>
        transaction.tool?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.tool?.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.from_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.to_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.stored_at?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [transactions, searchTerm]
  )

  const totalPages = useMemo(
    () => Math.max(Math.ceil(filteredTransactions.length / itemsPerPage), 1),
    [filteredTransactions.length]
  )

  // Add pagination function
  const getPaginatedTransactions = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredTransactions.slice(startIndex, endIndex)
  }

  // Keep page in range when results change
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginationRange = useMemo<(number | string)[]>(() => {
    const siblingCount = 1
    const totalPageNumbers = siblingCount * 2 + 5 // first, last, current + 2 ellipses

    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const leftSibling = Math.max(currentPage - siblingCount, 1)
    const rightSibling = Math.min(currentPage + siblingCount, totalPages)
    const showLeftEllipsis = leftSibling > 2
    const showRightEllipsis = rightSibling < totalPages - 1

    if (!showLeftEllipsis && showRightEllipsis) {
      const leftRange = Array.from({ length: 4 }, (_, i) => i + 1)
      return [...leftRange, '…', totalPages]
    }

    if (showLeftEllipsis && !showRightEllipsis) {
      const rightRange = Array.from({ length: 4 }, (_, i) => totalPages - 3 + i)
      return [1, '…', ...rightRange]
    }

    const middleRange = Array.from(
      { length: rightSibling - leftSibling + 1 },
      (_, i) => leftSibling + i
    )
    return [1, '…', ...middleRange, '…', totalPages]
  }, [currentPage, totalPages])

  const handlePageJump = (targetTotalPages: number, setPage: (page: number) => void) => {
    const input = window.prompt(`Go to page (1-${targetTotalPages})`)
    if (!input) return
    const parsed = parseInt(input, 10)
    if (Number.isNaN(parsed)) return
    const clamped = Math.min(Math.max(1, parsed), targetTotalPages)
    setPage(clamped)
  }

  return (
    <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Tool Transactions</h2>
          <p className="text-base md:text-lg text-gray-500 mt-1">View all tool transfers and movements</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded text-base md:text-lg hover:bg-blue-700 transition-colors"
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
          className="w-full max-w-md px-3 md:px-5 py-2 md:py-3 border rounded-lg text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 md:px-5 py-2 md:py-3 rounded-lg mb-4 text-base md:text-lg">
          {error}
        </div>
      )}

      {/* Desktop Transactions Table */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-lg">Loading transactions...</div>
        ) : getPaginatedTransactions().length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-lg">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    Tool
                  </th>
                  <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    From
                  </th>
                  <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    To
                  </th>
                  <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    Stored At
                  </th>
                  <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getPaginatedTransactions().map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-medium text-gray-900">
                        {transaction.tool_id ? (
                          <>#{transaction.tool?.number} - {transaction.tool?.name}</>
                        ) : (
                          <>#{transaction.deleted_tool_number} - {transaction.deleted_tool_name} (Deleted)</>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg text-gray-900">
                        {transaction.deleted_from_user_name || transaction.from_user?.name || 'System'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg text-gray-900">
                        {transaction.deleted_to_user_name || transaction.to_user?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg text-gray-900">{transaction.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg text-gray-900">{transaction.stored_at}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg text-gray-900">
                        {new Date(transaction.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-lg text-gray-900">
                        {transaction.notes || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Transactions Cards */}
      <div className="md:hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-base">Loading transactions...</div>
        ) : getPaginatedTransactions().length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-base">No transactions found</div>
        ) : (
          <div className="space-y-4">
            {getPaginatedTransactions().map((transaction) => (
              <div key={transaction.id} className="bg-white shadow rounded-lg p-4 border border-gray-200">
                <div className="mb-3">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {transaction.tool_id ? (
                      <>#{transaction.tool?.number} - {transaction.tool?.name}</>
                    ) : (
                      <>#{transaction.deleted_tool_number} - {transaction.deleted_tool_name} (Deleted)</>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.timestamp).toLocaleString()}
                  </p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">From:</span>
                    <span className="text-gray-900">
                      {transaction.deleted_from_user_name || transaction.from_user?.name || 'System'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">To:</span>
                    <span className="text-gray-900">
                      {transaction.deleted_to_user_name || transaction.to_user?.name}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Location:</span>
                    <span className="text-gray-900">{transaction.location}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stored At:</span>
                    <span className="text-gray-900">{transaction.stored_at}</span>
                  </div>
                  
                  {transaction.notes && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Notes:</span>
                      <span className="text-gray-900 text-right max-w-48 truncate" title={transaction.notes}>
                        {transaction.notes}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow md:shadow-none">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
              </span>{' '}
              of <span className="font-medium">{filteredTransactions.length}</span> transactions
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              {paginationRange.map((item, idx) =>
                item === '…' ? (
                  <button
                    key={`ellipsis-${idx}`}
                    type="button"
                    onClick={() => handlePageJump(totalPages, setCurrentPage)}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    title="Jump to page"
                  >
                    …
                  </button>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(Number(item))}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === item
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Create Transaction Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl relative max-h-[90vh] flex flex-col">
            <div className="p-4 md:p-8 border-b">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
              <h3 className="text-xl md:text-2xl font-semibold">Create New Transaction</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <form onSubmit={(e) => { e.preventDefault(); handleCreateTransaction(); }} className="space-y-4 md:space-y-5">
                <div className="relative">
                  <label className="block font-medium mb-2 text-lg">Tool</label>
                  <input
                    type="text"
                    placeholder="Search tools by number or name..."
                    value={toolSearchTerm}
                    onChange={(e) => {
                      setToolSearchTerm(e.target.value)
                      if (newTransaction.tool_id) {
                        setNewTransaction(prev => ({ ...prev, tool_id: '' }))
                        setCurrentToolHolder(null)
                        setChecklistItems([])
                      }
                    }}
                    onFocus={() => setShowToolResults(true)}
                    onBlur={() => setTimeout(() => setShowToolResults(false), 150)}
                    className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {showToolResults && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow max-h-72 overflow-y-auto">
                      {filteredToolResults.length === 0 ? (
                        <div className="px-4 py-3 text-gray-500">No tools found</div>
                      ) : (
                        filteredToolResults.map(tool => (
                          <button
                            type="button"
                            key={tool.id}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setNewTransaction(prev => ({ ...prev, tool_id: tool.id }))
                              setToolSearchTerm(`#${tool.number} - ${tool.name}`)
                              setShowToolResults(false)
                              fetchCurrentToolHolder(tool.id)
                              fetchChecklist(tool.id)
                            }}
                          >
                            <span className="text-gray-900 font-medium">#{tool.number}</span>
                            <span className="text-gray-600">- {tool.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-medium mb-2 text-lg">From User</label>
                  {currentToolHolder ? (
                    <div className="w-full border rounded-lg px-5 py-3 bg-gray-50 text-gray-700 text-lg">
                      {currentToolHolder.name}
                    </div>
                  ) : (
                    <div className="w-full border rounded-lg px-5 py-3 bg-gray-50 text-gray-500 text-lg">
                      Select a tool to see current owner
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block font-medium mb-2 text-lg">To User</label>
                  <input
                    type="text"
                    placeholder="Search users by name..."
                    value={userSearchTerm}
                    onChange={(e) => {
                      setUserSearchTerm(e.target.value)
                      if (newTransaction.to_user_id) {
                        setNewTransaction(prev => ({ ...prev, to_user_id: '' }))
                      }
                    }}
                    onFocus={() => setShowUserResults(true)}
                    onBlur={() => setTimeout(() => setShowUserResults(false), 150)}
                    className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {showUserResults && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow max-h-72 overflow-y-auto">
                      {filteredUserResults.length === 0 ? (
                        <div className="px-4 py-3 text-gray-500">No users found</div>
                      ) : (
                        filteredUserResults.map(user => (
                          <button
                            type="button"
                            key={user.id}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setNewTransaction(prev => ({ ...prev, to_user_id: user.id }))
                              setUserSearchTerm(user.name)
                              setShowUserResults(false)
                            }}
                          >
                            <span className="text-gray-900 font-medium">{user.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-medium mb-2 text-lg">Location</label>
                  <input
                    type="text"
                    value={newTransaction.location}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, location: e.target.value }))}
                    required
                    placeholder="Where is the tool going?"
                    className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2 text-lg">Stored At</label>
                  <select
                    value={newTransaction.stored_at}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, stored_at: e.target.value }))}
                    required
                    className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block font-medium mb-2 text-lg">Tool Checklist</label>
                    {loadingChecklist ? (
                      <div className="text-gray-500 text-lg">Loading checklist...</div>
                    ) : checklistItems.length > 0 ? (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto bg-gray-50 p-4 rounded-lg">
                        {checklistItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between bg-white p-4 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{item.item_name}</span>
                              {item.required && (
                                <span className="text-base bg-blue-100 text-blue-800 px-3 py-1 rounded">Required</span>
                              )}
                            </div>
                            <div className="flex items-center gap-6">
                              <label className="flex items-center gap-2 text-lg text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={checklistStatus[item.id] === 'damaged'}
                                  onChange={() => {
                                    setChecklistStatus(prev => ({
                                      ...prev,
                                      [item.id]: prev[item.id] === 'damaged' ? null : 'damaged'
                                    }))
                                  }}
                                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 w-5 h-5"
                                />
                                <span>Damaged/Needs Repair</span>
                              </label>
                              <label className="flex items-center gap-2 text-lg text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={checklistStatus[item.id] === 'replace'}
                                  onChange={() => {
                                    setChecklistStatus(prev => ({
                                      ...prev,
                                      [item.id]: prev[item.id] === 'replace' ? null : 'replace'
                                    }))
                                  }}
                                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 w-5 h-5"
                                />
                                <span>Needs Replacement/Resupply</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 bg-gray-50 p-4 rounded-lg text-lg">
                        No checklist items found for this tool.
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block font-medium mb-2 text-lg">Notes</label>
                  <textarea
                    value={newTransaction.notes}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes about the transaction"
                    className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </form>
            </div>
            <div className="p-8 border-t bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 rounded-lg border text-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCreateTransaction();
                  }}
                >
                  Create Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 