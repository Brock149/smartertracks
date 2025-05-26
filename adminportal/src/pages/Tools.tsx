import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface Tool {
  id: string
  number: string
  name: string
  description?: string
  photo_url?: string
}

export default function Tools() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTools() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('tools')
        .select('id, number, name, description, photo_url')
        .order('number', { ascending: true })
      if (error) {
        setError(error.message)
      } else {
        setTools(data || [])
      }
      setLoading(false)
    }
    fetchTools()
  }, [])

  if (loading) return <div>Loading tools...</div>
  if (error) return <div className="text-red-500">Error: {error}</div>

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">All Tools</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {tools.map(tool => (
          <div key={tool.id} className="bg-white rounded shadow p-4 flex flex-col items-center">
            {tool.photo_url ? (
              <img src={tool.photo_url} alt={tool.name} className="w-24 h-24 object-cover rounded mb-2" />
            ) : (
              <div className="w-24 h-24 flex items-center justify-center bg-gray-200 rounded mb-2 text-3xl">🧰</div>
            )}
            <div className="font-semibold">{tool.name}</div>
            <div className="text-gray-500">#{tool.number}</div>
            {tool.description && <div className="text-sm text-gray-400 mt-1">{tool.description}</div>}
          </div>
        ))}
      </div>
    </div>
  )
} 