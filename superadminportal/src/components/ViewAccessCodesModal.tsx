import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CompanyAccessCode } from '../types'

interface Props {
  companyId: string | null
  companyName: string | null
  isOpen: boolean
  onClose: () => void
}

export default function ViewAccessCodesModal({ companyId, companyName, isOpen, onClose }: Props) {
  const [codes, setCodes] = useState<CompanyAccessCode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [genRole, setGenRole] = useState<'admin' | 'tech'>('admin')
  const [genLoading, setGenLoading] = useState(false)

  const generateCodeString = () => Math.random().toString(36).substring(2, 10).toUpperCase()

  const handleGenerate = async () => {
    if (!companyId) return
    setGenLoading(true)
    setError('')
    const newCode = generateCodeString()
    const { error } = await supabase.from('company_access_codes').insert({ company_id: companyId, code: newCode, role: genRole, is_active: true })
    if (error) setError(error.message)
    else await supabase.from('company_access_codes').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).then(({ data }) => setCodes(data as CompanyAccessCode[]))
    setGenLoading(false)
  }

  const handleDelete = async (codeId: string) => {
    if (!confirm('Delete this access code?')) return
    const { error } = await supabase.from('company_access_codes').delete().eq('id', codeId)
    if (error) {
      setError(error.message)
    } else {
      setCodes(prev => prev.filter(c => c.id !== codeId))
    }
  }

  useEffect(() => {
    if (!isOpen || !companyId) return
    const fetchCodes = async () => {
      setLoading(true)
      setError('')
      const { data, error } = await supabase
        .from('company_access_codes')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      if (error) setError(error.message)
      else setCodes(data as CompanyAccessCode[])
      setLoading(false)
    }
    fetchCodes()
  }, [isOpen, companyId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Access Codes for {companyName}</h2>
        <div className="mb-4 flex items-end space-x-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={genRole} onChange={e => setGenRole(e.target.value as any)} className="border rounded px-2 py-1">
              <option value="admin">Admin</option>
              <option value="tech">Tech</option>
            </select>
          </div>
          <button onClick={handleGenerate} disabled={genLoading} className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
            {genLoading ? 'Generating...' : 'Generate Code'}
          </button>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : codes.length === 0 ? (
          <p>No access codes found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Code</th>
                <th className="px-2 py-1 text-left">Role</th>
                <th className="px-2 py-1 text-left">Active</th>
                <th className="px-2 py-1 text-left">Created</th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {codes.map(code => (
                <tr key={code.id}>
                  <td className="px-2 py-1 font-mono">{code.code}</td>
                  <td className="px-2 py-1 capitalize">{code.role}</td>
                  <td className="px-2 py-1">{code.is_active ? 'Yes' : 'No'}</td>
                  <td className="px-2 py-1">{new Date(code.created_at).toLocaleDateString()}</td>
                  <td className="px-2 py-1">
                    <button
                      onClick={() => handleDelete(code.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-100">Close</button>
        </div>
      </div>
    </div>
  )
} 