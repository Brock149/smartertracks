import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

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

export default function AppVersions() {
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
    return <div className="text-center py-8 text-gray-500 text-lg">Loading version settings...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Mobile App Version Control</h2>
          <p className="text-lg text-gray-500 mt-1">
            Manage minimum app versions and force updates for iOS and Android
          </p>
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

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-blue-500 text-2xl">ℹ️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-blue-800">How Force Updates Work</h3>
            <div className="mt-2 text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Minimum Version:</strong> Users below this version will be forced to update</li>
                <li><strong>Current Version:</strong> The latest version available in the app stores</li>
                <li><strong>Force Update Enabled:</strong> Toggle to control whether force updates are active</li>
                <li>When a user's app version is below the minimum, they'll see an update screen</li>
                <li>They won't be able to use the app until they update to at least the minimum version</li>
                <li>Version format: Use semantic versioning (e.g., 1.2.5)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Version Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {versions.map((version) => (
          <div key={version.platform} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-3xl mr-3">
                  {version.platform === 'ios' ? '🍎' : '🤖'}
                </span>
                <h3 className="text-2xl font-bold capitalize">{version.platform}</h3>
              </div>
              {editingPlatform !== version.platform && (
                <button
                  onClick={() => startEditing(version)}
                  className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 text-sm font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {editingPlatform === version.platform ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Version (Required)
                  </label>
                  <input
                    type="text"
                    value={formData.minimum_version}
                    onChange={(e) => handleChange('minimum_version', e.target.value)}
                    placeholder="1.2.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Users below this version must update
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Version (Latest)
                  </label>
                  <input
                    type="text"
                    value={formData.current_version}
                    onChange={(e) => handleChange('current_version', e.target.value)}
                    placeholder="1.2.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Latest version available in stores
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Message
                  </label>
                  <textarea
                    value={formData.update_message}
                    onChange={(e) => handleChange('update_message', e.target.value)}
                    placeholder="A new version is available! Please update to continue."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave(version.platform)}
                    disabled={saving === version.platform}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving === version.platform ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Minimum Version:</span>
                  <span className="font-semibold text-lg">{version.minimum_version}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Version:</span>
                  <span className="font-semibold text-lg">{version.current_version}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Force Update:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      version.force_update_enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {version.force_update_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600 block mb-1">Update Message:</span>
                  <p className="text-sm text-gray-800 italic">"{version.update_message}"</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 block mb-1">Store URL:</span>
                  <a
                    href={version.store_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {version.store_url}
                  </a>
                </div>
                <div className="text-xs text-gray-500 pt-2">
                  Last updated: {new Date(version.updated_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
        <h3 className="text-xl font-bold mb-4">How to Roll Out an Update</h3>
        <ol className="list-decimal list-inside space-y-3 text-gray-700">
          <li>
            <strong>Deploy your new app version</strong> to the App Store and Google Play Store
          </li>
          <li>
            <strong>Update "Current Version"</strong> to match the newly released version
          </li>
          <li>
            <strong>Decide on minimum version:</strong>
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
              <li>Keep same as before = Users can continue with old versions (soft update)</li>
              <li>Set to new version = All users must update immediately (hard update)</li>
              <li>Set to specific older version = Only very old versions must update</li>
            </ul>
          </li>
          <li>
            <strong>Enable force update</strong> if you want to block users on old versions
          </li>
          <li>
            <strong>Customize the message</strong> users will see when they need to update
          </li>
        </ol>
      </div>
    </div>
  )
}
