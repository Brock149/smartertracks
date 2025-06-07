import { useState, useEffect } from 'react'
import { getCompanySettings, updateCompanySettings, applyLocationAlias } from '../lib/supabase'
import type { CompanySettingsWithAliases } from '../types/database'

export default function CompanySettings() {
  const [settings, setSettings] = useState<CompanySettingsWithAliases>({
    default_tool_location: null,
    location_aliases: []
  })
  const [newAlias, setNewAlias] = useState({ alias: '', standardized_location: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [defaultLocationInput, setDefaultLocationInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const data = await getCompanySettings()
      console.log('Loaded settings:', data) // Debug log
      setSettings({
        ...data,
        location_aliases: data.location_aliases || []
      })
      setDefaultLocationInput(data.default_tool_location || '')
      setError(null)
    } catch (err) {
      setError('Failed to load settings')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDefaultLocationChange = (value: string) => {
    setDefaultLocationInput(value)
  }

  const handleSaveDefaultLocation = async () => {
    try {
      setIsSaving(true)
      await updateCompanySettings(defaultLocationInput, settings.location_aliases)
      setSettings(prev => ({ ...prev, default_tool_location: defaultLocationInput }))
      setSuccess('Default location updated successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Failed to update default location')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddAlias = async () => {
    if (!newAlias.alias || !newAlias.standardized_location) {
      setError('Both alias and standardized location are required')
      return
    }

    try {
      const updatedAliases = [...(settings.location_aliases || []), newAlias]
      await updateCompanySettings(settings.default_tool_location, updatedAliases)
      setSettings(prev => ({ ...prev, location_aliases: updatedAliases }))
      setNewAlias({ alias: '', standardized_location: '' })
      setSuccess('Location alias added successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Failed to add location alias')
      console.error(err)
    }
  }

  const handleRemoveAlias = async (aliasToRemove: string) => {
    try {
      const updatedAliases = (settings.location_aliases || []).filter(
        a => a.alias !== aliasToRemove
      )
      await updateCompanySettings(settings.default_tool_location, updatedAliases)
      setSettings(prev => ({ ...prev, location_aliases: updatedAliases }))
      setSuccess('Location alias removed successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Failed to remove location alias')
      console.error(err)
    }
  }

  const handleApplyAlias = async () => {
    try {
      await applyLocationAlias()
      setSuccess('Successfully applied aliases to existing data')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Failed to apply aliases to existing data')
      console.error(err)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Company Settings</h1>
        <div>Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Company Settings</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Default Tool Location</h2>
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Current default location: <span className="font-semibold text-gray-900">{settings.default_tool_location || 'Not set'}</span>
          </p>
        </div>
        <div className="flex gap-4">
          <input
            type="text"
            value={defaultLocationInput}
            onChange={(e) => handleDefaultLocationChange(e.target.value)}
            placeholder={settings.default_tool_location ? "Enter new default location" : "Enter default location"}
            className="border rounded px-3 py-2 flex-grow"
          />
          <button
            onClick={handleSaveDefaultLocation}
            disabled={isSaving}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isSaving ? 'Saving...' : settings.default_tool_location ? 'Update' : 'Save'}
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Location Aliases</h2>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={newAlias.alias}
            onChange={(e) => setNewAlias(prev => ({ ...prev, alias: e.target.value }))}
            placeholder="Enter alias (e.g., 'shop')"
            className="border rounded px-3 py-2 flex-grow"
          />
          <input
            type="text"
            value={newAlias.standardized_location}
            onChange={(e) => setNewAlias(prev => ({ ...prev, standardized_location: e.target.value }))}
            placeholder="Enter standardized location (e.g., 'Warehouse')"
            className="border rounded px-3 py-2 flex-grow"
          />
          <button
            onClick={handleAddAlias}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Alias
          </button>
        </div>

        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alias</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Standardized Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(settings.location_aliases || []).map((alias) => (
              <tr key={alias.alias}>
                <td className="px-6 py-4 whitespace-nowrap">{alias.alias}</td>
                <td className="px-6 py-4 whitespace-nowrap">{alias.standardized_location}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleRemoveAlias(alias.alias)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(settings.location_aliases || []).length > 0 && (
          <div className="mt-4">
            <button
              onClick={handleApplyAlias}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Apply All Aliases to Existing Data
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 