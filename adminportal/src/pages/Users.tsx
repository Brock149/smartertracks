import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface User {
  id: string
  name: string
  email: string
  role: string
  created_at: string
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
  const [loading, setLoading] = useState(false)
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

  // Fetch users
  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setUsers(data || [])
    setLoading(false)
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

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-gray-500 mt-1">Manage your team members and their roles</p>
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          onClick={handleOpen}
        >
          Add New User
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {/* Modal Form */}
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
            <h3 className="text-xl font-semibold mb-6">Add New User</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="tech">Tech</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
            <h3 className="text-xl font-semibold mb-6">Edit User</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Role</label>
                <select
                  name="role"
                  value={editForm.role}
                  onChange={handleEditChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="tech">Tech</option>
                </select>
              </div>
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg">
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-2 rounded-lg">
                  {editSuccess}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                  onClick={handleEditClose}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
            <h3 className="text-xl font-semibold mb-6">Delete User</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">User Information</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Name:</span>
                    <p className="text-gray-900">{deleteUser.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Email:</span>
                    <p className="text-gray-900">{deleteUser.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Role:</span>
                    <p className="text-gray-900">{deleteUser.role}</p>
                  </div>
                </div>
              </div>
              <p className="text-red-600 font-medium">
                Warning: This action cannot be undone. Are you sure you want to delete this user?
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
                  onClick={handleDeleteClose}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  onClick={handleDeleteSubmit}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User list */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found</div>
        ) : (
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
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3" onClick={() => handleEditOpen(user)}>Edit</button>
                    <button className="text-red-600 hover:text-red-900" onClick={() => handleDeleteOpen(user)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
} 