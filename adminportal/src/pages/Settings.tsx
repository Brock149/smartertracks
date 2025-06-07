import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getMyCompanySettings, updateCompanySettings, type CompanySettings } from '../lib/companySettingsApi'
import { getCompanyAliases, createLocationAlias, deleteLocationAlias, type LocationAlias, type CreateAliasData } from '../lib/locationAliasApi'

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
  
  // Location Aliases State
  const [aliases, setAliases] = useState<LocationAlias[]>([])
  const [aliasesLoading, setAliasesLoading] = useState(true)
  const [aliasesError, setAliasesError] = useState<string | null>(null)
  const [aliasForm, setAliasForm] = useState({
    normalized_location: '',
    aliases: [''] // Start with one empty alias field
  })
  const [addingAlias, setAddingAlias] = useState(false)
  const [deletingAlias, setDeletingAlias] = useState<string | null>(null)
  const [addingToLocation, setAddingToLocation] = useState<string | null>(null)
  const [newAliasForLocation, setNewAliasForLocation] = useState('')
  const [savingNewAlias, setSavingNewAlias] = useState(false)

  useEffect(() => {
    fetchUserRole()
  }, [])

  useEffect(() => {
    if (userRole && userCompanyId) {
      fetchUsers()
      fetchSettings()
      fetchAliases()
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

  async function fetchAliases() {
    try {
      if (!userCompanyId) return
      
      setAliasesLoading(true)
      setAliasesError(null)
      
      const aliasData = await getCompanyAliases(userCompanyId)
      setAliases(aliasData)
    } catch (error: any) {
      console.error('Error fetching aliases:', error)
      setAliasesError('Failed to fetch location aliases: ' + error.message)
    } finally {
      setAliasesLoading(false)
    }
  }

  async function handleAddAliases(e: React.FormEvent) {
    e.preventDefault()
    if (!userCompanyId) return

    setAddingAlias(true)
    setAliasesError(null)

    try {
      // Filter out empty aliases and create each one
      const validAliases = aliasForm.aliases.filter(alias => alias.trim() !== '')
      
      if (validAliases.length === 0) {
        setAliasesError('Please enter at least one alias')
        return
      }

      if (!aliasForm.normalized_location.trim()) {
        setAliasesError('Please enter a normalized location')
        return
      }

      // Create all aliases for this normalized location
      for (const alias of validAliases) {
        await createLocationAlias(userCompanyId, {
          alias: alias.trim(),
          normalized_location: aliasForm.normalized_location.trim()
        })
      }
      
      setAliasForm({ normalized_location: '', aliases: [''] })
      await fetchAliases() // Refresh the list
    } catch (error: any) {
      setAliasesError(error.message || 'Failed to add location aliases')
    } finally {
      setAddingAlias(false)
    }
  }

  function addAliasField() {
    setAliasForm({
      ...aliasForm,
      aliases: [...aliasForm.aliases, '']
    })
  }

  function removeAliasField(index: number) {
    if (aliasForm.aliases.length > 1) {
      setAliasForm({
        ...aliasForm,
        aliases: aliasForm.aliases.filter((_, i) => i !== index)
      })
    }
  }

  function updateAliasField(index: number, value: string) {
    const newAliases = [...aliasForm.aliases]
    newAliases[index] = value
    setAliasForm({
      ...aliasForm,
      aliases: newAliases
    })
  }

  async function handleDeleteAlias(aliasId: string) {
    setDeletingAlias(aliasId)
    setAliasesError(null)

    try {
      await deleteLocationAlias(aliasId)
      await fetchAliases() // Refresh the list
    } catch (error: any) {
      setAliasesError(error.message || 'Failed to delete location alias')
    } finally {
      setDeletingAlias(null)
    }
  }

  async function handleAddAliasToLocation(normalizedLocation: string) {
    if (!userCompanyId || !newAliasForLocation.trim()) return

    setSavingNewAlias(true)
    setAliasesError(null)

    try {
      await createLocationAlias(userCompanyId, {
        alias: newAliasForLocation.trim(),
        normalized_location: normalizedLocation
      })
      setNewAliasForLocation('')
      setAddingToLocation(null)
      await fetchAliases() // Refresh the list
    } catch (error: any) {
      setAliasesError(error.message || 'Failed to add alias to location')
    } finally {
      setSavingNewAlias(false)
    }
  }

  function cancelAddAliasToLocation() {
    setAddingToLocation(null)
    setNewAliasForLocation('')
    setAliasesError(null)
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

      {/* Location Aliases Section */}
      <div className="bg-white rounded-lg shadow p-8 mt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold">Location Aliases</h3>
            <p className="text-lg text-gray-500 mt-1">Map different location names to standardized locations</p>
          </div>
        </div>

        {aliasesError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-3 rounded-lg mb-6 text-lg">
            {aliasesError}
          </div>
        )}

        {/* Add New Aliases Form */}
        <form onSubmit={handleAddAliases} className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h4 className="text-lg font-medium text-gray-800 mb-4">Add Multiple Aliases for One Location</h4>
          
          {/* Normalized Location Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Normalized Location (what gets saved in database)
            </label>
            <input
              type="text"
              value={aliasForm.normalized_location}
              onChange={(e) => setAliasForm({ ...aliasForm, normalized_location: e.target.value })}
              placeholder="e.g., Warehouse"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Multiple Alias Fields */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aliases (what users can type)
            </label>
            <div className="space-y-2">
              {aliasForm.aliases.map((alias, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => updateAliasField(index, e.target.value)}
                    placeholder={`e.g., ${index === 0 ? 'shop' : index === 1 ? 'office' : index === 2 ? '1455' : 'main floor'}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {aliasForm.aliases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAliasField(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-md text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addAliasField}
              className="mt-2 px-3 py-1 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md text-sm"
            >
              + Add Another Alias
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addingAlias}
              className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingAlias ? 'Adding Aliases...' : 'Save All Aliases'}
            </button>
          </div>
        </form>

        {/* Aliases Display - Grouped by Normalized Location */}
        <div className="bg-white rounded-lg border">
          {aliasesLoading ? (
            <div className="p-8 text-center text-gray-500">Loading aliases...</div>
          ) : aliases.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No location aliases configured yet. Add some above to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* Group aliases by normalized location */}
              {Object.entries(
                aliases.reduce((groups, alias) => {
                  const location = alias.normalized_location
                  if (!groups[location]) {
                    groups[location] = []
                  }
                  groups[location].push(alias)
                  return groups
                }, {} as Record<string, LocationAlias[]>)
              ).map(([normalizedLocation, locationAliases]) => (
                <div key={normalizedLocation} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        📍 {normalizedLocation}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {locationAliases.length} alias{locationAliases.length !== 1 ? 'es' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setAddingToLocation(normalizedLocation)}
                      disabled={addingToLocation === normalizedLocation}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50"
                    >
                      + Add Alias
                    </button>
                  </div>

                  {/* Add Alias Form for this location */}
                  {addingToLocation === normalizedLocation && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={newAliasForLocation}
                          onChange={(e) => setNewAliasForLocation(e.target.value)}
                          placeholder="Enter new alias..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddAliasToLocation(normalizedLocation)
                            } else if (e.key === 'Escape') {
                              cancelAddAliasToLocation()
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddAliasToLocation(normalizedLocation)}
                          disabled={!newAliasForLocation.trim() || savingNewAlias}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingNewAlias ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelAddAliasToLocation}
                          className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {locationAliases.map((alias) => (
                      <div
                        key={alias.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">
                            "{alias.alias}"
                          </span>
                          <div className="text-xs text-gray-500">
                            by {alias.created_by_name || 'Unknown'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAlias(alias.id)}
                          disabled={deletingAlias === alias.id}
                          className="ml-3 text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {deletingAlias === alias.id ? 'Deleting...' : '✕'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Information Panel for Aliases */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-blue-500 text-xl">ℹ️</span>
            </div>
            <div className="ml-3">
              <h4 className="text-lg font-medium text-blue-800">How Location Aliases Work</h4>
              <div className="mt-2 text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>When users enter locations in transactions, aliases are automatically applied</li>
                  <li>Multiple aliases can point to the same normalized location</li>
                  <li>Aliases are case-insensitive (e.g., "SHOP" matches "shop")</li>
                  <li>Existing transaction data is not automatically updated when you add new aliases</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 