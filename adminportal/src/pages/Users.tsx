import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface User {
  id: string
  name: string
  email: string
  role: string
  company_id: string
  created_at: string
}

interface AccessCode {
  id: string
  code: string
  role: string
  created_at: string
  is_active: boolean
  company_id: string
}

const EDGE_FUNCTION_BASE_URL = import.meta.env.DEV
  ? 'https://trcackummmixzocenxvm.supabase.co'
  : 'https://trcackummmixzocenxvm.supabase.co'

export default function Users() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'tech',
  })
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    email: '',
    role: 'tech',
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([])
  const [showAccessCodes, setShowAccessCodes] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null)
  const [editingAccessCode, setEditingAccessCode] = useState<AccessCode | null>(null)
  const [isEditAccessCodeModalOpen, setIsEditAccessCodeModalOpen] = useState(false)
  const [editAccessCodeLoading, setEditAccessCodeLoading] = useState(false)
  const [editAccessCodeError, setEditAccessCodeError] = useState<string | null>(null)
  const [visibleAdminCodes, setVisibleAdminCodes] = useState<Set<string>>(new Set())
  const [currentUsersPage, setCurrentUsersPage] = useState(1)
  const [currentAccessCodesPage, setCurrentAccessCodesPage] = useState(1)
  const itemsPerPage = 10

  // Fetch users, access codes, and user role
  useEffect(() => {
    fetchUsers()
    fetchUserRole()
  }, [])

  // Fetch access codes after we have the user's role and company
  useEffect(() => {
    if (userRole && userCompanyId) {
      fetchAccessCodes()
    }
  }, [userRole, userCompanyId])

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, company_id, created_at')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setUsers(data || [])
    setLoading(false)
  }

  async function fetchAccessCodes() {
    try {
      const { data, error } = await supabase
        .from('company_access_codes')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching access codes:', error)
        return
      }
      
      setAccessCodes(data || [])
    } catch (error) {
      console.error('Error fetching access codes:', error)
    }
  }

  async function fetchUserRole() {
    setLoadingRole(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role, company_id')
          .eq('id', user.id)
          .single()
        
        if (data) {
          setUserRole(data.role)
          setUserCompanyId(data.company_id)
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    } finally {
      setLoadingRole(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleOpen() {
    setShowForm(true)
    setError(null)
    setSuccess(null)
  }

  function handleClose() {
    setShowForm(false)
    setForm({ name: '', email: '', password: '', role: 'tech' })
    setError(null)
    setSuccess(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('You must be logged in to create users')
      setLoading(false)
      return
    }

    // Call Edge Function
    try {
      const res = await fetch(`${EDGE_FUNCTION_BASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setError(result.error || 'Failed to create user')
        setLoading(false)
        return
      }
      setSuccess('User created successfully!')
      setLoading(false)
      handleClose()
      fetchUsers()
    } catch (err: any) {
      setError(err.message || 'Failed to create user')
      setLoading(false)
    }
  }

  function handleEditOpen(user: User) {
    setEditingUser(user)
    setEditForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
    setEditError(null)
    setEditSuccess(null)
  }

  function handleEditClose() {
    setEditingUser(null)
    setEditForm({ id: '', name: '', email: '', role: 'tech' })
    setEditError(null)
    setEditSuccess(null)
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEditLoading(true)
    setEditError(null)
    setEditSuccess(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setEditError('You must be logged in to edit users')
        setEditLoading(false)
        return
      }
      const res = await fetch(`${EDGE_FUNCTION_BASE_URL}/functions/v1/edit-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: editForm.id,
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
        }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setEditError(result.error || 'Failed to update user')
        setEditLoading(false)
        return
      }
      setEditSuccess('User updated successfully!')
      setEditLoading(false)
      handleEditClose()
      fetchUsers()
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user')
      setEditLoading(false)
    }
  }

  function handleDeleteOpen(user: User) {
    setDeleteUser(user)
  }

  function handleDeleteClose() {
    setDeleteUser(null)
  }

  async function handleDeleteSubmit() {
    setDeleteLoading(true)
    setDeleteError(null)
    setDeleteSuccess(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setDeleteError('You must be logged in to delete users')
        setDeleteLoading(false)
        return
      }
      const res = await fetch(`${EDGE_FUNCTION_BASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: deleteUser?.id,
        }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setDeleteError(result.error || 'Failed to delete user')
        setDeleteLoading(false)
        return
      }
      setDeleteSuccess('User deleted successfully!')
      setDeleteLoading(false)
      handleDeleteClose()
      fetchUsers()
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete user')
      setDeleteLoading(false)
    }
  }

  async function handleGenerateCode(role: 'admin' | 'tech') {
    setGeneratingCode(true)
    setGenerateError(null)
    setGenerateSuccess(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setGenerateError('You must be logged in to generate access codes')
        setGeneratingCode(false)
        return
      }

      const res = await fetch(`${EDGE_FUNCTION_BASE_URL}/functions/v1/generate-access-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ role }),
      })

      const result = await res.json()
      if (!res.ok || result.error) {
        setGenerateError(result.error || 'Failed to generate access code')
        setGeneratingCode(false)
        return
      }

      setGenerateSuccess(`Access code generated successfully: ${result.access_code.code}`)
      setGeneratingCode(false)
      fetchAccessCodes()
    } catch (err: any) {
      setGenerateError(err.message || 'Failed to generate access code')
      setGeneratingCode(false)
    }
  }

  async function handleEditAccessCode() {
    if (!editingAccessCode) return

    setEditAccessCodeLoading(true)
    setEditAccessCodeError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setEditAccessCodeError('You must be logged in to edit access codes')
        setEditAccessCodeLoading(false)
        return
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-access-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: editingAccessCode.id,
          code: editingAccessCode.code,
          role: editingAccessCode.role,
          is_active: editingAccessCode.is_active
        })
      })

      const result = await res.json()
      if (!res.ok || result.error) {
        setEditAccessCodeError(result.error || 'Failed to update access code')
        setEditAccessCodeLoading(false)
        return
      }

      setEditingAccessCode(null)
      setIsEditAccessCodeModalOpen(false)
      fetchAccessCodes()
    } catch (err: any) {
      setEditAccessCodeError(err.message || 'Failed to update access code')
    } finally {
      setEditAccessCodeLoading(false)
    }
  }

  const toggleCodeVisibility = (codeId: string) => {
    setVisibleAdminCodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(codeId)) {
        newSet.delete(codeId)
      } else {
        newSet.add(codeId)
      }
      return newSet
    })
  }

  const maskCode = (code: AccessCode, codeId: string) => {
    if (code.role === 'admin' && !visibleAdminCodes.has(codeId)) {
      return '•'.repeat(code.code.length)
    }
    return code.code
  }

  const getPaginatedUsers = () => {
    const filtered = users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const startIndex = (currentUsersPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filtered.slice(startIndex, endIndex)
  }

  const getPaginatedAccessCodes = () => {
    const filtered = accessCodes.filter(code => 
      userRole === 'admin' || code.role === 'tech'
    )
    const startIndex = (currentAccessCodesPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filtered.slice(startIndex, endIndex)
  }

  const getTotalPages = (items: any[]) => Math.ceil(items.length / itemsPerPage)

  if (loadingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        {userRole === 'admin' && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add User
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Users List */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getPaginatedUsers().map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditOpen(user)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => handleDeleteOpen(user)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Users Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentUsersPage(prev => Math.max(prev - 1, 1))}
              disabled={currentUsersPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentUsersPage(prev => Math.min(prev + 1, getTotalPages(users)))}
              disabled={currentUsersPage === getTotalPages(users)}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentUsersPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentUsersPage * itemsPerPage, users.length)}
                </span>{' '}
                of <span className="font-medium">{users.length}</span> users
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentUsersPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentUsersPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: getTotalPages(users) }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentUsersPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentUsersPage === page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentUsersPage(prev => Math.min(prev + 1, getTotalPages(users)))}
                  disabled={currentUsersPage === getTotalPages(users)}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Access Codes Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Access Codes</h2>
            {userRole === 'admin' && (
              <div className="flex space-x-4">
                <button
                  onClick={() => handleGenerateCode('admin')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Generate Admin Code
                </button>
                <button
                  onClick={() => handleGenerateCode('tech')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Generate Tech Code
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  {userRole === 'admin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getPaginatedAccessCodes().map((code) => (
                  <tr key={code.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span>{code.role === 'admin' ? maskCode(code, code.id) : code.code}</span>
                        {code.role === 'admin' && (
                          <button
                            onClick={() => toggleCodeVisibility(code.id)}
                            className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            title={visibleAdminCodes.has(code.id) ? "Hide code" : "Show code"}
                          >
                            {visibleAdminCodes.has(code.id) ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{code.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{code.is_active ? 'Active' : 'Inactive'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(code.created_at).toLocaleString()}
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => {
                            setEditingAccessCode(code)
                            setIsEditAccessCodeModalOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Access Codes Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentAccessCodesPage(prev => Math.max(prev - 1, 1))}
                disabled={currentAccessCodesPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentAccessCodesPage(prev => Math.min(prev + 1, getTotalPages(accessCodes)))}
                disabled={currentAccessCodesPage === getTotalPages(accessCodes)}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentAccessCodesPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentAccessCodesPage * itemsPerPage, accessCodes.length)}
                  </span>{' '}
                  of <span className="font-medium">{accessCodes.length}</span> access codes
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentAccessCodesPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentAccessCodesPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: getTotalPages(accessCodes) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentAccessCodesPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentAccessCodesPage === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentAccessCodesPage(prev => Math.min(prev + 1, getTotalPages(accessCodes)))}
                    disabled={currentAccessCodesPage === getTotalPages(accessCodes)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={handleClose}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-semibold mb-6">Add User</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block font-medium mb-2 text-lg">Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-2 text-lg">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-2 text-lg">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-2 text-lg">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tech">Tech</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-3 rounded-lg text-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-5 py-3 rounded-lg text-lg">
                  {success}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-5">
                <button
                  type="button"
                  className="px-6 py-3 rounded-lg border text-lg hover:bg-gray-50 transition-colors"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={handleEditClose}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-semibold mb-6">Edit User</h3>
            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div>
                <label className="block font-medium mb-2 text-lg">Name</label>
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  required
                  className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-2 text-lg">Email</label>
                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                  required
                  className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-2 text-lg">Role</label>
                <select
                  name="role"
                  value={editForm.role}
                  onChange={handleEditChange}
                  required
                  className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tech">Tech</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-3 rounded-lg text-lg">
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-5 py-3 rounded-lg text-lg">
                  {editSuccess}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-5">
                <button
                  type="button"
                  className="px-6 py-3 rounded-lg border text-lg hover:bg-gray-50 transition-colors"
                  onClick={handleEditClose}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={handleDeleteClose}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-semibold mb-6">Delete User</h3>
            <p className="text-lg mb-6">
              Are you sure you want to delete {deleteUser.name}? This action cannot be undone.
            </p>
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-3 rounded-lg text-lg mb-6">
                {deleteError}
              </div>
            )}
            {deleteSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-5 py-3 rounded-lg text-lg mb-6">
                {deleteSuccess}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-6 py-3 rounded-lg border text-lg hover:bg-gray-50 transition-colors"
                onClick={handleDeleteClose}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                onClick={handleDeleteSubmit}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Access Code Modal */}
      {isEditAccessCodeModalOpen && editingAccessCode && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => {
                setIsEditAccessCodeModalOpen(false)
                setEditingAccessCode(null)
                setEditAccessCodeError(null)
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-semibold mb-6">Edit Access Code</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleEditAccessCode(); }} className="space-y-5">
              <div>
                <label className="block font-medium mb-2 text-lg">Code</label>
                <input
                  type="text"
                  value={editingAccessCode.code}
                  onChange={(e) => setEditingAccessCode(prev => prev ? { ...prev, code: e.target.value } : null)}
                  required
                  className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-2 text-lg">Role</label>
                <select
                  value={editingAccessCode.role}
                  onChange={(e) => setEditingAccessCode(prev => prev ? { ...prev, role: e.target.value } : null)}
                  required
                  className="w-full border rounded-lg px-5 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="tech">Tech</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingAccessCode.is_active}
                  onChange={(e) => setEditingAccessCode(prev => prev ? { ...prev, is_active: e.target.checked } : null)}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 w-5 h-5"
                />
                <label htmlFor="is_active" className="text-lg">Active</label>
              </div>
              {editAccessCodeError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-3 rounded-lg text-lg">
                  {editAccessCodeError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-5">
                <button
                  type="button"
                  className="px-6 py-3 rounded-lg border text-lg hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setIsEditAccessCodeModalOpen(false)
                    setEditingAccessCode(null)
                    setEditAccessCodeError(null)
                  }}
                  disabled={editAccessCodeLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={editAccessCodeLoading}
                >
                  {editAccessCodeLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 