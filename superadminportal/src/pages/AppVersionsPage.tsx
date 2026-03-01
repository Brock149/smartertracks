import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface VersionControl {
  id: string
  platform: 'ios' | 'android'
  minimum_version: string
  current_version: string
  force_update_enabled: boolean
  update_message: string
  store_url: string
  created_at: string
  updated_at: string
}

export default function AppVersionsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [versions, setVersions] = useState<VersionControl[]>([])
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<VersionControl>>({})

  useEffect(() => {
    fetchVersions()
  }, [])

  async function fetchVersions() {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('app_version_control')
        .select('*')
        .order('platform', { ascending: true })
      
      if (error) throw error
      setVersions(data || [])
    } catch (error: any) {
      console.error('Error fetching versions:', error)
      setError('Failed to fetch version control settings: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  function startEditing(version: VersionControl) {
    setEditingPlatform(version.platform)
    setFormData(version)
    setError(null)
    setSuccess(null)
  }

  function cancelEditing() {
    setEditingPlatform(null)
    setFormData({})
    setError(null)
    setSuccess(null)
  }

  async function handleSave(platform: string) {
    try {
      setSaving(platform)
      setError(null)
      setSuccess(null)

      const { error } = await supabase
        .from('app_version_control')
        .update({
          minimum_version: formData.minimum_version,
          current_version: formData.current_version,
          force_update_enabled: formData.force_update_enabled,
          update_message: formData.update_message,
          store_url: formData.store_url,
        })
        .eq('platform', platform)

      if (error) throw error

      setSuccess(`${platform.toUpperCase()} version settings updated successfully!`)
      setEditingPlatform(null)
      await fetchVersions()
    } catch (error: any) {
      setError('Failed to save version settings: ' + error.message)
    } finally {
      setSaving(null)
    }
  }

  function handleChange(field: keyof VersionControl, value: any) {
    setFormData({ ...formData, [field]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Mobile App Version Control</h2>
        <p className="text-gray-600 mt-1">
          Manage minimum app versions and force updates for iOS and Android
        </p>
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

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-blue-500 text-2xl">ℹ️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-base font-medium text-blue-800">How Force Updates Work</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Minimum Version:</strong> Users below this version will be forced to update</li>
                <li><strong>Current Version:</strong> The latest version available in the app stores</li>
                <li><strong>Force Update Enabled:</strong> Toggle to control whether force updates are active</li>
                <li>When enabled, users below minimum version will see an update screen and cannot proceed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Version Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {versions.map((version) => (
          <div key={version.platform} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-3xl mr-3">
                  {version.platform === 'ios' ? '🍎' : '🤖'}
                </span>
                <h3 className="text-xl font-bold capitalize">{version.platform}</h3>
              </div>
              {editingPlatform !== version.platform && (
                <button
                  onClick={() => startEditing(version)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                >
                  Edit
                </button>
              )}
            </div>

            {editingPlatform === version.platform ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Version (Required)
                  </label>
                  <input
                    type="text"
                    value={formData.minimum_version}
                    onChange={(e) => handleChange('minimum_version', e.target.value)}
                    placeholder="1.2.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Users below this version must update
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Version (Latest)
                  </label>
                  <input
                    type="text"
                    value={formData.current_version}
                    onChange={(e) => handleChange('current_version', e.target.value)}
                    placeholder="1.2.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Latest version available in stores
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Update Message
                  </label>
                  <textarea
                    value={formData.update_message}
                    onChange={(e) => handleChange('update_message', e.target.value)}
                    placeholder="A new version is available! Please update to continue."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store URL
                  </label>
                  <input
                    type="text"
                    value={formData.store_url}
                    onChange={(e) => handleChange('store_url', e.target.value)}
                    placeholder={
                      version.platform === 'ios'
                        ? 'https://apps.apple.com/app/id...'
                        : 'https://play.google.com/store/apps/details?id=...'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Force Update Enabled
                    </label>
                    <p className="text-xs text-gray-500">
                      Block users below minimum version
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.force_update_enabled}
                      onChange={(e) => handleChange('force_update_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    onClick={cancelEditing}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave(version.platform)}
                    disabled={saving === version.platform}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving === version.platform ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Minimum Version:</span>
                  <span className="font-semibold">{version.minimum_version}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Version:</span>
                  <span className="font-semibold">{version.current_version}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Force Update:</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      version.force_update_enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {version.force_update_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-600 block mb-1">Update Message:</span>
                  <p className="text-sm text-gray-800 italic">"{version.update_message}"</p>
                </div>
                <div className="text-xs text-gray-500">
                  Last updated: {new Date(version.updated_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Usage Instructions */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-base font-bold mb-2">Quick Guide</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Deploy new app version to App Store / Play Store</li>
          <li>Update "Current Version" to match the new release</li>
          <li>Set "Minimum Version" based on your needs:
            <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
              <li>Same as current = Force all users to update</li>
              <li>Lower than current = Only force very old versions</li>
            </ul>
          </li>
          <li>Enable "Force Update" to start blocking old versions</li>
        </ol>
      </div>
    </div>
  )
}
