import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ToolImageGallery } from '../components/ToolImageGallery'

type ToolGroup = {
  id: string
  name: string
  description: string | null
  created_at: string
}

type ToolSummary = {
  id: string
  number: string
  name: string
  description?: string | null
  owner_name?: string | null
  location?: string | null
}

type ChecklistItem = {
  id: string
  tool_id: string
  item_name: string
  required: boolean
}

type GroupMember = {
  tool_id: string
  tools: ToolSummary | null
}

type GroupToolInfo = {
  number: string
  name: string
}

type GroupActivity = {
  id: string
  action: string
  group_name: string | null
  actor_name: string | null
  created_at: string
}

export default function ToolGroups() {
  const [groups, setGroups] = useState<ToolGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<ToolGroup | null>(null)
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [tools, setTools] = useState<ToolSummary[]>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupSearch, setGroupSearch] = useState('')
  const [allGroupToolsMap, setAllGroupToolsMap] = useState<Record<string, GroupToolInfo[]>>({})
  const [groupsPage, setGroupsPage] = useState(1)
  const groupsPerPage = 15
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isAddToolsOpen, setIsAddToolsOpen] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: '', description: '' })
  const [toolSearch, setToolSearch] = useState('')
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferForm, setTransferForm] = useState({
    to_user_id: '',
    location: '',
    stored_at: '',
    notes: '',
  })
  const [groupActivity, setGroupActivity] = useState<GroupActivity[]>([])
  const [activeView, setActiveView] = useState<'groups' | 'activity'>('groups')
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false)
  const [editGroupForm, setEditGroupForm] = useState({ name: '', description: '' })
  const [editingMemberTool, setEditingMemberTool] = useState<ToolSummary | null>(null)
  const [editToolForm, setEditToolForm] = useState({ name: '', description: '' })
  const [editToolLoading, setEditToolLoading] = useState(false)
  const [isTransferToolOpen, setIsTransferToolOpen] = useState(false)
  const [transferToolMember, setTransferToolMember] = useState<GroupMember | null>(null)
  const [singleTransferForm, setSingleTransferForm] = useState({ to_user_id: '', location: '', stored_at: '', notes: '' })
  const [singleTransferLoading, setSingleTransferLoading] = useState(false)
  const [transferChecklistsByTool, setTransferChecklistsByTool] = useState<Record<string, ChecklistItem[]>>({})
  const [transferChecklistStatus, setTransferChecklistStatus] = useState<Record<string, Record<string, 'damaged' | 'replace' | null>>>({})
  const [transferChecklistComments, setTransferChecklistComments] = useState<Record<string, Record<string, string>>>({})
  const [transferChecklistsLoading, setTransferChecklistsLoading] = useState(false)

  useEffect(() => {
    fetchGroups()
    fetchTools()
    fetchUsers()
    fetchGroupActivity()
    fetchAllGroupTools()
  }, [])

  useEffect(() => {
    setGroupsPage(1)
  }, [groupSearch])

  async function fetchGroups() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('tool_groups')
        .select('id, name, description, created_at')
        .eq('is_deleted', false)
        .order('name', { ascending: true })

      if (error) throw error
      setGroups(data || [])

      if (data && data.length > 0) {
        if (!selectedGroup || !data.find((g) => g.id === selectedGroup.id)) {
          setSelectedGroup(data[0])
          fetchGroupMembers(data[0].id)
        }
      } else {
        setSelectedGroup(null)
        setGroupMembers([])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  async function fetchAllGroupTools() {
    try {
      const { data, error } = await supabase
        .from('tool_group_members')
        .select('group_id, tools ( number, name )')

      if (error) throw error
      const map: Record<string, GroupToolInfo[]> = {}
      ;(data || []).forEach((row: any) => {
        const tool = Array.isArray(row.tools) ? row.tools[0] : row.tools
        if (tool) {
          if (!map[row.group_id]) map[row.group_id] = []
          map[row.group_id].push({ number: tool.number, name: tool.name })
        }
      })
      setAllGroupToolsMap(map)
    } catch {
      // non-critical, sidebar tool search just won't work
    }
  }

  const matchingToolsByGroup = useMemo(() => {
    const term = groupSearch.trim().toLowerCase()
    if (!term) return {} as Record<string, GroupToolInfo[]>
    const result: Record<string, GroupToolInfo[]> = {}
    groups.forEach((g) => {
      const tools = allGroupToolsMap[g.id] || []
      const matches = tools.filter(
        (t) => t.number.toLowerCase().includes(term) || t.name.toLowerCase().includes(term)
      )
      if (matches.length > 0) result[g.id] = matches
    })
    return result
  }, [groupSearch, groups, allGroupToolsMap])

  const filteredGroups = useMemo(() => {
    const term = groupSearch.trim().toLowerCase()
    if (!term) return groups
    return groups.filter(group =>
      group.name.toLowerCase().includes(term) ||
      (group.description || '').toLowerCase().includes(term) ||
      !!matchingToolsByGroup[group.id]
    )
  }, [groups, groupSearch, matchingToolsByGroup])

  const totalGroupPages = Math.max(Math.ceil(filteredGroups.length / groupsPerPage), 1)
  const pagedGroups = useMemo(() => {
    const start = (groupsPage - 1) * groupsPerPage
    return filteredGroups.slice(start, start + groupsPerPage)
  }, [filteredGroups, groupsPage])

  async function fetchGroupMembers(groupId: string) {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('tool_group_members')
        .select('tool_id, tools ( id, number, name )')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })

      if (error) throw error
      const normalized = (data || []).map((row: any) => ({
        tool_id: row.tool_id,
        tools: Array.isArray(row.tools) ? row.tools[0] ?? null : row.tools ?? null,
      }))

      const toolIds = normalized.map((row: GroupMember) => row.tool_id)
      const [toolsData, txData] = await Promise.all([
        supabase
          .from('tools')
          .select('id, number, name, description, owner:users!tools_current_owner_fkey(name)')
          .in('id', toolIds),
        supabase
          .from('tool_transactions')
          .select('tool_id, location, timestamp')
          .in('tool_id', toolIds)
          .order('timestamp', { ascending: false }),
      ])

      if (toolsData.error) throw toolsData.error
      if (txData.error) throw txData.error

      const latestLocation = new Map<string, string | null>()
      ;(txData.data || []).forEach((tx: any) => {
        if (!latestLocation.has(tx.tool_id)) {
          latestLocation.set(tx.tool_id, tx.location ?? null)
        }
      })

      const toolMap = new Map(
        (toolsData.data || []).map((tool: any) => [
          tool.id,
          {
            id: tool.id,
            number: tool.number,
            name: tool.name,
            description: tool.description ?? null,
            owner_name: tool.owner?.name ?? null,
            location: latestLocation.get(tool.id) ?? null,
          } as ToolSummary,
        ])
      )

      setGroupMembers(
        normalized.map((row: GroupMember) => ({
          tool_id: row.tool_id,
          tools: toolMap.get(row.tool_id) ?? row.tools ?? null,
        }))
      )
    } catch (err: any) {
      setError(err.message || 'Failed to load group members')
    }
  }

  async function fetchGroupActivity() {
    try {
      const { data, error } = await supabase
        .from('group_activity_log')
        .select('id, action, group_name, actor_name, created_at')
        .order('created_at', { ascending: false })
        .limit(25)

      if (error) throw error
      setGroupActivity(data || [])
    } catch (err: any) {
      setGroupActivity([])
    }
  }

  async function fetchTools() {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('id, number, name')
        .eq('is_deleted', false)
        .order('number_numeric', { ascending: true })

      if (error) throw error
      setTools(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load tools')
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .order('name')

      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load users')
    }
  }

  async function fetchChecklistsForTools(toolIds: string[]) {
    if (toolIds.length === 0) return
    try {
      setTransferChecklistsLoading(true)
      const { data, error } = await supabase
        .from('tool_checklists')
        .select('id, tool_id, item_name, required')
        .in('tool_id', toolIds)
        .order('item_name')

      if (error) throw error
      const byTool: Record<string, ChecklistItem[]> = {}
      ;(data || []).forEach((item: any) => {
        if (!byTool[item.tool_id]) byTool[item.tool_id] = []
        byTool[item.tool_id].push(item)
      })
      setTransferChecklistsByTool(byTool)
    } catch (err: any) {
      setError(err.message || 'Failed to load checklist items')
    } finally {
      setTransferChecklistsLoading(false)
    }
  }

  function resetTransferChecklists() {
    setTransferChecklistsByTool({})
    setTransferChecklistStatus({})
    setTransferChecklistComments({})
  }

  function collectChecklistReports() {
    return Object.entries(transferChecklistStatus).flatMap(([toolId, statuses]) =>
      Object.entries(statuses)
        .filter(([_, status]) => status)
        .map(([itemId, status]) => ({
          tool_id: toolId,
          checklist_item_id: itemId,
          status: status === 'damaged'
            ? 'Damaged/Needs Repair'
            : 'Needs Replacement/Resupply',
          comments: transferChecklistComments[toolId]?.[itemId]?.trim() || null,
        }))
    )
  }

  async function handleCreateGroup() {
    if (!newGroup.name.trim()) return
    try {
      setActionLoading(true)
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData?.user) {
        throw new Error('You must be logged in to create a group')
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', authData.user.id)
        .single()

      if (userError || !userData?.company_id) {
        throw new Error('Unable to determine your company')
      }

      const { error } = await supabase
        .from('tool_groups')
        .insert([{
          name: newGroup.name.trim(),
          description: newGroup.description.trim() || null,
          company_id: userData.company_id,
          created_by: authData.user.id,
        }])

      if (error) throw error
      setNewGroup({ name: '', description: '' })
      setIsCreateOpen(false)
      await fetchGroups()
    } catch (err: any) {
      setError(err.message || 'Failed to create group')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteGroup(groupId: string) {
    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('tool_groups')
        .delete()
        .eq('id', groupId)

      if (error) throw error
      setDeleteGroupId(null)
      await fetchGroups()
    } catch (err: any) {
      setError(err.message || 'Failed to delete group')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAddTools() {
    if (!selectedGroup || selectedToolIds.length === 0) return
    try {
      setActionLoading(true)
      const rows = selectedToolIds.map((toolId) => ({
        group_id: selectedGroup.id,
        tool_id: toolId,
      }))
      const { error } = await supabase
        .from('tool_group_members')
        .insert(rows)

      if (error) throw error
      setSelectedToolIds([])
      setIsAddToolsOpen(false)
      await Promise.all([fetchGroupMembers(selectedGroup.id), fetchAllGroupTools()])
    } catch (err: any) {
      setError(err.message || 'Failed to add tools to group')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemoveTool(toolId: string) {
    if (!selectedGroup) return
    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('tool_group_members')
        .delete()
        .eq('group_id', selectedGroup.id)
        .eq('tool_id', toolId)

      if (error) throw error
      await Promise.all([fetchGroupMembers(selectedGroup.id), fetchAllGroupTools()])
    } catch (err: any) {
      setError(err.message || 'Failed to remove tool from group')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleEditGroup() {
    if (!selectedGroup || !editGroupForm.name.trim()) return
    try {
      setActionLoading(true)
      setError(null)
      const { error } = await supabase
        .from('tool_groups')
        .update({
          name: editGroupForm.name.trim(),
          description: editGroupForm.description.trim() || null,
        })
        .eq('id', selectedGroup.id)

      if (error) throw error
      setIsEditGroupOpen(false)
      const updatedGroup = { ...selectedGroup, name: editGroupForm.name.trim(), description: editGroupForm.description.trim() || null }
      setSelectedGroup(updatedGroup)
      await Promise.all([fetchGroups(), fetchAllGroupTools()])
    } catch (err: any) {
      setError(err.message || 'Failed to update group')
    } finally {
      setActionLoading(false)
    }
  }

  function openEditGroup() {
    if (!selectedGroup) return
    setEditGroupForm({ name: selectedGroup.name, description: selectedGroup.description || '' })
    setIsEditGroupOpen(true)
  }

  async function handleEditMemberTool() {
    if (!editingMemberTool) return
    try {
      setEditToolLoading(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('You must be logged in'); return }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-tool`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            id: editingMemberTool.id,
            number: editingMemberTool.number,
            name: editToolForm.name.trim(),
            description: editToolForm.description.trim(),
          }),
        }
      )

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update tool')

      setEditingMemberTool(null)
      if (selectedGroup) await Promise.all([fetchGroupMembers(selectedGroup.id), fetchAllGroupTools()])
    } catch (err: any) {
      setError(err.message || 'Failed to update tool')
    } finally {
      setEditToolLoading(false)
    }
  }

  function openEditMemberTool(tool: ToolSummary) {
    setEditToolForm({ name: tool.name, description: tool.description || '' })
    setEditingMemberTool(tool)
  }

  function openTransferTool(member: GroupMember) {
    setTransferToolMember(member)
    setSingleTransferForm({ to_user_id: '', location: '', stored_at: '', notes: '' })
    resetTransferChecklists()
    fetchChecklistsForTools([member.tool_id])
    setIsTransferToolOpen(true)
  }

  async function handleTransferSingleTool() {
    if (!transferToolMember) return
    if (!singleTransferForm.to_user_id || !singleTransferForm.location.trim() || !singleTransferForm.stored_at.trim()) {
      setError('Please fill in recipient, location, and stored at')
      return
    }
    try {
      setSingleTransferLoading(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('You must be logged in'); return }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-transactions-batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            tool_ids: [transferToolMember.tool_id],
            to_user_id: singleTransferForm.to_user_id,
            location: singleTransferForm.location.trim(),
            stored_at: singleTransferForm.stored_at.trim(),
            notes: singleTransferForm.notes.trim() || `Tool transfer from group: ${selectedGroup?.name || ''}`,
            checklist_reports: collectChecklistReports(),
          }),
        }
      )

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to transfer tool')

      setIsTransferToolOpen(false)
      setTransferToolMember(null)
      resetTransferChecklists()
      if (selectedGroup) await fetchGroupMembers(selectedGroup.id)
    } catch (err: any) {
      setError(err.message || 'Failed to transfer tool')
    } finally {
      setSingleTransferLoading(false)
    }
  }

  function openTransferGroup() {
    if (!selectedGroup) return
    setTransferForm({ to_user_id: '', location: '', stored_at: '', notes: '' })
    resetTransferChecklists()
    const toolIds = groupMembers.map((m) => m.tool_id).filter(Boolean)
    fetchChecklistsForTools(toolIds)
    setIsTransferOpen(true)
  }

  async function handleTransferGroup() {
    if (!selectedGroup) return
    if (!transferForm.to_user_id || !transferForm.location.trim() || !transferForm.stored_at.trim()) {
      setError('Please fill in recipient, location, and stored at')
      return
    }

    const toolIds = groupMembers.map((member) => member.tool_id).filter(Boolean)
    if (toolIds.length === 0) {
      setError('No tools in this group to transfer')
      return
    }

    try {
      setTransferLoading(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('You must be logged in to transfer tools')
        return
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-transactions-batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            tool_ids: toolIds,
            to_user_id: transferForm.to_user_id,
            location: transferForm.location.trim(),
            stored_at: transferForm.stored_at.trim(),
            notes: transferForm.notes.trim() || `Group transfer: ${selectedGroup.name}`,
            checklist_reports: collectChecklistReports(),
          }),
        }
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to transfer tools')
      }

      setIsTransferOpen(false)
      setTransferForm({ to_user_id: '', location: '', stored_at: '', notes: '' })
      resetTransferChecklists()
      await fetchGroupMembers(selectedGroup.id)
    } catch (err: any) {
      setError(err.message || 'Failed to transfer tools')
    } finally {
      setTransferLoading(false)
    }
  }

  const membersByToolId = useMemo(() => {
    return new Set(groupMembers.map((member) => member.tool_id))
  }, [groupMembers])

  const filteredTools = useMemo(() => {
    const lower = toolSearch.trim().toLowerCase()
    return tools.filter((tool) => {
      if (membersByToolId.has(tool.id)) return false
      if (!lower) return true
      return (
        tool.number.toLowerCase().includes(lower) ||
        tool.name.toLowerCase().includes(lower)
      )
    })
  }, [tools, toolSearch, membersByToolId])

  const filteredMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase()
    if (!term) return groupMembers
    return groupMembers.filter((member) => {
      const t = member.tools
      if (!t) return false
      return (
        (t.name || '').toLowerCase().includes(term) ||
        (t.number || '').toLowerCase().includes(term) ||
        (t.owner_name || '').toLowerCase().includes(term) ||
        (t.location || '').toLowerCase().includes(term)
      )
    })
  }, [groupMembers, memberSearch])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Tool Groups</h1>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => setActiveView('groups')}
              className={`px-3 py-2 text-sm font-medium ${activeView === 'groups' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Groups
            </button>
            <button
              onClick={() => setActiveView('activity')}
              className={`px-3 py-2 text-sm font-medium border-l border-gray-200 ${activeView === 'activity' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Activity
            </button>
          </div>
          {activeView === 'groups' && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Create New Group
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : activeView === 'activity' ? (
        <div className="bg-white border rounded-lg">
          <div className="border-b px-4 py-3 text-sm font-medium text-gray-700">
            Recent Group Activity
          </div>
          {groupActivity.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500">
              No activity yet.
            </div>
          ) : (
            <div className="divide-y">
              {groupActivity.map((entry) => (
                <div key={entry.id} className="px-4 py-3 text-sm text-gray-600">
                  <span className="font-medium text-gray-900">
                    {entry.action === 'created' ? 'Created' : 'Deleted'}
                  </span>{' '}
                  {entry.group_name ? `"${entry.group_name}"` : 'group'} by{' '}
                  <span className="font-medium text-gray-900">
                    {entry.actor_name || 'Unknown'}
                  </span>{' '}
                  <span className="text-gray-400">
                    ({new Date(entry.created_at).toLocaleString()})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold text-gray-800">Groups</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="Search groups or tools..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {pagedGroups.length === 0 ? (
              <div className="text-sm text-gray-500">
                {groupSearch.trim() ? 'No groups or tools match your search.' : 'No groups yet.'}
              </div>
            ) : (
              <div className="space-y-2">
                {pagedGroups.map((group) => {
                  const toolMatches = matchingToolsByGroup[group.id]
                  return (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedGroup(group)
                        setMemberSearch('')
                        fetchGroupMembers(group.id)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md border transition relative ${
                        selectedGroup?.id === group.id
                          ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-200'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {selectedGroup?.id === group.id && (
                        <span className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-blue-600" />
                      )}
                      <div className="font-medium text-gray-900">{group.name}</div>
                      {group.description && (
                        <div className="text-sm text-gray-500 line-clamp-2">
                          {group.description}
                        </div>
                      )}
                      {toolMatches && toolMatches.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                          {toolMatches.map((t, idx) => (
                            <div key={`${t.number}-${idx}`} className="text-xs text-gray-600 flex items-center gap-1.5">
                              <svg className="h-3 w-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span>#{t.number} - {t.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            {totalGroupPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                <button
                  onClick={() => setGroupsPage(prev => Math.max(prev - 1, 1))}
                  disabled={groupsPage === 1}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span>Page {groupsPage} of {totalGroupPages}</span>
                <button
                  onClick={() => setGroupsPage(prev => Math.min(prev + 1, totalGroupPages))}
                  disabled={groupsPage === totalGroupPages}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {selectedGroup ? (
              <>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{selectedGroup.name}</h2>
                    {selectedGroup.description && (
                      <p className="text-sm text-gray-500">{selectedGroup.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                      <button
                        onClick={openEditGroup}
                        className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit Group
                      </button>
                      <button
                        onClick={() => setIsAddToolsOpen(true)}
                        className="px-3 py-2 text-sm font-medium text-gray-700 border-l border-gray-200 hover:bg-gray-50"
                      >
                        Add Tools
                      </button>
                      <button
                        onClick={openTransferGroup}
                        className="px-3 py-2 text-sm font-medium text-gray-700 border-l border-gray-200 hover:bg-gray-50"
                      >
                        Transfer Group
                      </button>
                      <button
                        onClick={() => setDeleteGroupId(selectedGroup.id)}
                        className="px-3 py-2 text-sm font-medium text-red-600 border-l border-gray-200 hover:bg-red-50"
                      >
                        Delete Group
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg">
                  <div className="border-b px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-gray-700">
                      {memberSearch.trim()
                        ? `Showing ${filteredMembers.length} of ${groupMembers.length} tools`
                        : `Tools in Group (${groupMembers.length})`}
                    </span>
                    {groupMembers.length > 0 && (
                      <div className="relative">
                        <input
                          type="text"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder="Search within group..."
                          className="border rounded-lg pl-8 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                        />
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {memberSearch && (
                          <button
                            onClick={() => setMemberSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {filteredMembers.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500">
                      {groupMembers.length === 0
                        ? 'No tools in this group yet.'
                        : 'No tools match your search.'}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredMembers.map((member) => (
                        <div key={member.tool_id} className="px-4 py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {member.tools?.id ? (
                              <ToolImageGallery toolId={member.tools.id} />
                            ) : (
                              <span className="text-gray-400 text-sm">No image</span>
                            )}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                              <span className="font-medium text-gray-900">
                                {member.tools?.name || 'Unknown tool'}
                              </span>
                              <span className="text-gray-500">
                                #{member.tools?.number || 'N/A'}
                              </span>
                              <span className="text-gray-500">
                                Owner: {member.tools?.owner_name || 'Unassigned'}
                              </span>
                              <span className="text-gray-500">
                                Location: {member.tools?.location || 'Unknown'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {member.tools && (
                              <button
                                onClick={() => openEditMemberTool(member.tools!)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                                disabled={actionLoading}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => openTransferTool(member)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                              disabled={actionLoading}
                            >
                              Transfer
                            </button>
                            <button
                              onClick={() => handleRemoveTool(member.tool_id)}
                              className="text-sm text-red-600 hover:text-red-800"
                              disabled={actionLoading}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white border rounded-lg p-6 text-gray-500">
                Select a group to manage its tools.
              </div>
            )}
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setIsCreateOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold">Create Tool Group</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Pressure Washing Kit #1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={actionLoading || !newGroup.name.trim()}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddToolsOpen && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl relative max-h-[90vh] flex flex-col">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setIsAddToolsOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold">Add Tools to {selectedGroup.name}</h3>
              <div className="mt-3">
                <input
                  type="text"
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search tools..."
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {filteredTools.length === 0 ? (
                <div className="text-sm text-gray-500">No tools available to add.</div>
              ) : (
                <div className="space-y-2">
                  {filteredTools.map((tool) => {
                    const checked = selectedToolIds.includes(tool.id)
                    return (
                      <label
                        key={tool.id}
                        className="flex items-center gap-3 border rounded-md px-3 py-2 cursor-pointer hover:border-blue-300"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedToolIds((prev) =>
                              e.target.checked
                                ? [...prev, tool.id]
                                : prev.filter((id) => id !== tool.id)
                            )
                          }}
                          className="h-4 w-4"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{tool.name}</div>
                          <div className="text-sm text-gray-500">#{tool.number}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsAddToolsOpen(false)}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTools}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={actionLoading || selectedToolIds.length === 0}
              >
                Add Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteGroupId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setDeleteGroupId(null)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold text-red-600">Delete Group</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                This will remove the group from the list. Tools will remain unchanged.
              </p>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setDeleteGroupId(null)}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteGroup(deleteGroupId)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                disabled={actionLoading}
              >
                Delete Group
              </button>
            </div>
          </div>
        </div>
      )}

      {isTransferOpen && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg relative max-h-[90vh] flex flex-col">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl z-10"
              onClick={() => { setIsTransferOpen(false); resetTransferChecklists() }}
              aria-label="Close"
            >
              ×
            </button>
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold">Transfer Group</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedGroup.name}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
                <select
                  value={transferForm.to_user_id}
                  onChange={(e) => setTransferForm((prev) => ({ ...prev, to_user_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select recipient</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={transferForm.location}
                  onChange={(e) => setTransferForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stored At</label>
                <select
                  value={transferForm.stored_at}
                  onChange={(e) => setTransferForm((prev) => ({ ...prev, stored_at: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select storage location</option>
                  <option value="on job site">On Job Site</option>
                  <option value="on truck">On Truck</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {transferChecklistsLoading ? (
                <div className="text-sm text-gray-500">Loading checklists...</div>
              ) : groupMembers.some((m) => (transferChecklistsByTool[m.tool_id] || []).length > 0) && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700">Tool Checklist</div>
                  {groupMembers.map((member) => {
                    const items = transferChecklistsByTool[member.tool_id] || []
                    if (items.length === 0) return null
                    return (
                      <div key={member.tool_id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                        <div className="text-sm font-semibold text-gray-900">
                          #{member.tools?.number || 'N/A'} - {member.tools?.name || 'Unknown'}
                        </div>
                        {items.map((item) => {
                          const status = transferChecklistStatus[member.tool_id]?.[item.id] || null
                          return (
                            <div key={item.id} className="rounded-md border border-gray-200 bg-white p-2.5 space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-sm text-gray-800">{item.item_name}</span>
                                {item.required && (
                                  <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Required</span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={status === 'damaged'}
                                    onChange={() => setTransferChecklistStatus((prev) => ({
                                      ...prev,
                                      [member.tool_id]: {
                                        ...prev[member.tool_id],
                                        [item.id]: status === 'damaged' ? null : 'damaged',
                                      },
                                    }))}
                                    className="h-4 w-4"
                                  />
                                  Damaged
                                </label>
                                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={status === 'replace'}
                                    onChange={() => setTransferChecklistStatus((prev) => ({
                                      ...prev,
                                      [member.tool_id]: {
                                        ...prev[member.tool_id],
                                        [item.id]: status === 'replace' ? null : 'replace',
                                      },
                                    }))}
                                    className="h-4 w-4"
                                  />
                                  Replace
                                </label>
                              </div>
                              {(status === 'damaged' || status === 'replace') && (
                                <textarea
                                  value={transferChecklistComments[member.tool_id]?.[item.id] || ''}
                                  onChange={(e) => setTransferChecklistComments((prev) => ({
                                    ...prev,
                                    [member.tool_id]: {
                                      ...prev[member.tool_id],
                                      [item.id]: e.target.value,
                                    },
                                  }))}
                                  placeholder="Add comments about the issue..."
                                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  rows={2}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsTransferOpen(false)}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferGroup}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={transferLoading}
              >
                {transferLoading ? 'Transferring...' : 'Transfer Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditGroupOpen && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setIsEditGroupOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold">Edit Group</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  value={editGroupForm.name}
                  onChange={(e) => setEditGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={editGroupForm.description}
                  onChange={(e) => setEditGroupForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsEditGroupOpen(false)}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditGroup}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={actionLoading || !editGroupForm.name.trim()}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {editingMemberTool && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setEditingMemberTool(null)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold">Edit Tool</h3>
              <p className="text-sm text-gray-500 mt-1">#{editingMemberTool.number}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tool Name</label>
                <input
                  type="text"
                  value={editToolForm.name}
                  onChange={(e) => setEditToolForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editToolForm.description}
                  onChange={(e) => setEditToolForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setEditingMemberTool(null)}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditMemberTool}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={editToolLoading || !editToolForm.name.trim()}
              >
                {editToolLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isTransferToolOpen && transferToolMember && (() => {
        const toolId = transferToolMember.tool_id
        const items = transferChecklistsByTool[toolId] || []
        return (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg relative max-h-[90vh] flex flex-col">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl z-10"
                onClick={() => { setIsTransferToolOpen(false); setTransferToolMember(null); resetTransferChecklists() }}
                aria-label="Close"
              >
                ×
              </button>
              <div className="p-6 border-b">
                <h3 className="text-xl font-semibold">Transfer Tool</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {transferToolMember.tools?.name || 'Unknown'} #{transferToolMember.tools?.number || 'N/A'}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
                  <select
                    value={singleTransferForm.to_user_id}
                    onChange={(e) => setSingleTransferForm((prev) => ({ ...prev, to_user_id: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select recipient</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={singleTransferForm.location}
                    onChange={(e) => setSingleTransferForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stored At</label>
                  <select
                    value={singleTransferForm.stored_at}
                    onChange={(e) => setSingleTransferForm((prev) => ({ ...prev, stored_at: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select storage location</option>
                    <option value="on job site">On Job Site</option>
                    <option value="on truck">On Truck</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={singleTransferForm.notes}
                    onChange={(e) => setSingleTransferForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                {transferChecklistsLoading ? (
                  <div className="text-sm text-gray-500">Loading checklist...</div>
                ) : items.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Tool Checklist</div>
                    {items.map((item) => {
                      const status = transferChecklistStatus[toolId]?.[item.id] || null
                      return (
                        <div key={item.id} className="rounded-md border border-gray-200 bg-gray-50 p-2.5 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-sm text-gray-800">{item.item_name}</span>
                            {item.required && (
                              <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Required</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={status === 'damaged'}
                                onChange={() => setTransferChecklistStatus((prev) => ({
                                  ...prev,
                                  [toolId]: {
                                    ...prev[toolId],
                                    [item.id]: status === 'damaged' ? null : 'damaged',
                                  },
                                }))}
                                className="h-4 w-4"
                              />
                              Damaged
                            </label>
                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={status === 'replace'}
                                onChange={() => setTransferChecklistStatus((prev) => ({
                                  ...prev,
                                  [toolId]: {
                                    ...prev[toolId],
                                    [item.id]: status === 'replace' ? null : 'replace',
                                  },
                                }))}
                                className="h-4 w-4"
                              />
                              Replace
                            </label>
                          </div>
                          {(status === 'damaged' || status === 'replace') && (
                            <textarea
                              value={transferChecklistComments[toolId]?.[item.id] || ''}
                              onChange={(e) => setTransferChecklistComments((prev) => ({
                                ...prev,
                                [toolId]: {
                                  ...prev[toolId],
                                  [item.id]: e.target.value,
                                },
                              }))}
                              placeholder="Add comments about the issue..."
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={2}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => { setIsTransferToolOpen(false); setTransferToolMember(null); resetTransferChecklists() }}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferSingleTool}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={singleTransferLoading}
                >
                  {singleTransferLoading ? 'Transferring...' : 'Transfer Tool'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
