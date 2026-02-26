import { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchToolImages } from '../lib/uploadImage'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ToolCostRow {
  id: string
  number: string
  name: string
  description: string
  estimated_cost: number | null
  current_owner: string | null
  owner_name: string
  location: string
}

type FilterMode = 'all' | 'costed' | 'missing'
type SortField = 'cost' | 'number' | 'name'
type SortDir = 'asc' | 'desc'

export default function ToolCosts() {
  const [tools, setTools] = useState<ToolCostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [sortField, setSortField] = useState<SortField>('cost')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // On-demand image viewer state
  const [imageViewToolId, setImageViewToolId] = useState<string | null>(null)
  const [imageViewImages, setImageViewImages] = useState<Array<{ id: string; image_url: string; thumb_url?: string | null }>>([])
  const [imageViewIdx, setImageViewIdx] = useState(0)
  const [imageViewLoading, setImageViewLoading] = useState(false)
  const [imageViewError, setImageViewError] = useState(false)

  async function openImageViewer(toolId: string) {
    setImageViewToolId(toolId)
    setImageViewLoading(true)
    setImageViewError(false)
    setImageViewIdx(0)
    setImageViewImages([])
    try {
      const imgs = await fetchToolImages(toolId)
      if (imgs.length === 0) {
        setImageViewImages([])
      } else {
        setImageViewImages(imgs)
      }
    } catch {
      setImageViewError(true)
    } finally {
      setImageViewLoading(false)
    }
  }

  function closeImageViewer() {
    setImageViewToolId(null)
    setImageViewImages([])
    setImageViewIdx(0)
    setImageViewLoading(false)
    setImageViewError(false)
  }

  useEffect(() => {
    fetchToolCosts()
    fetchCompanyName()
  }, [])

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  async function fetchCompanyName() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (!userData?.company_id) return
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', userData.company_id)
        .single()
      if (company?.name) setCompanyName(company.name)
    } catch {
      // non-critical
    }
  }

  async function fetchToolCosts() {
    try {
      setLoading(true)
      setError(null)

      const { data: toolsData, error: toolsError } = await supabase
        .from('tools')
        .select('id, number, name, description, estimated_cost, current_owner')
        .eq('is_deleted', false)

      if (toolsError) throw toolsError

      const { data: usersData } = await supabase
        .from('users')
        .select('id, name')

      const usersMap = new Map((usersData || []).map(u => [u.id, u.name]))

      const { data: txData } = await supabase
        .from('tool_transactions')
        .select('tool_id, location, timestamp')
        .order('timestamp', { ascending: false })

      const latestLocation = new Map<string, string>()
      ;(txData || []).forEach(tx => {
        if (!latestLocation.has(tx.tool_id)) {
          latestLocation.set(tx.tool_id, tx.location || '')
        }
      })

      const rows: ToolCostRow[] = (toolsData || []).map(t => ({
        id: t.id,
        number: t.number,
        name: t.name,
        description: t.description || '',
        estimated_cost: t.estimated_cost,
        current_owner: t.current_owner,
        owner_name: t.current_owner ? usersMap.get(t.current_owner) || 'Unknown' : 'Unassigned',
        location: latestLocation.get(t.id) || 'No Location',
      }))

      setTools(rows)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let list = tools

    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      list = list.filter(t =>
        t.number.toLowerCase().includes(lower) ||
        t.name.toLowerCase().includes(lower) ||
        t.owner_name.toLowerCase().includes(lower) ||
        t.location.toLowerCase().includes(lower)
      )
    }

    if (filter === 'costed') {
      list = list.filter(t => t.estimated_cost != null)
    } else if (filter === 'missing') {
      list = list.filter(t => t.estimated_cost == null)
    }

    return list
  }, [tools, searchTerm, filter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'cost') {
        const aCost = a.estimated_cost ?? -1
        const bCost = b.estimated_cost ?? -1
        return (aCost - bCost) * dir
      }
      if (sortField === 'name') {
        return a.name.localeCompare(b.name) * dir
      }
      // number
      const an = parseInt(a.number, 10)
      const bn = parseInt(b.number, 10)
      if (Number.isNaN(an) && Number.isNaN(bn)) return a.number.localeCompare(b.number) * dir
      if (Number.isNaN(an)) return 1 * dir
      if (Number.isNaN(bn)) return -1 * dir
      return (an - bn) * dir
    })
  }, [filtered, sortField, sortDir])

  const totalPages = Math.max(Math.ceil(sorted.length / itemsPerPage), 1)

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sorted.slice(start, start + itemsPerPage)
  }, [sorted, currentPage])

  // Summary stats
  const stats = useMemo(() => {
    const costed = tools.filter(t => t.estimated_cost != null)
    const total = costed.reduce((sum, t) => sum + (t.estimated_cost || 0), 0)
    return {
      totalTools: tools.length,
      costedCount: costed.length,
      missingCount: tools.length - costed.length,
      totalValue: total,
      avgCost: costed.length > 0 ? Math.round(total / costed.length) : 0,
    }
  }, [tools])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(field === 'cost' ? 'desc' : 'asc')
    }
    setCurrentPage(1)
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return ''
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  function startEdit(tool: ToolCostRow) {
    setEditingId(tool.id)
    setEditValue(tool.estimated_cost != null ? String(tool.estimated_cost) : '')
  }

  async function saveEdit(toolId: string) {
    setSaving(true)
    try {
      const newCost = editValue.trim() === '' ? null : Math.round(Number(editValue))
      if (editValue.trim() !== '' && (isNaN(Number(editValue)) || Number(editValue) < 0)) {
        setError('Please enter a valid positive number')
        setSaving(false)
        return
      }

      const session = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-tool`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`
          },
          body: JSON.stringify({ id: toolId, estimated_cost: newCost })
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update cost')
      }

      setTools(prev =>
        prev.map(t => (t.id === toolId ? { ...t, estimated_cost: newCost } : t))
      )
      setEditingId(null)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
    setError(null)
  }

  function handleKeyDown(e: React.KeyboardEvent, toolId: string) {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit(toolId)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  function formatCurrency(value: number | null): string {
    if (value == null) return '—'
    return '$' + value.toLocaleString()
  }

  function exportToExcel() {
    const exportData = sorted.map(t => ({
      'Tool #': t.number,
      'Name': t.name,
      'Description': t.description,
      'Owner': t.owner_name,
      'Location': t.location,
      'Estimated Cost': t.estimated_cost ?? '',
    }))

    exportData.push({
      'Tool #': '',
      'Name': '',
      'Description': '',
      'Owner': '',
      'Location': 'TOTAL',
      'Estimated Cost': stats.totalValue as any,
    })

    const ws = XLSX.utils.json_to_sheet(exportData)

    const colWidths = [
      { wch: 10 },  // Tool #
      { wch: 30 },  // Name
      { wch: 40 },  // Description
      { wch: 20 },  // Owner
      { wch: 20 },  // Location
      { wch: 15 },  // Estimated Cost
    ]
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tool Costs')
    XLSX.writeFile(wb, `Tool_Cost_Estimate_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function exportToPdf() {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text(companyName || 'Tool Cost Estimate', 14, 20)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)

    doc.setFontSize(11)
    doc.setTextColor(0)
    const summaryY = 36
    doc.text(`Total Tools: ${stats.totalTools}`, 14, summaryY)
    doc.text(`Tools With Cost: ${stats.costedCount}`, 14, summaryY + 6)
    doc.text(`Missing Cost: ${stats.missingCount}`, 80, summaryY + 6)
    doc.text(`Total Estimated Value: ${formatCurrency(stats.totalValue)}`, 14, summaryY + 12)
    doc.text(`Average Tool Cost: ${formatCurrency(stats.avgCost)}`, 80, summaryY + 12)

    const tableData = sorted.map(t => [
      t.number,
      t.name,
      t.owner_name,
      t.location,
      t.estimated_cost != null ? `$${t.estimated_cost.toLocaleString()}` : '—',
    ])

    tableData.push(['', '', '', 'TOTAL', `$${stats.totalValue.toLocaleString()}`])

    autoTable(doc, {
      startY: summaryY + 20,
      head: [['Tool #', 'Name', 'Owner', 'Location', 'Est. Cost']],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: {
        4: { halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1 && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    doc.save(`Tool_Cost_Estimate_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const filterCounts = {
    all: tools.length,
    costed: stats.costedCount,
    missing: stats.missingCount,
  }

  return (
    <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Tool Cost Estimates</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm md:text-base flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </button>
          <button
            onClick={exportToPdf}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm md:text-base flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
          <div className="text-sm text-blue-600 font-medium">Total Estimated Value</div>
          <div className="text-xl md:text-2xl font-bold text-blue-900">{formatCurrency(stats.totalValue)}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
          <div className="text-sm text-green-600 font-medium">Tools With Cost</div>
          <div className="text-xl md:text-2xl font-bold text-green-900">{stats.costedCount} <span className="text-sm font-normal text-green-600">of {stats.totalTools}</span></div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 md:p-4">
          <div className="text-sm text-amber-600 font-medium">Missing Cost</div>
          <div className="text-xl md:text-2xl font-bold text-amber-900">{stats.missingCount}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 md:p-4">
          <div className="text-sm text-purple-600 font-medium">Average Cost</div>
          <div className="text-xl md:text-2xl font-bold text-purple-900">{formatCurrency(stats.avgCost)}</div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name, number, owner, location..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="inline-flex rounded-md shadow-sm overflow-hidden border border-gray-200">
          {(['all', 'costed', 'missing'] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setCurrentPage(1) }}
              className={`px-3 md:px-4 py-2 text-sm font-medium capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } ${f !== 'all' ? 'border-l border-gray-200' : ''}`}
            >
              {f === 'all' ? 'All' : f === 'costed' ? 'Costed' : 'Missing'} ({filterCounts[f]})
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline text-sm">dismiss</button>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('number')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  #{sortIndicator('number')}
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  Name{sortIndicator('name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Photo
                </th>
                <th
                  onClick={() => handleSort('cost')}
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  Estimated Cost{sortIndicator('cost')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginated.map((tool) => (
                <tr
                  key={tool.id}
                  className={tool.estimated_cost == null ? 'bg-amber-50/40' : ''}
                >
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{tool.number}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">{tool.name}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">{tool.owner_name}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">{tool.location}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-center">
                    <button
                      onClick={() => openImageViewer(tool.id)}
                      className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
                    >
                      View Photo
                    </button>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right">
                    {editingId === tool.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-gray-500">$</span>
                        <input
                          ref={inputRef}
                          type="number"
                          min="0"
                          step="1"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, tool.id)}
                          onBlur={() => saveEdit(tool.id)}
                          disabled={saving}
                          className="w-28 border border-blue-400 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(tool)}
                        className={`inline-block w-full text-right px-2 py-1 rounded transition-colors ${
                          tool.estimated_cost != null
                            ? 'text-gray-900 hover:bg-blue-50'
                            : 'text-amber-600 italic hover:bg-amber-50'
                        }`}
                        title="Click to edit"
                      >
                        {tool.estimated_cost != null
                          ? formatCurrency(tool.estimated_cost)
                          : '+ Add Cost'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No tools found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
            {paginated.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-6 py-3 text-sm font-semibold text-gray-700 text-right">
                    Page Total:
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                    {formatCurrency(paginated.reduce((sum, t) => sum + (t.estimated_cost || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {paginated.map((tool) => (
          <div
            key={tool.id}
            className={`bg-white shadow rounded-lg p-4 border ${
              tool.estimated_cost == null ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                <p className="text-sm text-gray-500">#{tool.number}</p>
              </div>
              {editingId === tool.id ? (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, tool.id)}
                    onBlur={() => saveEdit(tool.id)}
                    disabled={saving}
                    autoFocus
                    className="w-24 border border-blue-400 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <button
                  onClick={() => startEdit(tool)}
                  className={`text-sm font-semibold px-2 py-1 rounded ${
                    tool.estimated_cost != null
                      ? 'text-gray-900 hover:bg-blue-50'
                      : 'text-amber-600 italic hover:bg-amber-50'
                  }`}
                >
                  {tool.estimated_cost != null ? formatCurrency(tool.estimated_cost) : '+ Add Cost'}
                </button>
              )}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Owner: {tool.owner_name}</span>
              <button
                onClick={() => openImageViewer(tool.id)}
                className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
              >
                View Photo
              </button>
              <span className="text-gray-500">{tool.location}</span>
            </div>
          </div>
        ))}
        {paginated.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No tools found matching your criteria.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow md:shadow-none">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="flex items-center text-sm text-gray-500">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, sorted.length)}</span>{' '}
                of <span className="font-medium">{sorted.length}</span> tools
              </p>
            </div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let page: number
                if (totalPages <= 7) {
                  page = i + 1
                } else if (currentPage <= 4) {
                  page = i + 1
                } else if (currentPage >= totalPages - 3) {
                  page = totalPages - 6 + i
                } else {
                  page = currentPage - 3 + i
                }
                return (
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
                )
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* On-demand Image Viewer Modal */}
      {imageViewToolId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-2xl w-full relative flex flex-col items-center">
            <button
              onClick={closeImageViewer}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              aria-label="Close"
            >
              &times;
            </button>

            {imageViewLoading && (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                <span className="text-gray-500 text-sm">Loading photo...</span>
              </div>
            )}

            {!imageViewLoading && imageViewError && (
              <div className="py-16 text-center">
                <span className="text-red-500">Failed to load images.</span>
              </div>
            )}

            {!imageViewLoading && !imageViewError && imageViewImages.length === 0 && (
              <div className="py-16 text-center">
                <span className="text-gray-500">No photos uploaded for this tool.</span>
              </div>
            )}

            {!imageViewLoading && !imageViewError && imageViewImages.length > 0 && (
              <div className="flex items-center w-full">
                {imageViewImages.length > 1 && (
                  <button
                    onClick={() => setImageViewIdx((prev) => (prev - 1 + imageViewImages.length) % imageViewImages.length)}
                    className="text-4xl font-bold text-white bg-gray-800 bg-opacity-70 hover:bg-opacity-90 rounded-full p-2 mx-2 select-none flex-shrink-0"
                    aria-label="Previous"
                  >
                    &#8249;
                  </button>
                )}

                <div className="mx-auto max-h-[75vh] overflow-hidden flex items-center justify-center">
                  <img
                    src={imageViewImages[imageViewIdx].image_url}
                    alt="Tool Photo"
                    className="max-h-[75vh] w-auto rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = ''
                      setImageViewError(true)
                    }}
                  />
                </div>

                {imageViewImages.length > 1 && (
                  <button
                    onClick={() => setImageViewIdx((prev) => (prev + 1) % imageViewImages.length)}
                    className="text-4xl font-bold text-white bg-gray-800 bg-opacity-70 hover:bg-opacity-90 rounded-full p-2 mx-2 select-none flex-shrink-0"
                    aria-label="Next"
                  >
                    &#8250;
                  </button>
                )}
              </div>
            )}

            {!imageViewLoading && imageViewImages.length > 1 && (
              <div className="mt-3 text-sm text-gray-500">
                {imageViewIdx + 1} of {imageViewImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
