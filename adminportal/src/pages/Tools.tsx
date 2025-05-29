import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface Tool {
  id: string
  number: string
  name: string
  description?: string
  photo_url?: string
  created_at: string
}

interface ChecklistItem {
  id: string
  tool_id: string
  item_name: string
  required: boolean
}

export default function Tools() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false)
  const [loadingChecklist, setLoadingChecklist] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newTool, setNewTool] = useState({
    number: '',
    name: '',
    description: '',
    photo_url: '',
    checklist: [] as Array<ChecklistItem | { item_name: string; required: boolean }>
  })
  const [newChecklistItem, setNewChecklistItem] = useState({
    item_name: '',
    required: true
  })
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [editingTool, setEditingTool] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [toolToDelete, setToolToDelete] = useState<Tool | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteTool, setDeleteTool] = useState<Tool | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null)
  const [editingChecklistItem, setEditingChecklistItem] = useState<{ item_name: string; required: boolean }>({ item_name: '', required: true })
  const [editChecklistLoading, setEditChecklistLoading] = useState(false)
  const [editChecklistError, setEditChecklistError] = useState<string | null>(null)
  const [deleteChecklistLoading, setDeleteChecklistLoading] = useState(false)
  const [deleteChecklistError, setDeleteChecklistError] = useState<string | null>(null)
  const [checklistItemToDelete, setChecklistItemToDelete] = useState<ChecklistItem | null>(null)
  const [showDeleteChecklistModal, setShowDeleteChecklistModal] = useState(false)

  useEffect(() => {
    console.log('Tools component mounted')
    fetchTools()
  }, [])

  async function fetchTools() {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching tools...')
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .order('number', { ascending: true })

      console.log('Supabase response:', { data, error })

      if (error) throw error
      setTools(data || [])
      console.log('Tools state updated:', data)
    } catch (error: any) {
      console.error('Error fetching tools:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

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
      setError(error.message)
    } finally {
      setLoadingChecklist(false)
    }
  }

  async function handleViewChecklist(tool: Tool) {
    setSelectedTool(tool)
    setIsChecklistModalOpen(true)
    await fetchChecklist(tool.id)
  }

  async function handleCreateTool() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-tool`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify(newTool)
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tool')
      }

      // Reset form and close modal
      setNewTool({
        number: '',
        name: '',
        description: '',
        photo_url: '',
        checklist: []
      })
      setIsCreateModalOpen(false)
      fetchTools() // Refresh the tools list
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred')
    }
  }

  function addChecklistItem() {
    if (newChecklistItem.item_name.trim()) {
      setNewTool(prev => ({
        ...prev,
        checklist: [...prev.checklist, { ...newChecklistItem }]
      }))
      setNewChecklistItem({ item_name: '', required: true })
    }
  }

  function removeChecklistItem(index: number) {
    setNewTool(prev => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index)
    }))
  }

  async function handleAddChecklistItem() {
    if (!selectedTool || !newChecklistItem.item_name.trim()) return

    try {
      setIsAddingItem(true)
      const session = await supabase.auth.getSession()
      console.log('Current session:', session)
      console.log('Access token:', session.data.session?.access_token)
      console.log('User ID:', session.data.session?.user.id)

      if (!session.data.session?.access_token) {
        throw new Error('No access token found. Please log in again.')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-checklist-item`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session.access_token}`
          },
          body: JSON.stringify({
            tool_id: selectedTool.id,
            item_name: newChecklistItem.item_name,
            required: newChecklistItem.required
          })
        }
      )

      const data = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add checklist item')
      }

      // Reset form and refresh checklist
      setNewChecklistItem({ item_name: '', required: true })
      await fetchChecklist(selectedTool.id)
    } catch (error: any) {
      console.error('Error adding checklist item:', error)
      setError(error.message)
    } finally {
      setIsAddingItem(false)
    }
  }

  const handleEditTool = (tool: any) => {
    setEditingTool(tool)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTool) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-tool`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify(editingTool)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to update tool');
        return;
      }

      setIsEditModalOpen(false);
      setEditingTool(null);
      fetchTools(); // Refresh the tools list
    } catch (error: any) {
      alert(error.message || 'An unexpected error occurred');
    }
  };

  const openDeleteModal = (tool: Tool) => {
    setToolToDelete(tool)
    setDeleteError(null)
    setDeleteModalOpen(true)
  }

  const handleDeleteClose = () => {
    setDeleteModalOpen(false)
    setToolToDelete(null)
    setDeleteError(null)
  }

  const handleDeleteTool = async () => {
    if (!toolToDelete) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        setDeleteError('You must be logged in to delete tools')
        setDeleteLoading(false)
        return
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-tool`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session.access_token}`
          },
          body: JSON.stringify({ id: toolToDelete.id })
        }
      )
      const data = await response.json()
      if (!response.ok || data.error) {
        setDeleteError(data.error || 'Failed to delete tool')
        setDeleteLoading(false)
        return
      }
      setDeleteLoading(false)
      handleDeleteClose()
      fetchTools()
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete tool')
      setDeleteLoading(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  function handleDeleteToolOpen(tool: Tool) {
    setDeleteTool(tool)
  }

  function handleDeleteToolClose() {
    setDeleteTool(null)
    setDeleteError(null)
    setDeleteSuccess(null)
  }

  async function handleDeleteToolSubmit() {
    setDeleteLoading(true)
    setDeleteError(null)
    setDeleteSuccess(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setDeleteError('You must be logged in to delete tools')
        setDeleteLoading(false)
        return
      }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id: deleteTool?.id }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setDeleteError(result.error || 'Failed to delete tool')
        setDeleteLoading(false)
        return
      }
      setDeleteSuccess('Tool deleted successfully!')
      setDeleteLoading(false)
      handleDeleteToolClose()
      fetchTools()
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete tool')
      setDeleteLoading(false)
    }
  }

  function handleEditChecklistOpen(item: ChecklistItem) {
    setEditingChecklistItemId(item.id)
    setEditingChecklistItem({ item_name: item.item_name, required: item.required })
    setEditChecklistError(null)
  }

  function handleEditChecklistCancel() {
    setEditingChecklistItemId(null)
    setEditingChecklistItem({ item_name: '', required: true })
    setEditChecklistError(null)
  }

  async function handleEditChecklistSave(item: ChecklistItem) {
    setEditChecklistLoading(true)
    setEditChecklistError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setEditChecklistError('You must be logged in to edit checklist items')
        setEditChecklistLoading(false)
        return
      }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-checklist-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: item.id,
          item_name: editingChecklistItem.item_name,
          required: editingChecklistItem.required
        })
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setEditChecklistError(result.error || 'Failed to update checklist item')
        setEditChecklistLoading(false)
        return
      }
      setEditingChecklistItemId(null)
      setEditingChecklistItem({ item_name: '', required: true })
      await fetchChecklist(item.tool_id)
    } catch (err: any) {
      setEditChecklistError(err.message || 'Failed to update checklist item')
    } finally {
      setEditChecklistLoading(false)
    }
  }

  async function handleDeleteChecklistItem(item: ChecklistItem) {
    setDeleteChecklistLoading(true)
    setDeleteChecklistError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setDeleteChecklistError('You must be logged in to delete checklist items')
        setDeleteChecklistLoading(false)
        return
      }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-checklist-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id: item.id })
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setDeleteChecklistError(result.error || 'Failed to delete checklist item')
        setDeleteChecklistLoading(false)
        return
      }
      await fetchChecklist(item.tool_id)
    } catch (err: any) {
      setDeleteChecklistError(err.message || 'Failed to delete checklist item')
    } finally {
      setDeleteChecklistLoading(false)
    }
  }

  function handleDeleteChecklistConfirm(item: ChecklistItem) {
    setChecklistItemToDelete(item)
    setShowDeleteChecklistModal(true)
  }

  function handleDeleteChecklistCancelModal() {
    setChecklistItemToDelete(null)
    setShowDeleteChecklistModal(false)
  }

  async function handleDeleteChecklistConfirmModal() {
    if (checklistItemToDelete) {
      await handleDeleteChecklistItem(checklistItemToDelete)
      setChecklistItemToDelete(null)
      setShowDeleteChecklistModal(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">All Tools</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create New Tool
        </button>
      </div>

      {/* Create Tool Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <h3 className="text-xl font-bold mb-4">Create New Tool</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tool Number</label>
                <input
                  type="text"
                  value={newTool.number}
                  onChange={e => setNewTool(prev => ({ ...prev, number: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., 127"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tool Name</label>
                <input
                  type="text"
                  value={newTool.name}
                  onChange={e => setNewTool(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Pump Kit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newTool.description}
                  onChange={e => setNewTool(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Photo URL</label>
                <input
                  type="text"
                  value={newTool.photo_url}
                  onChange={e => setNewTool(prev => ({ ...prev, photo_url: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Optional image URL"
                />
              </div>

              {/* Checklist Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tool Checklist</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newChecklistItem.item_name}
                    onChange={e => setNewChecklistItem(prev => ({ ...prev, item_name: e.target.value }))}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Add checklist item"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newChecklistItem.required}
                      onChange={e => setNewChecklistItem(prev => ({ ...prev, required: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    Required
                  </label>
                  <button
                    onClick={addChecklistItem}
                    className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                  >
                    Add
                  </button>
                </div>

                {/* Checklist Items List */}
                <div className="space-y-2">
                  {newTool.checklist.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <span>{item.item_name}</span>
                        {item.required && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Required</span>
                        )}
                      </div>
                      <button
                        onClick={() => removeChecklistItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTool}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Create Tool
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tool Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tools.map((tool) => (
              <tr key={tool.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{tool.number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tool.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {tool.description || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(tool.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2 items-center">
                    <button
                      onClick={() => handleEditTool(tool)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900" onClick={() => handleDeleteToolOpen(tool)}>Delete</button>
                    <button
                      className="text-blue-500 hover:text-blue-700 ml-12 px-8 font-semibold"
                      onClick={() => handleViewChecklist(tool)}
                    >
                      View Checklist
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Checklist Modal */}
      {isChecklistModalOpen && selectedTool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                Checklist for {selectedTool.name} (#{selectedTool.number})
              </h3>
              <button
                onClick={() => {
                  setIsChecklistModalOpen(false)
                  setSelectedTool(null)
                  setChecklistItems([])
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Add Item Form */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Checklist Item</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem.item_name}
                  onChange={(e) => setNewChecklistItem(prev => ({ ...prev, item_name: e.target.value }))}
                  placeholder="Enter item name"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <label className="flex items-center gap-2 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={newChecklistItem.required}
                    onChange={(e) => setNewChecklistItem(prev => ({ ...prev, required: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  Required
                </label>
                <button
                  onClick={handleAddChecklistItem}
                  disabled={isAddingItem || !newChecklistItem.item_name.trim()}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingItem ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </div>

            {loadingChecklist ? (
              <div className="text-center py-4">Loading checklist...</div>
            ) : checklistItems.length > 0 ? (
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded"
                  >
                    {editingChecklistItemId === item.id ? (
                      <div className="flex-1 flex gap-2 items-center">
                        <input
                          type="text"
                          value={editingChecklistItem.item_name}
                          onChange={e => setEditingChecklistItem({ ...editingChecklistItem, item_name: e.target.value })}
                          className="w-48 border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={editingChecklistItem.required}
                            onChange={e => setEditingChecklistItem({ ...editingChecklistItem, required: e.target.checked })}
                            className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                          />
                          Required
                        </label>
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-900 px-2"
                          onClick={() => handleEditChecklistSave(item)}
                          disabled={editChecklistLoading}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="text-gray-500 hover:text-gray-700 px-2"
                          onClick={handleEditChecklistCancel}
                          disabled={editChecklistLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex gap-2 items-center">
                        <span>{item.item_name}</span>
                        {item.required && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Required</span>
                        )}
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-900 px-2"
                          onClick={() => handleDeleteChecklistConfirm(item)}
                          disabled={deleteChecklistLoading}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No checklist items found for this tool.
              </div>
            )}
            {editChecklistError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded mb-2 mt-2">{editChecklistError}</div>
            )}
            {deleteChecklistError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded mb-2 mt-2">{deleteChecklistError}</div>
            )}
          </div>
        </div>
      )}

      {/* Edit Tool Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setIsEditModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-xl font-semibold mb-6">Edit Tool</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Tool Number</label>
                <input
                  type="text"
                  value={editingTool?.number || ''}
                  onChange={e => setEditingTool({ ...editingTool, number: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Tool Name</label>
                <input
                  type="text"
                  value={editingTool?.name || ''}
                  onChange={e => setEditingTool({ ...editingTool, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={editingTool?.description || ''}
                  onChange={e => setEditingTool({ ...editingTool, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Photo URL</label>
                <input
                  type="text"
                  value={editingTool?.photo_url || ''}
                  onChange={e => setEditingTool({ ...editingTool, photo_url: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTool && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={handleDeleteToolClose}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-xl font-semibold mb-6">Delete Tool</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Tool Information</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Number:</span>
                    <p className="text-gray-900">{deleteTool.number}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Name:</span>
                    <p className="text-gray-900">{deleteTool.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Description:</span>
                    <p className="text-gray-900">{deleteTool.description || '-'}</p>
                  </div>
                </div>
              </div>
              <p className="text-red-600 font-medium">
                Warning: This action cannot be undone. Are you sure you want to delete this tool?
              </p>
              {deleteError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg">
                  {deleteError}
                </div>
              )}
              {deleteSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-2 rounded-lg">
                  {deleteSuccess}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                  onClick={handleDeleteToolClose}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  onClick={handleDeleteToolSubmit}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteChecklistModal && checklistItemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={handleDeleteChecklistCancelModal}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-xl font-semibold mb-6 text-red-600">Delete Checklist Item</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Checklist Item Information</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Item Name:</span>
                    <p className="text-gray-900">{checklistItemToDelete.item_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Required:</span>
                    <p className="text-gray-900">{checklistItemToDelete.required ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
              <p className="text-red-600 font-medium">
                Warning: This action cannot be undone. Are you sure you want to delete this checklist item?
              </p>
              {deleteChecklistError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded mb-2 mt-2">{deleteChecklistError}</div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                  onClick={handleDeleteChecklistCancelModal}
                  disabled={deleteChecklistLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  onClick={handleDeleteChecklistConfirmModal}
                  disabled={deleteChecklistLoading}
                >
                  {deleteChecklistLoading ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 