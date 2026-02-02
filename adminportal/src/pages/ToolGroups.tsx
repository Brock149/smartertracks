import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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

type GroupMember = {
  tool_id: string
  tools: ToolSummary | null
}

export default function ToolGroups() {
  const [groups, setGroups] = useState<ToolGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<ToolGroup | null>(null)
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [tools, setTools] = useState<ToolSummary[]>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  useEffect(() => {
    fetchGroups()
    fetchTools()
    fetchUsers()
  }, [])

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
        .update({ is_deleted: true })
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
          }),
        }
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to transfer tools')
      }

      setIsTransferOpen(false)
      setTransferForm({ to_user_id: '', location: '', stored_at: '', notes: '' })
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
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Create Group
        </button>
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold text-gray-800">Groups</h2>
            {groups.length === 0 ? (
              <div className="text-sm text-gray-500">No groups yet.</div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedGroup(group)
                      fetchGroupMembers(group.id)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md border transition ${
                      selectedGroup?.id === group.id
                        ? 'bg-white border-blue-400 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-blue-300'
                    }`}
                  >
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
          </div>

          <div className="space-y-4">
            {selectedGroup ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{selectedGroup.name}</h2>
                    {selectedGroup.description && (
                      <p className="text-sm text-gray-500">{selectedGroup.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsAddToolsOpen(true)}
                      className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Add Tools
                    </button>
                    <button
                      onClick={() => setIsTransferOpen(true)}
                      className="px-3 py-2 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      Transfer Group
                    </button>
                    <button
                      onClick={() => setDeleteGroupId(selectedGroup.id)}
                      className="px-3 py-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Delete Group
                    </button>
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
                        <div key={member.tool_id} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              {member.tools?.name || 'Unknown tool'}
                            </div>
                            <div className="text-sm text-gray-500">
                              #{member.tools?.number || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              Owner: {member.tools?.owner_name || 'Unassigned'}
                            </div>
                            <div className="text-sm text-gray-500">
                              Location: {member.tools?.location || 'Unknown'}
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
                <input
                  type="text"
                  value={transferForm.stored_at}
                  onChange={(e) => setTransferForm((prev) => ({ ...prev, stored_at: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
