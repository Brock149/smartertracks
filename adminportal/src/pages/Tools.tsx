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
    checklist: [] as ChecklistItem[]
  })
  const [newChecklistItem, setNewChecklistItem] = useState({
    item_name: '',
    required: true
  })
  const [isAddingItem, setIsAddingItem] = useState(false)

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

  if (loading) return <div className="p-6">Loading tools...</div>
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>

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
                  <button
                    onClick={() => handleViewChecklist(tool)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View Checklist
                  </button>
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
                    <div className="flex items-center gap-2">
                      <span>{item.item_name}</span>
                      {item.required && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No checklist items found for this tool.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 