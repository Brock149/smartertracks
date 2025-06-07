import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getMyCompanySettings, updateCompanySettings, type CompanySettings } from '../lib/companySettingsApi'

interface User {
  id: string
  name: string
  email: string
  role: string
  company_id: string
  created_at: string
}

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [formData, setFormData] = useState({
    default_location: '',
    default_owner_id: '',
    use_default_location: true,
    use_default_owner: true
  })
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null)

  useEffect(() => {
    fetchUserRole()
  }, [])

  useEffect(() => {
    if (userRole && userCompanyId) {
      fetchUsers()
      fetchSettings()
    }
  }, [userRole, userCompanyId])

  async function fetchUserRole() {
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
      setError('Failed to fetch user information')
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, company_id, created_at')
        .eq('company_id', userCompanyId)
        .order('name', { ascending: true })
      
      if (error) throw error
      setUsers(data || [])
    } catch (error: any) {
      console.error('Error fetching users:', error)
      setError('Failed to fetch users')
    }
  }

  async function fetchSettings() {
    try {
      setLoading(true)
      setError(null)
      
      const settings = await getMyCompanySettings()
      setSettings(settings)
      
      if (settings) {
        setFormData({
          default_location: settings.default_location,
          default_owner_id: settings.default_owner_id || '',
          use_default_location: settings.use_default_location,
          use_default_owner: settings.use_default_owner
        })
      } else {
        setFormData({
          default_location: '',
          default_owner_id: '',
          use_default_location: true,
          use_default_owner: true
        })
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error)
      setError('Failed to fetch company settings: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (!userCompanyId) {
        throw new Error('Company ID not found')
      }

      const updatedSettings = await updateCompanySettings(userCompanyId, {
        default_location: formData.default_location,
        default_owner_id: formData.default_owner_id || null,
        use_default_location: formData.use_default_location,
        use_default_owner: formData.use_default_owner
      })

      setSettings(updatedSettings)
      setSuccess('Settings saved successfully!')
    } catch (error: any) {
      setError(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Only allow admins to access this page
  if (userRole && userRole !== 'admin') {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 text-lg">
          You do not have permission to access this page. Only administrators can manage company settings.
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500 text-lg">Loading settings...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Company Settings</h2>
          <p className="text-lg text-gray-500 mt-1">Manage default settings for new tools</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-3 rounded-lg mb-6 text-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-5 py-3 rounded-lg mb-6 text-lg">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Toggle Switches */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Feature Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Use Default Location Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-base font-medium text-gray-700">
                    Use Default Location
                  </label>
                  <p className="text-sm text-gray-500">
                    Automatically assign location to new tools
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    name="use_default_location"
                    checked={formData.use_default_location}
                    onChange={(e) => setFormData({ ...formData, use_default_location: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Use Default Owner Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-base font-medium text-gray-700">
                    Use Default Owner
                  </label>
                  <p className="text-sm text-gray-500">
                    Automatically assign owner to new tools
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    name="use_default_owner"
                    checked={formData.use_default_owner}
                    onChange={(e) => setFormData({ ...formData, use_default_owner: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Default Location */}
            <div className={`${!formData.use_default_location ? 'opacity-50' : ''}`}>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Default Location
              </label>
              <input
                type="text"
                name="default_location"
                value={formData.default_location}
                onChange={handleChange}
                placeholder="Enter default location (e.g., Warehouse A, Main Storage)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={formData.use_default_location}
                disabled={!formData.use_default_location}
              />
              <p className="text-sm text-gray-500 mt-2">
                This location will be automatically assigned to new tools when they are created.
              </p>
            </div>

            {/* Default Owner */}
            <div className={`${!formData.use_default_owner ? 'opacity-50' : ''}`}>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Default Owner
              </label>
              <select
                name="default_owner_id"
                value={formData.default_owner_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={formData.use_default_owner}
                disabled={!formData.use_default_owner}
              >
                <option value="">Select a default owner</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email}) - {user.role}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-2">
                This user will be automatically assigned ownership of new tools when they are created.
              </p>
            </div>
          </div>

          {/* Information Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-blue-500 text-xl">ℹ️</span>
              </div>
              <div className="ml-3">
                                 <h3 className="text-lg font-medium text-blue-800">How Default Settings Work</h3>
                 <div className="mt-2 text-blue-700">
                   <ul className="list-disc list-inside space-y-1">
                     <li>Toggle switches above control whether defaults are applied to new tools</li>
                     <li>When enabled, new tools will automatically use the default location and/or owner</li>
                     <li>When disabled, new tools will be created without automatic assignments</li>
                     <li>A transaction record will be created when defaults are applied, showing transfer from "System"</li>
                     <li>This allows flexibility for companies with multiple warehouses or management structures</li>
                   </ul>
                 </div>
              </div>
            </div>
          </div>

          {/* Current Settings Display */}
          {settings && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Current Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Default Location:</span>
                  <p className="text-gray-900">
                    {settings.use_default_location ? settings.default_location : 'Disabled'}
                    {settings.use_default_location && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Default Owner:</span>
                  <p className="text-gray-900">
                    {settings.use_default_owner 
                      ? (users.find(u => u.id === settings.default_owner_id)?.name || 'Not set')
                      : 'Disabled'
                    }
                    {settings.use_default_owner && settings.default_owner_id && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  default_location: settings?.default_location || '',
                  default_owner_id: settings?.default_owner_id || '',
                  use_default_location: settings?.use_default_location ?? true,
                  use_default_owner: settings?.use_default_owner ?? true
                })
                setError(null)
                setSuccess(null)
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg text-lg font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 