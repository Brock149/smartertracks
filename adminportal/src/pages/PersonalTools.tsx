import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'

interface PersonalToolImage {
  id: string
  image_url: string
  thumb_url: string | null
  is_primary: boolean
}

interface PersonalTool {
  id: string
  owner_id: string
  number: string
  name: string
  photo_url: string | null
  holder_type: 'self' | 'lent'
  lent_to_name: string | null
  lent_location: string | null
  lent_at: string | null
  created_at: string
  images: PersonalToolImage[]
}

interface Employee {
  id: string
  name: string
  email: string
  role: string
  tools: PersonalTool[]
}

function primaryImage(tool: PersonalTool): PersonalToolImage | null {
  if (!tool.images || tool.images.length === 0) return null
  return tool.images.find((i) => i.is_primary) || tool.images[0]
}

export default function PersonalTools() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [sortMode, setSortMode] = useState<'most' | 'alpha'>('most')
  const [modalTool, setModalTool] = useState<PersonalTool | null>(null)
  const [modalPhotoIdx, setModalPhotoIdx] = useState(0)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const { data: me, error: meErr } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (meErr || !me?.company_id) throw new Error('Could not determine your company')

      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('company_id', me.company_id)
        .order('name', { ascending: true })
      if (usersErr) throw usersErr

      const ownerIds = (users || []).map((u) => u.id)

      let tools: PersonalTool[] = []
      if (ownerIds.length > 0) {
        const { data: toolsData, error: toolsErr } = await supabase
          .from('personal_tools')
          .select(`
            id, owner_id, number, name, photo_url, holder_type,
            lent_to_name, lent_location, lent_at, created_at,
            images:personal_tool_images(id, image_url, thumb_url, is_primary)
          `)
          .in('owner_id', ownerIds)
          .eq('is_deleted', false)
          .order('number_numeric', { ascending: true })
        if (toolsErr) throw toolsErr
        tools = (toolsData || []) as PersonalTool[]
      }

      const byOwner: Record<string, PersonalTool[]> = {}
      tools.forEach((t) => {
        if (!byOwner[t.owner_id]) byOwner[t.owner_id] = []
        byOwner[t.owner_id].push(t)
      })

      const list: Employee[] = (users || []).map((u) => ({
        ...u,
        tools: byOwner[u.id] || [],
      }))

      setEmployees(list)
    } catch (e: any) {
      setError(e.message || 'Failed to load personal tools')
    } finally {
      setLoading(false)
    }
  }

  // Employees ordered for the dropdown based on the active sort.
  const sortedEmployees = useMemo(() => {
    const copy = [...employees]
    if (sortMode === 'most') {
      copy.sort((a, b) => {
        if (b.tools.length !== a.tools.length) return b.tools.length - a.tools.length
        return a.name.localeCompare(b.name)
      })
    } else {
      copy.sort((a, b) => a.name.localeCompare(b.name))
    }
    return copy
  }, [employees, sortMode])

  // Sidebar list: sorted employees, filtered by the employee search box.
  const sidebarEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase()
    if (!term) return sortedEmployees
    return sortedEmployees.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        (e.email || '').toLowerCase().includes(term)
    )
  }, [sortedEmployees, employeeSearch])

  // Pick a sensible default once data + ordering are ready.
  useEffect(() => {
    if (!selectedId && sortedEmployees.length > 0) {
      setSelectedId(sortedEmployees.find((e) => e.tools.length > 0)?.id || sortedEmployees[0].id)
    }
  }, [sortedEmployees, selectedId])

  const selected = employees.find((e) => e.id === selectedId) || null
  const totalPersonalTools = useMemo(
    () => employees.reduce((sum, e) => sum + e.tools.length, 0),
    [employees]
  )
  const employeesWithTools = useMemo(
    () => employees.filter((e) => e.tools.length > 0).length,
    [employees]
  )

  const visibleTools = useMemo(() => {
    if (!selected) return []
    if (!search.trim()) return selected.tools
    const q = search.toLowerCase()
    return selected.tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        String(t.number).toLowerCase().includes(q) ||
        (t.lent_to_name || '').toLowerCase().includes(q)
    )
  }, [selected, search])

  function openModal(tool: PersonalTool) {
    setModalTool(tool)
    setModalPhotoIdx(0)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
        {error}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Personal Tools</h2>
        <p className="text-gray-500 mt-1">
          A read-only view of the personal tool inventories your employees track in the app.
          {' '}
          <span className="font-medium text-gray-700">
            {totalPersonalTools} personal tool{totalPersonalTools !== 1 ? 's' : ''} across {employeesWithTools} employee{employeesWithTools !== 1 ? 's' : ''}.
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left sidebar: employee list with search + sort */}
        <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-gray-800">Employees</h2>
          <input
            type="text"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="inline-flex rounded-md shadow-sm overflow-hidden border border-gray-200 w-full">
            <button
              type="button"
              onClick={() => setSortMode('most')}
              className={`flex-1 px-3 py-2 text-sm font-medium ${
                sortMode === 'most' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Most tools
            </button>
            <button
              type="button"
              onClick={() => setSortMode('alpha')}
              className={`flex-1 px-3 py-2 text-sm font-medium border-l border-gray-200 ${
                sortMode === 'alpha' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              A–Z
            </button>
          </div>
          {sidebarEmployees.length === 0 ? (
            <div className="text-sm text-gray-500">
              {employeeSearch.trim() ? 'No employees match your search.' : 'No employees yet.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {sidebarEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => { setSelectedId(emp.id); setSearch('') }}
                  className={`w-full text-left px-3 py-2 rounded-md border transition relative ${
                    selectedId === emp.id
                      ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-200'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {selectedId === emp.id && (
                    <span className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-blue-600" />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900 truncate">{emp.name}</span>
                    <span className="shrink-0 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {emp.tools.length}
                    </span>
                  </div>
                  {emp.email && (
                    <div className="text-xs text-gray-500 truncate">{emp.email}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: selected employee's tools */}
        <div className="space-y-4">
          {!selected ? (
            <div className="bg-white border rounded-lg p-6 text-gray-500">
              Select an employee to view their personal tools.
            </div>
          ) : (
            <>
              <div className="bg-white border rounded-lg">
                <div className="border-b px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    {search.trim()
                      ? `Showing ${visibleTools.length} of ${selected.tools.length} tools`
                      : `${selected.name}'s tools (${selected.tools.length})`}
                  </span>
                  {selected.tools.length > 0 && (
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search this employee's tools..."
                      className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    />
                  )}
                </div>

                {selected.tools.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-500">
                    This employee hasn't added any personal tools yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {visibleTools.map((tool) => {
                          const img = primaryImage(tool)
                          const isLent = tool.holder_type === 'lent'
                          return (
                            <tr key={tool.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => openModal(tool)}
                                  className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border"
                                  title="View photos"
                                >
                                  {img ? (
                                    <img
                                      src={img.thumb_url || img.image_url}
                                      alt={tool.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span className="text-xs text-gray-400">No photo</span>
                                  )}
                                </button>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">#{tool.number}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{tool.name}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {isLent ? (
                                  <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                    Lent to {tool.lent_to_name}
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                    In possession
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {new Date(tool.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => openModal(tool)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                        {visibleTools.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                              No tools match your search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tool detail modal (view-only) */}
      {modalTool && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setModalTool(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <div className="text-xs font-semibold text-blue-600">#{modalTool.number}</div>
                <h3 className="text-lg font-bold text-gray-900">{modalTool.name}</h3>
              </div>
              <button
                onClick={() => setModalTool(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-5">
              {modalTool.images && modalTool.images.length > 0 ? (
                <>
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={modalTool.images[modalPhotoIdx]?.image_url}
                      alt={modalTool.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {modalTool.images.length > 1 ? (
                      <div className="flex gap-2 flex-wrap">
                        {modalTool.images.map((img, idx) => (
                          <button
                            key={img.id}
                            onClick={() => setModalPhotoIdx(idx)}
                            className={`w-16 h-16 rounded-md overflow-hidden border-2 ${
                              idx === modalPhotoIdx ? 'border-blue-500' : 'border-transparent'
                            }`}
                          >
                            <img
                              src={img.thumb_url || img.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    ) : <span />}
                    <a
                      href={modalTool.images[modalPhotoIdx]?.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5m0 0v5m0-5L10 14M9 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-3" />
                      </svg>
                      View fullscreen
                    </a>
                  </div>
                </>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-400">
                  No photos
                </div>
              )}

              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Owner</dt>
                  <dd className="text-gray-900 font-medium">{selected?.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Added</dt>
                  <dd className="text-gray-900">{new Date(modalTool.created_at).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Status</dt>
                  <dd className="text-gray-900 font-medium">
                    {modalTool.holder_type === 'lent'
                      ? `Lent to ${modalTool.lent_to_name}`
                      : 'In employee\u2019s possession'}
                  </dd>
                </div>
                {modalTool.holder_type === 'lent' && modalTool.lent_location && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Location</dt>
                    <dd className="text-gray-900">{modalTool.lent_location}</dd>
                  </div>
                )}
                {modalTool.holder_type === 'lent' && modalTool.lent_at && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Lent since</dt>
                    <dd className="text-gray-900">{new Date(modalTool.lent_at).toLocaleDateString()}</dd>
                  </div>
                )}
              </dl>

              <p className="mt-4 text-xs text-gray-400">
                This is the employee's personal property record. It is read-only for administrators.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
