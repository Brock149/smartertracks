import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchCompanyEvents } from '../lib/companyEvents'
import type { CompanyEvent } from '../lib/companyEvents'
import { useCompanyFeatures } from '../hooks/useCompanyFeatures'

// A unified feed row: either a tool transaction or a company activity event.
type FeedItem =
  | { kind: 'tx'; id: string; ts: string; tx: Transaction }
  | { kind: 'event'; id: string; ts: string; ev: CompanyEvent }

function eventMeta(eventType: string): { title: string; badge: string } {
  switch (eventType) {
    case 'tool_created':
      return { title: 'Tool created', badge: 'text-green-700 bg-green-50' }
    case 'tool_deleted':
      return { title: 'Tool deleted', badge: 'text-red-700 bg-red-50' }
    case 'user_added':
      return { title: 'User added', badge: 'text-green-700 bg-green-50' }
    case 'user_joined':
      return { title: 'User joined', badge: 'text-green-700 bg-green-50' }
    case 'user_removed':
      return { title: 'User removed', badge: 'text-amber-700 bg-amber-50' }
    case 'user_left':
      return { title: 'User left', badge: 'text-amber-700 bg-amber-50' }
    case 'tracker_attached':
      return { title: 'Tracker attached', badge: 'text-blue-700 bg-blue-50' }
    case 'tracker_detached':
      return { title: 'Tracker removed', badge: 'text-gray-700 bg-gray-100' }
    default:
      return { title: eventType, badge: 'text-gray-700 bg-gray-50' }
  }
}

interface Transaction {
  id: string
  tool_id: string | null
  from_user_id: string | null
  to_user_id: string
  location: string
  stored_at: string
  notes: string | null
  attribution?: string | null
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
  owner_name?: string | null
  location?: string | null
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

interface PoolTracker {
  serial: string
  label: string | null
  company_number: number | null
}

interface ActiveTrackerAssignment {
  serial: string
  mount_type: 'temporary' | 'permanent'
}

export default function Transactions() {
  const { features } = useCompanyFeatures()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [companyEvents, setCompanyEvents] = useState<CompanyEvent[]>([])
  // Tracker state for the create-transaction modal.
  const [trackerPool, setTrackerPool] = useState<PoolTracker[]>([])
  const [activeTrackers, setActiveTrackers] = useState<Record<string, ActiveTrackerAssignment>>({})
  const [attachSerialByTool, setAttachSerialByTool] = useState<Record<string, string>>({})
  const [detachByTool, setDetachByTool] = useState<Record<string, boolean>>({})
  const [trackerNumbers, setTrackerNumbers] = useState<Record<string, number>>({})

  // Friendly tracker name: "Tracker N" when numbered, else label, else serial.
  const trackerName = (serial: string, label?: string | null): string => {
    const n = trackerNumbers[serial]
    if (n != null) return `Tracker ${n}`
    return label || serial
  }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [tools, setTools] = useState<Tool[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [checklistItemsByTool, setChecklistItemsByTool] = useState<Record<string, ChecklistItem[]>>({})
  const [checklistStatusByTool, setChecklistStatusByTool] = useState<Record<string, Record<string, null | 'damaged' | 'replace'>>>({})
  const [checklistLoadingByTool, setChecklistLoadingByTool] = useState<Record<string, boolean>>({})
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
  const [selectedTools, setSelectedTools] = useState<Tool[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  // Searchable selects state
  const [toolSearchTerm, setToolSearchTerm] = useState('')
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [showToolResults, setShowToolResults] = useState(false)
  const [showUserResults, setShowUserResults] = useState(false)
  const toolSearchRef = useRef<HTMLInputElement | null>(null)

  // Fetch transactions
  useEffect(() => {
    fetchTransactions()
    fetchTools()
    fetchUsers()
    fetchCompanyEvents().then(setCompanyEvents)
  }, [])

  // Load the tracker pool + active tool assignments (only when the feature is on).
  useEffect(() => {
    if (!features.trackersEnabled) return
    fetchTrackerData()
  }, [features.trackersEnabled])

  async function fetchTrackerData() {
    try {
      const [poolRes, assignRes, numbersRes] = await Promise.all([
        supabase.rpc('company_tracker_pool'),
        supabase
          .from('tracker_tool_assignments')
          .select('tool_id, serial, mount_type')
          .is('detached_at', null),
        supabase
          .from('tracker_company_assignments')
          .select('serial, company_number')
          .is('released_at', null),
      ])
      if (!poolRes.error) setTrackerPool(poolRes.data || [])
      if (!assignRes.error) {
        const map: Record<string, ActiveTrackerAssignment> = {}
        for (const a of assignRes.data || []) {
          map[a.tool_id] = { serial: a.serial, mount_type: a.mount_type }
        }
        setActiveTrackers(map)
      }
      if (!numbersRes.error) {
        const numMap: Record<string, number> = {}
        for (const r of numbersRes.data || []) {
          if (r.company_number != null) numMap[r.serial] = r.company_number
        }
        setTrackerNumbers(numMap)
      }
    } catch (e) {
      console.warn('Failed to load tracker data (continuing):', e)
    }
  }

  // Apply any per-tool tracker attach/detach selected in the modal. Best-effort:
  // a tracker error must not roll back an already-created transaction. Each RPC
  // also writes its own company_events history line item (see migration).
  async function applyTrackerActions() {
    for (const tool of selectedTools) {
      try {
        const current = activeTrackers[tool.id]
        if (current && detachByTool[tool.id]) {
          await supabase.rpc('detach_tracker_from_tool', { p_tool_id: tool.id })
        } else if (!current && attachSerialByTool[tool.id]) {
          // mount_type omitted — defaulted by the RPC; no temporary/permanent UX.
          await supabase.rpc('attach_tracker_to_tool', {
            p_serial: attachSerialByTool[tool.id],
            p_tool_id: tool.id,
          })
        }
      } catch (e) {
        console.warn(`Tracker action failed for tool ${tool.id} (continuing):`, e)
      }
    }
  }

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
      const { data: toolsData, error: toolsError } = await supabase
        .from('tools')
        .select('id, number, name, company_id, current_owner')
        .order('number_numeric', { ascending: true })

      if (toolsError) throw toolsError
      const list = toolsData || []
      const toolIds = list.map(tool => tool.id)

      const [usersData, txData] = await Promise.all([
        supabase
          .from('users')
          .select('id, name'),
        supabase
          .from('tool_transactions')
          .select('tool_id, location, timestamp')
          .in('tool_id', toolIds)
          .order('timestamp', { ascending: false })
      ])

      if (usersData.error) throw usersData.error
      if (txData.error) throw txData.error

      const userMap = new Map((usersData.data || []).map(user => [user.id, user.name]))
      const latestLocation = new Map<string, string | null>()
      ;(txData.data || []).forEach((tx: any) => {
        if (!latestLocation.has(tx.tool_id)) {
          latestLocation.set(tx.tool_id, tx.location ?? null)
        }
      })

      const enriched = list.map(tool => ({
        ...tool,
        owner_name: tool.current_owner ? userMap.get(tool.current_owner) || null : null,
        location: latestLocation.get(tool.id) ?? null
      }))

      enriched.sort((a, b) => {
        const an = parseInt(String(a.number), 10)
        const bn = parseInt(String(b.number), 10)
        if (Number.isNaN(an) && Number.isNaN(bn)) return String(a.number).localeCompare(String(b.number))
        if (Number.isNaN(an)) return 1
        if (Number.isNaN(bn)) return -1
        return an - bn
      })
      setTools(enriched)
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
        (t.name || '').toLowerCase().includes(term) ||
        (t.owner_name || '').toLowerCase().includes(term) ||
        (t.location || '').toLowerCase().includes(term)
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

      if (!newTransaction.to_user_id || !newTransaction.location.trim() || !newTransaction.stored_at.trim()) {
        setError('Please fill in tool, recipient, location, and stored at')
        return
      }

      if (selectedTools.length === 0) {
        setError('Please select at least one tool')
        return
      }

      const checklist_reports = Object.entries(checklistStatusByTool).flatMap(([toolId, statuses]) =>
        Object.entries(statuses)
          .filter(([_, status]) => status)
          .map(([itemId, status]) => ({
            tool_id: toolId,
            checklist_item_id: itemId,
            status: status === 'damaged'
              ? 'Damaged/Needs Repair'
              : status === 'replace'
              ? 'Needs Replacement/Resupply'
              : undefined
          }))
          .filter(r => r.status)
      )

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-transactions-batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            tool_ids: selectedTools.map(tool => tool.id),
            to_user_id: newTransaction.to_user_id,
            location: newTransaction.location,
            stored_at: newTransaction.stored_at,
            notes: newTransaction.notes,
            checklist_reports,
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create transaction')
      }

      // Attach / detach any trackers chosen in the modal (best-effort, after the
      // transaction itself succeeded).
      if (features.trackersEnabled) {
        await applyTrackerActions()
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
      setSelectedTools([])
      setToolSearchTerm('')
      setChecklistItemsByTool({})
      setChecklistStatusByTool({})
      setChecklistLoadingByTool({})
      setAttachSerialByTool({})
      setDetachByTool({})
      setIsCreateModalOpen(false)
      fetchTransactions() // Refresh the transactions list
      fetchCompanyEvents().then(setCompanyEvents) // Pick up new tracker history items
      if (features.trackersEnabled) fetchTrackerData()
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
      setChecklistLoadingByTool(prev => ({ ...prev, [toolId]: true }))
      const { data, error } = await supabase
        .from('tool_checklists')
        .select('*')
        .eq('tool_id', toolId)
        .order('item_name', { ascending: true })

      if (error) throw error
      setChecklistItemsByTool(prev => ({
        ...prev,
        [toolId]: data || [],
      }))
    } catch (error: any) {
      console.error('Error fetching checklist:', error)
    } finally {
      setChecklistLoadingByTool(prev => ({ ...prev, [toolId]: false }))
    }
  }

  // Merge tool transactions + company activity events into one chronological feed.
  const feed = useMemo<FeedItem[]>(() => {
    const txItems: FeedItem[] = transactions.map((t) => ({
      kind: 'tx',
      id: `tx-${t.id}`,
      ts: t.timestamp || t.created_at,
      tx: t,
    }))
    const eventItems: FeedItem[] = companyEvents.map((e) => ({
      kind: 'event',
      id: `ev-${e.id}`,
      ts: e.created_at,
      ev: e,
    }))
    return [...txItems, ...eventItems].sort(
      (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
    )
  }, [transactions, companyEvents])

  // Filter the combined feed based on the search term.
  const filteredFeed = useMemo(() => {
    const term = searchTerm.toLowerCase()
    if (!term) return feed
    return feed.filter((item) => {
      if (item.kind === 'tx') {
        const t = item.tx
        return (
          t.tool?.name?.toLowerCase().includes(term) ||
          t.tool?.number?.toLowerCase().includes(term) ||
          t.from_user?.name?.toLowerCase().includes(term) ||
          t.to_user?.name?.toLowerCase().includes(term) ||
          t.location?.toLowerCase().includes(term) ||
          t.stored_at?.toLowerCase().includes(term)
        )
      }
      const e = item.ev
      return (
        (e.actor_name || '').toLowerCase().includes(term) ||
        (e.target_label || '').toLowerCase().includes(term) ||
        (e.details || '').toLowerCase().includes(term) ||
        eventMeta(e.event_type).title.toLowerCase().includes(term)
      )
    })
  }, [feed, searchTerm])

  const totalPages = useMemo(
    () => Math.max(Math.ceil(filteredFeed.length / itemsPerPage), 1),
    [filteredFeed.length]
  )

  // Add pagination function
  const getPaginatedFeed = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredFeed.slice(startIndex, endIndex)
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
          <p className="text-base md:text-lg text-gray-500 mt-1">
            All tool transfers, plus company activity (tools and users added, removed, or deleted)
          </p>
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
        ) : getPaginatedFeed().length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-lg">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-[20%] px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    Tool
                  </th>
                  <th className="w-[12%] px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    From
                  </th>
                  <th className="w-[12%] px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    To
                  </th>
                  <th className="w-[12%] px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="w-[10%] px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    Stored At
                  </th>
                  <th className="w-[14%] px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="w-[20%] px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                    Method / Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getPaginatedFeed().map((item) => {
                  if (item.kind === 'event') {
                    const ev = item.ev
                    const meta = eventMeta(ev.event_type)
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 bg-gray-50/40">
                        <td className="px-6 py-4">
                          <div className="text-lg font-medium text-gray-900 break-words">
                            {ev.target_label || meta.title}
                          </div>
                          <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded ${meta.badge}`}>
                            {meta.title}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-lg text-gray-900 break-words">{ev.actor_name || 'System'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-lg text-gray-400 break-words">—</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-lg text-gray-400 break-words">—</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-lg text-gray-400 break-words">—</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-lg text-gray-900 break-words">
                            {new Date(ev.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-lg text-gray-900 break-words">{ev.details || meta.title}</div>
                        </td>
                      </tr>
                    )
                  }
                  const transaction = item.tx
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-lg font-medium text-gray-900 break-words">
                          {transaction.tool_id ? (
                            <>#{transaction.tool?.number} - {transaction.tool?.name}</>
                          ) : (
                            <>#{transaction.deleted_tool_number} - {transaction.deleted_tool_name} (Deleted)</>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg text-gray-900 break-words">
                          {transaction.deleted_from_user_name
                            ? `${transaction.deleted_from_user_name} (removed)`
                            : transaction.from_user?.name || 'System'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg text-gray-900 break-words">
                          {transaction.deleted_to_user_name
                            ? `${transaction.deleted_to_user_name} (removed)`
                            : transaction.to_user?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg text-gray-900 break-words">{transaction.location}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg text-gray-900 break-words">{transaction.stored_at}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg text-gray-900 break-words">
                          {new Date(transaction.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {transaction.attribution && (
                          <div className="text-sm text-gray-500 italic break-words mb-1">
                            {transaction.attribution}
                          </div>
                        )}
                        <div className="text-lg text-gray-900 break-words">
                          {transaction.notes || '-'}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Transactions Cards */}
      <div className="md:hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-base">Loading transactions...</div>
        ) : getPaginatedFeed().length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-base">No transactions found</div>
        ) : (
          <div className="space-y-4">
            {getPaginatedFeed().map((item) => {
              if (item.kind === 'event') {
                const ev = item.ev
                const meta = eventMeta(ev.event_type)
                return (
                  <div key={item.id} className="bg-white shadow rounded-lg p-4 border border-gray-200">
                    <div className="mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">{ev.target_label || meta.title}</h3>
                    </div>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${meta.badge}`}>
                      {meta.title}
                    </span>
                    <div className="space-y-2 text-sm mt-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">By:</span>
                        <span className="text-gray-900">{ev.actor_name || 'System'}</span>
                      </div>
                      {ev.details && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Details:</span>
                          <span className="text-gray-900 text-right max-w-48 break-words">{ev.details}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">When:</span>
                        <span className="text-gray-900">{new Date(ev.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )
              }
              const transaction = item.tx
              return (
              <div key={item.id} className="bg-white shadow rounded-lg p-4 border border-gray-200">
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
                      {transaction.deleted_from_user_name
                        ? `${transaction.deleted_from_user_name} (removed)`
                        : transaction.from_user?.name || 'System'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">To:</span>
                    <span className="text-gray-900">
                      {transaction.deleted_to_user_name
                        ? `${transaction.deleted_to_user_name} (removed)`
                        : transaction.to_user?.name}
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
                  
                  {transaction.attribution && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Method:</span>
                      <span className="text-gray-600 italic text-right max-w-48 break-words" title={transaction.attribution}>
                        {transaction.attribution}
                      </span>
                    </div>
                  )}

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
              )
            })}
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
                {Math.min(currentPage * itemsPerPage, filteredFeed.length)}
              </span>{' '}
              of <span className="font-medium">{filteredFeed.length}</span> entries
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
                      if (!showToolResults) {
                        setShowToolResults(true)
                      }
                    }}
                    onFocus={() => setShowToolResults(true)}
                    onBlur={() => setTimeout(() => setShowToolResults(false), 150)}
                    className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ref={toolSearchRef}
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
                              setSelectedTools(prev => {
                                if (prev.find(t => t.id === tool.id)) return prev
                                const next = [...prev, tool]
                                if (next.length === 1) {
                                  fetchCurrentToolHolder(tool.id)
                                } else {
                                  setCurrentToolHolder({ id: '', name: 'Multiple tools selected' })
                                }
                                return next
                              })
                              setToolSearchTerm('')
                              setShowToolResults(false)
                              fetchChecklist(tool.id)
                              setTimeout(() => toolSearchRef.current?.focus(), 0)
                            }}
                          >
                            <div className="flex flex-col">
                              <div className="text-gray-900 font-medium">#{tool.number} - {tool.name}</div>
                              <div className="text-xs text-gray-500">
                                Owner: {tool.owner_name || 'Unassigned'} • Location: {tool.location || 'Unknown'}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedTools.length > 0 && (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-base font-medium text-gray-700">Selected Tools ({selectedTools.length})</div>
                      <button
                        type="button"
                        onClick={() => {
                          setToolSearchTerm('')
                          setShowToolResults(true)
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Add another tool
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedTools.map(tool => (
                        <div key={tool.id} className="flex items-center justify-between bg-white px-3 py-2 rounded border">
                          <div className="text-sm text-gray-800">
                            <span className="font-medium">#{tool.number}</span> {tool.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTools(prev => {
                                const next = prev.filter(t => t.id !== tool.id)
                                if (next.length === 1) {
                                  fetchCurrentToolHolder(next[0].id)
                                } else if (next.length === 0) {
                                  setCurrentToolHolder(null)
                                } else {
                                  setCurrentToolHolder({ id: '', name: 'Multiple tools selected' })
                                }
                                return next
                              })
                              setChecklistItemsByTool(prev => {
                                const next = { ...prev }
                                delete next[tool.id]
                                return next
                              })
                              setChecklistStatusByTool(prev => {
                                const next = { ...prev }
                                delete next[tool.id]
                                return next
                              })
                              setChecklistLoadingByTool(prev => {
                                const next = { ...prev }
                                delete next[tool.id]
                                return next
                              })
                            }}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                {selectedTools.length > 0 && (
                  <div>
                    <label className="block font-medium mb-2 text-lg">Tool Checklist</label>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto bg-gray-50 p-4 rounded-lg">
                      {selectedTools.map(tool => {
                        const items = checklistItemsByTool[tool.id] || []
                        const isLoading = checklistLoadingByTool[tool.id]
                        return (
                          <div key={tool.id} className="bg-white p-4 rounded-lg border space-y-3">
                            <div className="text-base font-semibold text-gray-900">
                              #{tool.number} - {tool.name}
                            </div>
                            {isLoading ? (
                              <div className="text-gray-500 text-lg">Loading checklist...</div>
                            ) : items.length > 0 ? (
                              <div className="space-y-3">
                                {items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex flex-col gap-3 bg-gray-50 p-3 rounded-lg border"
                                  >
                                    <div className="flex flex-wrap items-center gap-3">
                                      <span className="text-lg break-words">{item.item_name}</span>
                                      {item.required && (
                                        <span className="text-base bg-blue-100 text-blue-800 px-3 py-1 rounded">Required</span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-6">
                                      <label className="flex items-center gap-2 text-lg text-gray-700">
                                        <input
                                          type="checkbox"
                                          checked={checklistStatusByTool[tool.id]?.[item.id] === 'damaged'}
                                          onChange={() => {
                                            setChecklistStatusByTool(prev => ({
                                              ...prev,
                                              [tool.id]: {
                                                ...prev[tool.id],
                                                [item.id]: prev[tool.id]?.[item.id] === 'damaged' ? null : 'damaged'
                                              }
                                            }))
                                          }}
                                          className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 w-5 h-5"
                                        />
                                        <span className="whitespace-normal">Damaged/Needs Repair</span>
                                      </label>
                                      <label className="flex items-center gap-2 text-lg text-gray-700">
                                        <input
                                          type="checkbox"
                                          checked={checklistStatusByTool[tool.id]?.[item.id] === 'replace'}
                                          onChange={() => {
                                            setChecklistStatusByTool(prev => ({
                                              ...prev,
                                              [tool.id]: {
                                                ...prev[tool.id],
                                                [item.id]: prev[tool.id]?.[item.id] === 'replace' ? null : 'replace'
                                              }
                                            }))
                                          }}
                                          className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 w-5 h-5"
                                        />
                                        <span className="whitespace-normal">Needs Replacement/Resupply</span>
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
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* GPS Trackers — attach/detach per selected tool during the transaction */}
                {features.trackersEnabled && selectedTools.length > 0 && (
                  <div>
                    <label className="block font-medium mb-2 text-lg">GPS Trackers</label>
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                      {selectedTools.map((tool) => {
                        const current = activeTrackers[tool.id]
                        const willDetach = !!detachByTool[tool.id]
                        return (
                          <div key={tool.id} className="bg-white p-4 rounded-lg border space-y-3">
                            <div className="text-base font-semibold text-gray-900">
                              #{tool.number} - {tool.name}
                            </div>
                            {current ? (
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  <span className="text-base">📡</span>
                                  <span className="font-medium text-gray-900">{trackerName(current.serial)}</span>
                                  <span className="text-xs text-gray-400">({current.serial})</span>
                                  <span className="text-xs text-gray-500">attached</span>
                                </div>
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={willDetach}
                                    onChange={() =>
                                      setDetachByTool((s) => ({ ...s, [tool.id]: !s[tool.id] }))
                                    }
                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-5 h-5"
                                  />
                                  <span className="text-sm text-gray-700">
                                    Detach this tracker during this transaction
                                  </span>
                                </label>
                              </div>
                            ) : trackerPool.length === 0 ? (
                              <p className="text-sm text-gray-400">No trackers available to attach.</p>
                            ) : (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Attach tracker</label>
                                <select
                                  value={attachSerialByTool[tool.id] || ''}
                                  onChange={(e) =>
                                    setAttachSerialByTool((s) => ({ ...s, [tool.id]: e.target.value }))
                                  }
                                  className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm bg-white"
                                >
                                  <option value="">None</option>
                                  {trackerPool.map((p) => (
                                    <option key={p.serial} value={p.serial}>
                                      {trackerName(p.serial, p.label)} ({p.serial})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
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