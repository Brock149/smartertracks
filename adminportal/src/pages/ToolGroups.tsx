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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isAddToolsOpen, setIsAddToolsOpen] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: '', description: '' })
  const [toolSearch, setToolSearch] = useState('')
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchGroups()
    fetchTools()
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
      setGroupMembers(data || [])
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

  async function handleCreateGroup() {
    if (!newGroup.name.trim()) return
    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('tool_groups')
        .insert([{
          name: newGroup.name.trim(),
          description: newGroup.description.trim() || null,
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
    </div>
  )
}
