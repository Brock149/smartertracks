import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ToolImageUpload } from '../components/ToolImageUpload'
import { ToolImageGallery } from '../components/ToolImageGallery'
import { fetchToolImages, deleteToolImageRecord } from '../lib/uploadImage'

interface Tool {
  id: string
  number: string
  name: string
  description: string
  created_at: string
  company_id: string
  current_owner: string | null
  photo_url?: string
  owner?: {
    name: string
  }
  latest_transaction?: Array<{
    location: string
    stored_at: string
    timestamp: string
  }>
  checklist?: Array<{
    item_name: string
    required: boolean
  }>
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
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false)
  const [loadingChecklist, setLoadingChecklist] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newTool, setNewTool] = useState({
    number: '',
    name: '',
    description: '',
    checklist: [] as Array<ChecklistItem | { item_name: string; required: boolean }>
  })
  const [newChecklistItem, setNewChecklistItem] = useState({
    item_name: '',
    required: true
  })
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)


  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [newToolImages, setNewToolImages] = useState<Array<{ id: string; image_url: string }>>([])
  const [newToolImagesAdded, setNewToolImagesAdded] = useState<Array<{ id: string; image_url: string }>>([])
  const [editToolImages, setEditToolImages] = useState<Array<{ id: string; image_url: string }>>([])
  const [editImagesToDelete, setEditImagesToDelete] = useState<Array<{ id: string; image_url: string }>>([])
  const [editImagesAdded, setEditImagesAdded] = useState<Array<{ id: string; image_url: string }>>([])
  const [toolsWithImages, setToolsWithImages] = useState<{ [toolId: string]: boolean }>({})
  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null)
  const [editingChecklistItem, setEditingChecklistItem] = useState<{
    item_name: string
    required: boolean
    tool_id: string
  }>({
    item_name: '',
    required: true,
    tool_id: ''
  })
  const [editChecklistLoading, setEditChecklistLoading] = useState(false)
  const [editChecklistError, setEditChecklistError] = useState<string | null>(null)
  const [deleteChecklistLoading] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteTool, setDeleteTool] = useState<Tool | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editLoading] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  useEffect(() => {
    console.log('Tools component mounted')
    fetchTools()

    // Subscribe to changes in tool_transactions
    const subscription = supabase
      .channel('tool_transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tool_transactions'
        },
        () => {
          // Refresh tools data when any transaction changes
          fetchTools()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    async function checkImages() {
      // Run all fetches in parallel for speed
      const entries = await Promise.all(tools.map(async (tool) => {
        const imgs = await fetchToolImages(tool.id);
        return [tool.id, imgs.length > 0] as [string, boolean];
      }));
      setToolsWithImages(Object.fromEntries(entries));
    }
    if (tools.length > 0) checkImages();
  }, [tools]);

  async function fetchTools() {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching tools...')
      
      // First get all tools, excluding deleted tools
      const { data: toolsData, error: toolsError } = await supabase
        .from('tools')
        .select('*')
        .eq('is_deleted', false)  // Only show non-deleted tools
        .order('number', { ascending: true })

      if (toolsError) throw toolsError

      // Get users data separately to avoid foreign key cache issues
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name')

      if (usersError) throw usersError

      // Create a map of users for quick lookup
      const usersMap = new Map(usersData?.map(user => [user.id, user]) || [])

      // Then get the latest transaction for each tool
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('tool_transactions')
        .select('tool_id, location, stored_at, timestamp')
        .order('timestamp', { ascending: false })

      if (transactionsError) throw transactionsError

      // Create a map of the latest transaction for each tool
      const latestTransactions = new Map()
      transactionsData?.forEach(transaction => {
        if (!latestTransactions.has(transaction.tool_id)) {
          latestTransactions.set(transaction.tool_id, transaction)
        }
      })

      // Combine the data
      const toolsWithTransactions = toolsData?.map(tool => ({
        ...tool,
        owner: tool.current_owner ? usersMap.get(tool.current_owner) : null,
        latest_transaction: latestTransactions.get(tool.id) ? [latestTransactions.get(tool.id)] : []
      }))

      setTools(toolsWithTransactions || [])
      console.log('Tools state updated:', toolsWithTransactions)
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



  async function handleCreateTool() {
    try {
      const baseChecklist = newTool.checklist ? [...newTool.checklist] : []
      const hasOverall = baseChecklist.some(
        (it) => it.item_name.trim().toLowerCase() === 'overall tool condition'
      )
      const checklistToSend = hasOverall
        ? baseChecklist
        : [...baseChecklist, { item_name: 'Overall Tool Condition', required: true }]

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-tool`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({ ...newTool, checklist: checklistToSend })
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tool')
      }
      setNewTool({
        number: '',
        name: '',
        description: '',
        checklist: []
      });
      setNewToolImages([]);
      setNewToolImagesAdded([]);
      setIsCreateModalOpen(false)
      fetchTools();
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred')
    }
  }





  async function handleAddChecklistItem(e: React.FormEvent) {
    e.preventDefault(); // Prevent default form submission
    if (!selectedTool || !newChecklistItem.item_name.trim()) return;

    try {
      setIsAddingItem(true);
      const session = await supabase.auth.getSession();
      console.log('Current session:', session);
      console.log('Access token:', session.data.session?.access_token);
      console.log('User ID:', session.data.session?.user.id);

      if (!session.data.session?.access_token) {
        throw new Error('No access token found. Please log in again.');
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
      );

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add checklist item');
      }

      // Reset form but keep modal open
      setNewChecklistItem({ item_name: '', required: true });
      await fetchChecklist(selectedTool.id);
    } catch (error: any) {
      console.error('Error adding checklist item:', error);
      setError(error.message);
    } finally {
      setIsAddingItem(false);
    }
  }

  const handleEditTool = (tool: Tool) => {
    setEditingTool(tool)
    setSelectedTool(tool)
    setEditToolImages([])
    setEditImagesToDelete([])
    setEditImagesAdded([])
    fetchToolImages(tool.id).then(setEditToolImages)
    fetchChecklist(tool.id)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTool) return;
    try {
      setEditChecklistLoading(true)
      setEditChecklistError(null)
      // Actually delete staged images
      for (const img of editImagesToDelete) {
        await deleteToolImageRecord(img.id, img.image_url);
      }
      // Clear added images tracker (they are now kept)
      setEditImagesAdded([]);
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
      setSelectedTool(null);
      setChecklistItems([]);
      setEditImagesToDelete([]);
      setEditImagesAdded([]);
      fetchTools();
    } catch (error: any) {
      alert(error.message || 'An unexpected error occurred');
    } finally {
      setEditChecklistLoading(false)
    }
  };

  const handleEditModalClose = async () => {
    // Delete all newly added images
    for (const img of editImagesAdded) {
      await deleteToolImageRecord(img.id, img.image_url);
    }
    setIsEditModalOpen(false);
    setEditingTool(null);
    setSelectedTool(null);
    setChecklistItems([]);
    setEditImagesToDelete([]);
    setEditImagesAdded([]);
    setIsAddingItem(false);
    setNewChecklistItem({ item_name: '', required: true });
  };





  const resetNewTool = async () => {
    // Delete all uploaded images for this new tool (not yet saved in DB)
    for (const img of newToolImages) {
      await deleteToolImageRecord(img.id, img.image_url);
    }
    // Also delete staged new images
    for (const img of newToolImagesAdded) {
      await deleteToolImageRecord(img.id, img.image_url);
    }
    setNewTool({
      number: '',
      name: '',
      description: '',
      checklist: []
    });
    setNewToolImages([]);
    setNewToolImagesAdded([]);
  };

  const handleDeleteTool = async () => {
    if (!deleteTool) return

    try {
      setDeleteLoading(true)
      setDeleteError(null)

      const { error } = await supabase
        .rpc('delete_tool', {
          p_tool_id: deleteTool.id
        })

      if (error) throw error

      setDeleteModalOpen(false)
      fetchTools() // Refresh the tools list
    } catch (error: any) {
      console.error('Error deleting tool:', error)
      setDeleteError(error.message || 'Failed to delete tool')
    } finally {
      setDeleteLoading(false)
    }
  }







  const handleEditChecklistOpen = (item: ChecklistItem) => {
    setEditingChecklistItemId(item.id)
    setEditingChecklistItem({
      item_name: item.item_name,
      required: item.required,
      tool_id: item.tool_id
    })
  }



  async function handleEditChecklistSave() {
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
          id: editingChecklistItemId,
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
      setEditingChecklistItem({
        item_name: '',
        required: true,
        tool_id: ''
      })
      await fetchChecklist(editingChecklistItem.tool_id)
    } catch (err: any) {
      setEditChecklistError(err.message || 'Failed to update checklist item')
    } finally {
      setEditChecklistLoading(false)
    }
  }

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      setLoadingChecklist(true)
      const { error } = await supabase
        .from('tool_checklists')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      // Refresh the checklist items
      await fetchChecklist(selectedTool!.id)
    } catch (error) {
      console.error('Error deleting checklist item:', error)
    } finally {
      setLoadingChecklist(false)
    }
  }

  function handleDeleteChecklistConfirm(item: ChecklistItem) {
    setConfirmingDeleteId(item.id)
  }

  function handleDeleteChecklistCancel() {
    setConfirmingDeleteId(null)
  }







  // Add pagination function
  const getPaginatedTools = () => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = tools.filter(tool => {
      const matchesNumber = tool.number.toLowerCase().includes(lowerSearch);
      const matchesName = tool.name.toLowerCase().includes(lowerSearch);
      const matchesDescription = (tool.description || '').toLowerCase().includes(lowerSearch);
      const matchesOwner = (tool.owner?.name || '').toLowerCase().includes(lowerSearch);
      const latestLocation = (tool.latest_transaction && tool.latest_transaction.length > 0)
        ? (tool.latest_transaction[0].location || '')
        : '';
      const matchesLocation = latestLocation.toLowerCase().includes(lowerSearch);

      return (
        matchesNumber ||
        matchesName ||
        matchesDescription ||
        matchesOwner ||
        matchesLocation
      );
    });
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }

  const getTotalPages = () => Math.ceil(tools.length / itemsPerPage)

  // Ensure default checklist item present when opening create modal
  const openCreateModal = () => {
    setNewTool(prev => {
      const existing = prev.checklist || []
      const hasOverall = existing.some(
        (it) => it.item_name.trim().toLowerCase() === 'overall tool condition'
      )
      return hasOverall
        ? { ...prev }
        : { ...prev, checklist: [...existing, { item_name: 'Overall Tool Condition', required: true }] }
    })
    setIsCreateModalOpen(true)
  }

  return (
    <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Tools</h1>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm md:text-base"
            >
              Add Tool
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getPaginatedTools().map((tool) => (
                    <tr key={tool.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tool.number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tool.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{tool.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tool.owner?.name || 'None'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tool.latest_transaction && tool.latest_transaction.length > 0 
                          ? tool.latest_transaction[0].location 
                          : 'No Location'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {toolsWithImages[tool.id] === undefined ? (
                          <span className="text-gray-500">Loading image…</span>
                        ) : toolsWithImages[tool.id] ? (
                          <ToolImageGallery toolId={tool.id} />
                        ) : (
                          <button
                            onClick={() => handleEditTool(tool)}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            Upload Image
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditTool(tool)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTool(tool)
                            setDeleteModalOpen(true)
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {getPaginatedTools().map((tool) => (
              <div key={tool.id} className="bg-white shadow rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{tool.name}</h3>
                    <p className="text-sm text-gray-500">#{tool.number}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTool(tool)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTool(tool)
                        setDeleteModalOpen(true)
                      }}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">{tool.description}</p>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Owner:</span>
                    <span className="text-gray-900">{tool.owner?.name || 'None'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Location:</span>
                    <span className="text-gray-900">
                      {tool.latest_transaction && tool.latest_transaction.length > 0 
                        ? tool.latest_transaction[0].location 
                        : 'No Location'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Image:</span>
                    <div>
                      {toolsWithImages[tool.id] === undefined ? (
                        <span className="text-gray-500">Loading image…</span>
                      ) : toolsWithImages[tool.id] ? (
                        <ToolImageGallery toolId={tool.id} />
                      ) : (
                        <button
                          onClick={() => handleEditTool(tool)}
                          className="text-blue-600 hover:text-blue-800 underline text-sm"
                        >
                          Upload Image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                disabled={currentPage === getTotalPages()}
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
                    {Math.min(currentPage * itemsPerPage, tools.length)}
                  </span>{' '}
                  of <span className="font-medium">{tools.length}</span> tools
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
                  {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                    disabled={currentPage === getTotalPages()}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Tool Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl relative max-h-[90vh] flex flex-col">
            <div className="p-4 md:p-8 border-b">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={async () => { setIsCreateModalOpen(false); await resetNewTool(); }}
                aria-label="Close"
              >
                ×
              </button>
              <h3 className="text-xl md:text-2xl font-semibold">Add New Tool</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <form onSubmit={handleCreateTool} className="space-y-4 md:space-y-5">
                <div>
                  <label className="block font-medium mb-2 text-base md:text-lg">Tool Number</label>
                  <input
                    type="text"
                    value={newTool.number}
                    onChange={(e) => setNewTool(prev => ({ ...prev, number: e.target.value }))}
                    required
                    placeholder="Enter tool number"
                    className="w-full border rounded-lg px-3 md:px-5 py-2 md:py-3 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2 text-base md:text-lg">Name</label>
                  <input
                    type="text"
                    value={newTool.name}
                    onChange={(e) => setNewTool(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Enter tool name"
                    className="w-full border rounded-lg px-3 md:px-5 py-2 md:py-3 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2 text-base md:text-lg">Description</label>
                  <textarea
                    value={newTool.description}
                    onChange={(e) => setNewTool(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter tool description (optional)"
                    className="w-full border rounded-lg px-3 md:px-5 py-2 md:py-3 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2 text-base md:text-lg">Checklist Items</label>
                  <div className="space-y-3">
                    {newTool.checklist.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="text"
                          value={item.item_name}
                          onChange={(e) => {
                            const newChecklist = [...newTool.checklist]
                            newChecklist[index] = { ...item, item_name: e.target.value }
                            setNewTool(prev => ({ ...prev, checklist: newChecklist }))
                          }}
                          placeholder="Item name"
                          className="flex-1 border rounded-lg px-3 md:px-5 py-2 md:py-3 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <label className="flex items-center gap-2 text-base md:text-lg">
                          <input
                            type="checkbox"
                            checked={item.required}
                            onChange={(e) => {
                              const newChecklist = [...newTool.checklist]
                              newChecklist[index] = { ...item, required: e.target.checked }
                              setNewTool(prev => ({ ...prev, checklist: newChecklist }))
                            }}
                            className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 w-5 h-5"
                          />
                          Required
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const newChecklist = newTool.checklist.filter((_, i) => i !== index)
                            setNewTool(prev => ({ ...prev, checklist: newChecklist }))
                          }}
                          className="text-red-600 hover:text-red-900 text-base md:text-lg"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setNewTool(prev => ({
                          ...prev,
                          checklist: [...prev.checklist, { item_name: '', required: true }]
                        }))
                      }}
                      className="text-blue-600 hover:text-blue-900 text-base md:text-lg"
                    >
                      + Add Checklist Item
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 md:p-8 border-t bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 rounded-lg border text-base md:text-lg hover:bg-gray-50 transition-colors"
                  onClick={async () => { setIsCreateModalOpen(false); await resetNewTool(); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg text-base md:text-lg hover:bg-blue-700 transition-colors"
                  onClick={handleCreateTool}
                >
                  Create Tool
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tool Modal */}
      {isEditModalOpen && editingTool && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl relative max-h-[90vh] flex flex-col">
            <div className="p-8 border-b">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={handleEditModalClose}
                aria-label="Close"
              >
                ×
              </button>
              <h3 className="text-2xl font-semibold">Edit Tool</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <form onSubmit={handleSaveEdit} className="space-y-5">
                <div>
                  <label className="block font-medium mb-2 text-lg">Tool Number</label>
                  <input
                    type="text"
                    value={editingTool.number}
                    onChange={(e) => setEditingTool({ ...editingTool, number: e.target.value })}
                    required
                    className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2 text-lg">Name</label>
                  <input
                    type="text"
                    value={editingTool.name}
                    onChange={(e) => setEditingTool({ ...editingTool, name: e.target.value })}
                    required
                    className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2 text-lg">Description</label>
                  <textarea
                    value={editingTool.description}
                    onChange={(e) => setEditingTool({ ...editingTool, description: e.target.value })}
                    className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2 text-lg">Tool Images</label>
                  <ToolImageUpload
                    toolId={editingTool.id}
                    images={editToolImages}
                    setImages={setEditToolImages}
                    disabled={false}
                    onRemoveImage={(img) => {
                      setEditToolImages(editToolImages.filter(i => i.id !== img.id));
                      setEditImagesToDelete([...editImagesToDelete, img]);
                    }}
                    onAddImage={(img) => {
                      setEditImagesAdded([...editImagesAdded, img]);
                    }}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2 text-lg">Checklist Items</label>
                  {loadingChecklist ? (
                    <div className="text-center py-4 text-lg">Loading checklist...</div>
                  ) : (
                    <div className="space-y-3">
                      {checklistItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{item.item_name}</span>
                            {item.required && (
                              <span className="text-base bg-blue-100 text-blue-800 px-3 py-1 rounded">Required</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleEditChecklistOpen(item)}
                              className="text-blue-600 hover:text-blue-900 text-lg"
                            >
                              Edit
                            </button>
                            {confirmingDeleteId === item.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={handleDeleteChecklistCancel}
                                  className="text-gray-600 hover:text-gray-900 text-lg"
                                  disabled={deleteChecklistLoading}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChecklistItem(item.id)}
                                  className="text-red-600 hover:text-red-900 text-lg"
                                  disabled={deleteChecklistLoading}
                                >
                                  {deleteChecklistLoading ? 'Deleting...' : 'Confirm Delete'}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteChecklistConfirm(item)}
                                className="text-red-600 hover:text-red-900 text-lg"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Add New Checklist Item Form */}
                      {isAddingItem ? (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={newChecklistItem.item_name}
                              onChange={(e) => setNewChecklistItem(prev => ({ ...prev, item_name: e.target.value }))}
                              placeholder="Enter checklist item name"
                              className="w-full border rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="required-checkbox"
                                checked={newChecklistItem.required}
                                onChange={(e) => setNewChecklistItem(prev => ({ ...prev, required: e.target.checked }))}
                                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 w-5 h-5"
                              />
                              <label htmlFor="required-checkbox" className="text-lg">Required</label>
                            </div>
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingItem(false)
                                  setNewChecklistItem({ item_name: '', required: true })
                                }}
                                className="px-4 py-2 rounded-lg border text-lg hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleAddChecklistItem}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-lg hover:bg-blue-700 transition-colors"
                                disabled={!newChecklistItem.item_name.trim()}
                              >
                                Add Item
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsAddingItem(true)}
                          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                        >
                          + Add Checklist Item
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </div>
            <div className="p-8 border-t bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 rounded-lg border text-lg hover:bg-gray-50 transition-colors"
                  onClick={handleEditModalClose}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  onClick={handleSaveEdit}
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tool Modal */}
      {deleteModalOpen && deleteTool && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setDeleteModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-semibold mb-6 text-red-600">Delete Tool</h3>
            <div className="space-y-5">
              <p className="text-lg text-gray-700">
                Are you sure you want to delete {deleteTool.name} (#{deleteTool.number})? This action cannot be undone.
              </p>
              {deleteError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-3 rounded-lg text-lg">
                  {deleteError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-5">
                <button
                  type="button"
                  className="px-6 py-3 rounded-lg border text-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  onClick={handleDeleteTool}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Tool'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Modal */}
      {isChecklistModalOpen && selectedTool && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl relative max-h-[90vh] flex flex-col">
            <div className="p-8 border-b">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={() => {
                  setIsChecklistModalOpen(false)
                  setSelectedTool(null)
                  setChecklistItems([])
                }}
                aria-label="Close"
              >
                ×
              </button>
              <h3 className="text-2xl font-semibold">
                Checklist for {selectedTool.name} (#{selectedTool.number})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              {loadingChecklist ? (
                <div className="text-center py-4 text-lg">Loading checklist...</div>
              ) : checklistItems.length > 0 ? (
                <div className="space-y-3">
                  {checklistItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.item_name}</span>
                        {item.required && (
                          <span className="text-base bg-blue-100 text-blue-800 px-3 py-1 rounded">Required</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleEditChecklistOpen(item)}
                          className="text-blue-600 hover:text-blue-900 text-lg"
                        >
                          Edit
                        </button>
                        {confirmingDeleteId === item.id ? (
                          <>
                            <button
                              onClick={handleDeleteChecklistCancel}
                              className="text-gray-600 hover:text-gray-900 text-lg"
                              disabled={deleteChecklistLoading}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeleteChecklistItem(item.id)}
                              className="text-red-600 hover:text-red-900 text-lg"
                              disabled={deleteChecklistLoading}
                            >
                              {deleteChecklistLoading ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleDeleteChecklistConfirm(item)}
                            className="text-red-600 hover:text-red-900 text-lg"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-lg text-gray-500">No checklist items found.</div>
              )}
            </div>
            <div className="p-8 border-t bg-gray-50">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsAddingItem(true)}
                  className="text-blue-600 hover:text-blue-900 text-lg"
                >
                  + Add Checklist Item
                </button>
                <button
                  type="button"
                  className="px-6 py-3 rounded-lg border text-lg hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setIsChecklistModalOpen(false)
                    setSelectedTool(null)
                    setChecklistItems([])
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Checklist Item Modal */}
      {isAddingItem && selectedTool && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setIsAddingItem(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-semibold mb-6">Add Checklist Item</h3>
            <form onSubmit={handleAddChecklistItem} className="space-y-5">
              <div>
                <label className="block font-medium mb-2 text-lg">Item Name</label>
                <input
                  type="text"
                  value={newChecklistItem.item_name}
                  onChange={(e) => setNewChecklistItem(prev => ({ ...prev, item_name: e.target.value }))}
                  required
                  className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={newChecklistItem.required}
                  onChange={(e) => setNewChecklistItem(prev => ({ ...prev, required: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 w-5 h-5"
                />
                <label htmlFor="required" className="text-lg">Required</label>
              </div>
              <div className="flex justify-end gap-3 pt-5">
                <button
                  type="button"
                  className="px-6 py-3 rounded-lg border text-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setIsAddingItem(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700 transition-colors"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Checklist Item Modal */}
      {editingChecklistItemId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => {
                setEditingChecklistItemId(null)
                setEditingChecklistItem({
                  item_name: '',
                  required: true,
                  tool_id: ''
                })
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-semibold mb-6">Edit Checklist Item</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleEditChecklistSave(); }} className="space-y-5">
              <div>
                <label className="block font-medium mb-2 text-lg">Item Name</label>
                <input
                  type="text"
                  value={editingChecklistItem.item_name}
                  onChange={(e) => setEditingChecklistItem(prev => ({ ...prev, item_name: e.target.value }))}
                  required
                  className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-required"
                  checked={editingChecklistItem.required}
                  onChange={(e) => setEditingChecklistItem(prev => ({ ...prev, required: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 w-5 h-5"
                />
                <label htmlFor="edit-required" className="text-lg">Required</label>
              </div>
              {editChecklistError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-3 rounded-lg text-lg">
                  {editChecklistError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-5">
                <button
                  type="button"
                  className="px-6 py-3 rounded-lg border text-lg hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setEditingChecklistItemId(null)
                    setEditingChecklistItem({
                      item_name: '',
                      required: true,
                      tool_id: ''
                    })
                  }}
                  disabled={editChecklistLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={editChecklistLoading}
                >
                  {editChecklistLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 