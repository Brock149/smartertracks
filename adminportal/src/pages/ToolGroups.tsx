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
  const [groupsPage, setGroupsPage] = useState(1)
  const groupsPerPage = 15
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isAddToolsOpen, setIsAddToolsOpen] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: '', description: '' })
  const [toolSearch, setToolSearch] = useState('')
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
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
  const [reportIssue, setReportIssue] = useState(false)
  const [reportChecklistItemsByTool, setReportChecklistItemsByTool] = useState<Record<string, ChecklistItem[]>>({})
  const [reportRows, setReportRows] = useState<Array<{
    id: string
    tool_id: string
    checklist_item_id: string
    status: 'damaged' | 'replace' | ''
    comments: string
  }>>([])

  useEffect(() => {
    fetchGroups()
    fetchTools()
    fetchUsers()
    fetchGroupActivity()
  }, [])

  useEffect(() => {
    if (!reportIssue) {
      setReportChecklistItemsByTool({})
      setReportRows([])
    }
  }, [reportIssue])

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

  const filteredGroups = useMemo(() => {
    const term = groupSearch.trim().toLowerCase()
    if (!term) return groups
    return groups.filter(group =>
      group.name.toLowerCase().includes(term) ||
      (group.description || '').toLowerCase().includes(term)
    )
  }, [groups, groupSearch])

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
          .select('id, number, name, owner:users!tools_current_owner_fkey(name)')
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
        .order('number', { ascending: true })

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

  async function fetchChecklistForTool(toolId: string) {
    try {
      const { data, error } = await supabase
        .from('tool_checklists')
        .select('id, tool_id, item_name, required')
        .eq('tool_id', toolId)
        .order('item_name')

      if (error) throw error
      setReportChecklistItemsByTool(prev => ({
        ...prev,
        [toolId]: data || [],
      }))
    } catch (err: any) {
      setError(err.message || 'Failed to load checklist items')
    }
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
      await fetchGroupMembers(selectedGroup.id)
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
      await fetchGroupMembers(selectedGroup.id)
    } catch (err: any) {
      setError(err.message || 'Failed to remove tool from group')
    } finally {
      setActionLoading(false)
    }
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

    if (reportIssue) {
      if (reportRows.length === 0) {
        setError('Please add at least one report')
        return
      }
      const invalid = reportRows.some((row) => !row.tool_id || !row.checklist_item_id || !row.status)
      if (invalid) {
        setError('Please complete all report rows')
        return
      }
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
            checklist_reports: reportIssue
              ? reportRows.map((row) => ({
                  tool_id: row.tool_id,
                  checklist_item_id: row.checklist_item_id,
                  status: row.status === 'damaged'
                    ? 'Damaged/Needs Repair'
                    : 'Needs Replacement/Resupply',
                  comments: row.comments.trim() || null,
                }))
              : [],
          }),
        }
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to transfer tools')
      }

      setIsTransferOpen(false)
      setTransferForm({ to_user_id: '', location: '', stored_at: '', notes: '' })
      setReportIssue(false)
      setReportChecklistItemsByTool({})
      setReportRows([])
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
                placeholder="Search groups..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {pagedGroups.length === 0 ? (
              <div className="text-sm text-gray-500">No groups yet.</div>
            ) : (
              <div className="space-y-2">
                {pagedGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedGroup(group)
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
                  </button>
                ))}
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
                        onClick={() => setIsAddToolsOpen(true)}
                        className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Add Tools to Selected Group
                      </button>
                      <button
                        onClick={() => setIsTransferOpen(true)}
                        className="px-3 py-2 text-sm font-medium text-gray-700 border-l border-gray-200 hover:bg-gray-50"
                      >
                        Transfer Group
                      </button>
                      <button
                        onClick={() => setDeleteGroupId(selectedGroup.id)}
                        className="px-3 py-2 text-sm font-medium text-red-600 border-l border-gray-200 hover:bg-red-50"
                      >
                        Delete Selected Group
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg">
                  <div className="border-b px-4 py-3 text-sm font-medium text-gray-700">
                    Tools in Group ({groupMembers.length})
                  </div>
                  {groupMembers.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500">
                      No tools in this group yet.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {groupMembers.map((member) => (
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
                          <button
                            onClick={() => handleRemoveTool(member.tool_id)}
                            className="text-sm text-red-600 hover:text-red-800"
                            disabled={actionLoading}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setIsTransferOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold">Transfer Group</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedGroup.name}</p>
            </div>
            <div className="p-6 space-y-4">
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

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={reportIssue}
                    onChange={(e) => {
                      const next = e.target.checked
                      setReportIssue(next)
                      if (!next) {
                        setReportChecklistItemsByTool({})
                        setReportRows([])
                      }
                    }}
                  />
                  Report an issue for one tool
                </label>

                {reportIssue && (
                  <div className="space-y-3">
                    {reportRows.length === 0 && (
                      <div className="text-sm text-gray-500">Add a report to get started.</div>
                    )}
                    {reportRows.map((row, idx) => {
                      const items = reportChecklistItemsByTool[row.tool_id] || []
                      return (
                        <div key={row.id} className="rounded-md border border-gray-200 bg-white p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-700">Report {idx + 1}</div>
                            <button
                              type="button"
                              onClick={() => setReportRows(prev => prev.filter(r => r.id !== row.id))}
                              className="text-sm text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tool</label>
                            <select
                              value={row.tool_id}
                              onChange={async (e) => {
                                const toolId = e.target.value
                                setReportRows(prev => prev.map(r => r.id === row.id ? {
                                  ...r,
                                  tool_id: toolId,
                                  checklist_item_id: '',
                                } : r))
                                if (toolId && !reportChecklistItemsByTool[toolId]) {
                                  await fetchChecklistForTool(toolId)
                                }
                              }}
                              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select tool</option>
                              {groupMembers.map((member) => (
                                <option key={member.tool_id} value={member.tool_id}>
                                  {member.tools?.name || 'Unknown'} #{member.tools?.number || 'N/A'}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Checklist Item</label>
                            <select
                              value={row.checklist_item_id}
                              onChange={(e) => setReportRows(prev => prev.map(r => r.id === row.id ? {
                                ...r,
                                checklist_item_id: e.target.value,
                              } : r))}
                              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={!row.tool_id}
                            >
                              <option value="">Select item</option>
                              {items.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.item_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                              value={row.status}
                              onChange={(e) => setReportRows(prev => prev.map(r => r.id === row.id ? {
                                ...r,
                                status: e.target.value as 'damaged' | 'replace' | '',
                              } : r))}
                              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select status</option>
                              <option value="damaged">Damaged / Needs Repair</option>
                              <option value="replace">Needs Replacement / Resupply</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                            <textarea
                              value={row.comments}
                              onChange={(e) => setReportRows(prev => prev.map(r => r.id === row.id ? {
                                ...r,
                                comments: e.target.value,
                              } : r))}
                              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={2}
                            />
                          </div>
                        </div>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => setReportRows(prev => ([
                        ...prev,
                        {
                          id: `${Date.now()}-${Math.random()}`,
                          tool_id: '',
                          checklist_item_id: '',
                          status: '',
                          comments: '',
                        },
                      ]))}
                      className="text-sm text-blue-700 hover:text-blue-900"
                    >
                      + Report another tool
                    </button>
                  </div>
                )}
              </div>
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
    </div>
  )
}
