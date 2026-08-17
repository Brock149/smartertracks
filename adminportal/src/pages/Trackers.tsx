import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { computeStops } from '../components/trackerMapUtils'
import { searchTools } from '../lib/toolSearch'

// Leaflet touches `window` at import time, which crashes the SSR/prerender
// build. Loading the map lazily keeps it in a client-only chunk that the
// server bundle never evaluates.
const TrackerMap = lazy(() => import('../components/TrackerMap'))

interface PoolTracker {
  serial: string
  label: string | null
  assigned_at: string | null
  last_seen_at: string | null
  company_number: number | null
}

interface Tool {
  id: string
  number: string
  name: string
  created_at: string | null
  tracker_required: boolean
  last_latitude: number | null
  last_longitude: number | null
  last_location_recorded_at: string | null
  last_location_updated_at: string | null
  last_location_serial: string | null
  last_battery: number | null
}

type SortMode = 'number' | 'name_asc' | 'name_desc' | 'newest' | 'oldest'
type TrailUnit = 'hours' | 'days'

const TRAIL_PRESETS = [
  { v: 6, label: '6h' },
  { v: 24, label: '24h' },
  { v: 168, label: '7d' },
  { v: 720, label: '30d' },
  { v: 0, label: 'All' },
] as const

const TRAIL_PRESET_HOURS = new Set<number>(TRAIL_PRESETS.map((p) => p.v))

function formatTrailHours(hours: number): string {
  if (hours > 0 && hours % 24 === 0) {
    const days = hours / 24
    return `${days}d`
  }
  return `${hours}h`
}

interface ActiveAssignment {
  tool_id: string
  serial: string
  mount_type: 'temporary' | 'permanent'
}

interface MapTool {
  tool_id: string
  number: string
  name: string
  latitude: number
  longitude: number
  recorded_at: string | null
  serial: string | null
  mount_type: 'temporary' | 'permanent' | null
  battery: number | null
  thumb_url: string | null
}

export default function Trackers() {
  const [pool, setPool] = useState<PoolTracker[]>([])
  // Default list = tools that already have a tracker. Search loads matching
  // tools on demand (no full-catalog download).
  const [tools, setTools] = useState<Tool[]>([])
  const [searchHitTools, setSearchHitTools] = useState<Tool[]>([])
  const [assignments, setAssignments] = useState<Record<string, ActiveAssignment>>({})
  const [mapTools, setMapTools] = useState<MapTool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [mapTool, setMapTool] = useState<
    { tool_id: string; name: string; lat: number; lng: number; sublabel: string; thumbUrl?: string | null } | null
  >(null)
  const [trail, setTrail] = useState<{ lat: number; lng: number; at: string | null }[]>([])
  const [trailHours, setTrailHours] = useState<number>(24)
  const [customTrailOpen, setCustomTrailOpen] = useState(false)
  const [customTrailAmount, setCustomTrailAmount] = useState('2')
  const [customTrailUnit, setCustomTrailUnit] = useState<TrailUnit>('days')
  const [trailLoading, setTrailLoading] = useState(false)
  const [replayIndex, setReplayIndex] = useState<number | null>(null)
  const [replaying, setReplaying] = useState(false)
  const [liveMapFull, setLiveMapFull] = useState(false)

  // Tracker editor modal: the tool being edited + the tracker chosen to attach.
  const [editTool, setEditTool] = useState<Tool | null>(null)
  const [editSerial, setEditSerial] = useState('')
  const [editSearch, setEditSearch] = useState('')
  // Friendly per-company number for every active company tracker, keyed by serial.
  const [trackerNumbers, setTrackerNumbers] = useState<Record<string, number>>({})

  // Search + sort over the tools list.
  const [searchTerm, setSearchTerm] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('number')

  const TOOL_SELECT =
    'id, number, name, created_at, tracker_required, last_latitude, last_longitude, last_location_recorded_at, last_location_updated_at, last_location_serial, last_battery'

  const fetchAll = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError('')
      const [poolRes, assignRes, mapRes, numbersRes] = await Promise.all([
        supabase.rpc('company_tracker_pool'),
        supabase
          .from('tracker_tool_assignments')
          .select('tool_id, serial, mount_type')
          .is('detached_at', null),
        supabase.rpc('company_tracked_tools_map'),
        supabase
          .from('tracker_company_assignments')
          .select('serial, company_number')
          .is('released_at', null),
      ])
      if (poolRes.error) throw poolRes.error
      if (assignRes.error) throw assignRes.error
      if (mapRes.error) throw mapRes.error

      const map: Record<string, ActiveAssignment> = {}
      for (const a of assignRes.data || []) map[a.tool_id] = a as ActiveAssignment
      setAssignments(map)

      const assignedIds = Object.keys(map)
      let loadedTools: Tool[] = []
      if (assignedIds.length > 0) {
        const toolsRes = await supabase
          .from('tools')
          .select(TOOL_SELECT)
          .eq('is_deleted', false)
          .in('id', assignedIds)
          .order('number_numeric', { ascending: true })
        if (toolsRes.error) throw toolsRes.error
        loadedTools = (toolsRes.data || []) as Tool[]
      }
      setTools(loadedTools)
      setPool(poolRes.data || [])
      setMapTools(mapRes.data || [])
      const numMap: Record<string, number> = {}
      for (const r of numbersRes.data || []) {
        if (r.company_number != null) numMap[r.serial] = r.company_number
      }
      setTrackerNumbers(numMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trackers')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // Background auto-refresh so the live map stays current without a reload.
    const id = setInterval(() => fetchAll(true), 60000)
    return () => clearInterval(id)
  }, [])

  const handleAttach = async (toolId: string, serial: string) => {
    if (!serial) {
      setMessage('Pick a tracker to attach.')
      return
    }
    try {
      setBusy(true)
      setMessage('')
      // mount_type is intentionally omitted — the RPC defaults it; we no longer
      // surface a temporary/permanent distinction.
      const { error } = await supabase.rpc('attach_tracker_to_tool', {
        p_serial: serial,
        p_tool_id: toolId,
      })
      if (error) throw error
      setMessage(`Attached ${serial}.`)
      setEditTool(null)
      setEditSerial('')
      await fetchAll()
    } catch (err) {
      setMessage(err instanceof Error ? `Error: ${err.message}` : 'Failed to attach')
    } finally {
      setBusy(false)
    }
  }

  const handleDetach = async (toolId: string, serial: string) => {
    if (!confirm(`Detach tracker ${serial} from this tool? It returns to your company's pool.`)) return
    try {
      setBusy(true)
      setMessage('')
      const { error } = await supabase.rpc('detach_tracker_from_tool', { p_tool_id: toolId })
      if (error) throw error
      setMessage(`Detached ${serial}.`)
      setEditTool(null)
      await fetchAll()
    } catch (err) {
      setMessage(err instanceof Error ? `Error: ${err.message}` : 'Failed to detach')
    } finally {
      setBusy(false)
    }
  }

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : '—')
  const battStr = (v: number | null | undefined) =>
    v == null ? '' : `${v.toFixed(2)}V`

  // Friendly tracker name: "Tracker N" when the company has numbered it, else
  // the label, else the raw serial.
  const trackerName = (serial: string, label?: string | null): string => {
    const n = trackerNumbers[serial]
    if (n != null) return `Tracker ${n}`
    return label || serial
  }

  // Open the breadcrumb/trip-history modal for a tool by id (used from map pins).
  const openTripHistory = (toolId: string) => {
    const m = mapTools.find((t) => t.tool_id === toolId)
    if (m) {
      setMapTool({
        tool_id: m.tool_id,
        name: m.name,
        lat: m.latitude,
        lng: m.longitude,
        sublabel: `Last fix ${fmt(m.recorded_at)}`,
        thumbUrl: m.thumb_url,
      })
      return
    }
    const t = tools.find((x) => x.id === toolId)
    if (t && t.last_latitude != null && t.last_longitude != null) {
      setMapTool({
        tool_id: t.id,
        name: t.name,
        lat: t.last_latitude,
        lng: t.last_longitude,
        sublabel: `Last fix ${fmt(t.last_location_recorded_at)}`,
      })
    }
  }

  // Relative "last seen" + a freshness bucket. Yabby Edge units often report
  // ~once/day, so the buckets are generous: within ~26h = live, within 3d =
  // delayed, older = offline.
  const relativeTime = (d: string | null): string => {
    if (!d) return 'never'
    const ms = Date.now() - new Date(d).getTime()
    const min = Math.floor(ms / 60000)
    if (min < 1) return 'just now'
    if (min < 60) return `${min}m ago`
    const h = Math.floor(min / 60)
    if (h < 48) return `${h}h ago`
    const days = Math.floor(h / 24)
    return `${days}d ago`
  }
  const freshness = (d: string | null): { label: string; color: string } => {
    if (!d) return { label: 'No fix', color: '#9ca3af' }
    const h = (Date.now() - new Date(d).getTime()) / 3600_000
    if (h <= 26) return { label: 'Live', color: '#16a34a' }
    if (h <= 72) return { label: 'Delayed', color: '#f59e0b' }
    return { label: 'Offline', color: '#9ca3af' }
  }

  const isCustomTrail = trailHours > 0 && !TRAIL_PRESET_HOURS.has(trailHours)

  const applyCustomTrail = () => {
    const amount = Number(customTrailAmount)
    if (!Number.isFinite(amount) || amount <= 0) return
    const maxAmount = customTrailUnit === 'days' ? 365 : 8760
    const clamped = Math.min(amount, maxAmount)
    const hours = customTrailUnit === 'days' ? clamped * 24 : clamped
    setTrailHours(hours)
    setCustomTrailOpen(false)
  }

  const openCustomTrail = () => {
    if (!customTrailOpen) {
      if (trailHours > 0 && trailHours % 24 === 0) {
        setCustomTrailAmount(String(trailHours / 24))
        setCustomTrailUnit('days')
      } else if (trailHours > 0) {
        setCustomTrailAmount(String(trailHours))
        setCustomTrailUnit('hours')
      } else {
        setCustomTrailAmount('2')
        setCustomTrailUnit('days')
      }
    }
    setCustomTrailOpen((open) => !open)
  }

  // Load the breadcrumb trail whenever a tool's map is opened or the range
  // changes. trailHours = 0 means "all history".
  useEffect(() => {
    if (!mapTool) {
      setTrail([])
      setCustomTrailOpen(false)
      return
    }
    let active = true
    ;(async () => {
      try {
        setTrailLoading(true)
        const since =
          trailHours > 0 ? new Date(Date.now() - trailHours * 3600_000).toISOString() : null
        const { data, error } = await supabase.rpc('tool_breadcrumb', {
          p_tool_id: mapTool.tool_id,
          p_since: since,
        })
        if (error) throw error
        if (active) {
          setTrail(
            (data || []).map((p: any) => ({
              lat: p.latitude,
              lng: p.longitude,
              at: p.recorded_at ?? null,
            }))
          )
        }
      } catch {
        if (active) setTrail([])
      } finally {
        if (active) setTrailLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [mapTool, trailHours])

  // Reset the replay scrubber whenever the trail or modal changes.
  useEffect(() => {
    setReplayIndex(null)
    setReplaying(false)
  }, [mapTool, trailHours, trail.length])

  // Advance the replay marker while playing.
  useEffect(() => {
    if (!replaying || trail.length < 2) return
    const timer = setInterval(() => {
      setReplayIndex((prev) => {
        const next = (prev == null ? -1 : prev) + 1
        if (next >= trail.length) {
          setReplaying(false)
          return trail.length - 1
        }
        return next
      })
    }, 600)
    return () => clearInterval(timer)
  }, [replaying, trail.length])

  useEffect(() => {
    if (!mapTool && !liveMapFull) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mapTool, liveMapFull])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => {
      if (mq.matches) setLiveMapFull(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Deduped stops along the trail, shared with the map so the timeline ticks
  // line up with the on-map stop dots.
  const stops = useMemo(() => computeStops(trail), [trail])
  const fmtStop = (d: string | null) => (d ? new Date(d).toLocaleString() : '—')

  useEffect(() => {
    const term = searchTerm.trim()
    if (!term) {
      setSearchHitTools([])
      setSearchLoading(false)
      return
    }
    let cancelled = false
    setSearchLoading(true)
    const handle = setTimeout(async () => {
      try {
        const results = await searchTools({ q: term, limit: 100, scope: 'company' })
        if (cancelled) return
        const ids = results.map((r) => r.id)
        if (ids.length === 0) {
          setSearchHitTools([])
          return
        }
        const { data, error } = await supabase
          .from('tools')
          .select(TOOL_SELECT)
          .eq('is_deleted', false)
          .in('id', ids)
        if (error) throw error
        if (!cancelled) setSearchHitTools((data || []) as Tool[])
      } catch (err) {
        console.error('Trackers tool search failed', err)
        if (!cancelled) setSearchHitTools([])
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [searchTerm])

  // Default: tools that already have a tracker. With a search term: remote
  // matches + any assigned tool whose tracker serial/label matches.
  const visibleTools = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    let filtered: Tool[]
    if (!term) {
      filtered = tools
    } else {
      const byId = new Map<string, Tool>()
      for (const t of searchHitTools) byId.set(t.id, t)
      for (const t of tools) {
        const a = assignments[t.id]
        const trackerLabel = a ? trackerName(a.serial).toLowerCase() : ''
        const matchesTracker =
          (a?.serial || '').toLowerCase().includes(term) || trackerLabel.includes(term)
        if (matchesTracker) byId.set(t.id, t)
      }
      filtered = [...byId.values()]
    }

    const byNumber = (a: Tool, b: Tool) => {
      const an = parseInt(String(a.number), 10)
      const bn = parseInt(String(b.number), 10)
      if (Number.isNaN(an) && Number.isNaN(bn)) return String(a.number).localeCompare(String(b.number))
      if (Number.isNaN(an)) return 1
      if (Number.isNaN(bn)) return -1
      return an - bn
    }
    const byName = (a: Tool, b: Tool) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    const time = (t: Tool) => (t.created_at ? new Date(t.created_at).getTime() : 0)

    const bySortMode = (a: Tool, b: Tool) => {
      switch (sortMode) {
        case 'name_asc':
          return byName(a, b) || byNumber(a, b)
        case 'name_desc':
          return byName(b, a) || byNumber(a, b)
        case 'newest':
          return time(b) - time(a) || byNumber(a, b)
        case 'oldest':
          return time(a) - time(b) || byNumber(a, b)
        default:
          return byNumber(a, b)
      }
    }

    // Tools with a tracker attached always sort ahead of tools without one —
    // otherwise search hits without trackers bury the ones you're managing.
    return [...filtered].sort((a, b) => {
      const aTracked = assignments[a.id] ? 1 : 0
      const bTracked = assignments[b.id] ? 1 : 0
      if (aTracked !== bTracked) return bTracked - aTracked
      return bySortMode(a, b)
    })
  }, [tools, searchHitTools, assignments, searchTerm, sortMode, trackerNumbers])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">GPS Trackers</h2>
        <p className="text-gray-500 text-sm mt-1">
          Attach trackers your company owns to specific tools. Trackers are assigned to your company
          by Smarter Tracks; here you decide which tool each one rides with.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
      {message && (
        <div
          className={`px-4 py-3 rounded border ${
            message.startsWith('Error')
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}
        >
          {message}
        </div>
      )}

      {/* Two-column layout: list on the left, live map on the right (PC).
          On mobile the map is forced to the top so you don't have to scroll
          past the whole tools list to reach it. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column: pool + tools list */}
        <div className="space-y-6 order-2 lg:order-1">

      {/* Company pool */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Available trackers ({pool.length})
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Trackers assigned to your company that aren't attached to a tool yet.
        </p>
        {pool.length === 0 ? (
          <p className="text-sm text-gray-500">
            No available trackers. Contact Smarter Tracks if you expect trackers here.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pool.map((p) => (
              <span
                key={p.serial}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-sm border border-blue-200"
                title={`Serial ${p.serial} · Last seen ${fmt(p.last_seen_at)}`}
              >
                📍 {trackerName(p.serial, p.label)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tools — search + sort controls, then a clean assignment list */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {searchTerm.trim()
                ? `Search results (${visibleTools.length})`
                : `Tools with trackers (${visibleTools.length})`}
            </h3>
          </div>
          <input
            type="text"
            placeholder="Search any tool by name or number to attach a tracker…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Sort by:</span>
            <div className="inline-flex rounded-md shadow-sm overflow-hidden border border-gray-200">
              {([
                { key: 'number', label: 'Number' },
                { key: 'name_asc', label: 'Name A–Z' },
                { key: 'name_desc', label: 'Name Z–A' },
                { key: 'newest', label: 'Newest' },
                { key: 'oldest', label: 'Oldest' },
              ] as { key: SortMode; label: string }[]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSortMode(opt.key)}
                  className={`px-3 py-1 text-xs font-medium border-l first:border-l-0 border-gray-200 ${
                    sortMode === opt.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {searchLoading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Searching…</div>
          ) : visibleTools.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              {searchTerm.trim()
                ? 'No tools match your search.'
                : 'No tools have a tracker yet. Search above to find a tool and attach one.'}
            </div>
          ) : (
            visibleTools.map((tool) => {
              const a = assignments[tool.id]
              const hasLoc = tool.last_latitude != null && tool.last_longitude != null
              return (
                <div key={tool.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  {/* Left: tool identity */}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{tool.name}</div>
                    <div className="text-xs text-gray-500">#{tool.number}</div>
                  </div>

                  {/* Right: current status + actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {a ? (
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 flex items-center justify-end gap-1.5">
                          <span>📡</span>
                          <span className="truncate max-w-[140px]" title={`Serial ${a.serial}`}>
                            {trackerName(a.serial)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center justify-end gap-2">
                          {hasLoc ? (
                            <span
                              className="inline-flex items-center gap-1"
                              title={`Last fix ${fmt(tool.last_location_recorded_at)}`}
                            >
                              <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{ backgroundColor: freshness(tool.last_location_recorded_at).color }}
                              />
                              {relativeTime(tool.last_location_recorded_at)}
                            </span>
                          ) : (
                            <span>No fix yet</span>
                          )}
                          {tool.last_battery != null && <span>🔋 {battStr(tool.last_battery)}</span>}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No tracker attached</span>
                    )}

                    {hasLoc && (
                      <button
                        onClick={() => openTripHistory(tool.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                        title="See breadcrumb trip history"
                      >
                        🧭 Trip history
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditTool(tool)
                        setEditSerial('')
                        setEditSearch('')
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
                        a
                          ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                          : 'border-blue-600 text-white bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {a ? 'Manage' : 'Attach'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

        </div>
        {/* End left column */}

        {/* Right column: live fleet map (sticky + tall on PC, compact on mobile) */}
        <div
          className={
            liveMapFull
              ? 'fixed inset-0 z-[10000] bg-white flex flex-col'
              : 'border border-gray-200 rounded-lg p-4 order-1 lg:order-2 lg:sticky lg:top-4'
          }
        >
          <div className={`flex items-start justify-between gap-3 ${liveMapFull ? 'px-4 py-3 border-b shrink-0' : ''}`}>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Live map ({mapTools.length})
              </h3>
              {!liveMapFull && (
                <p className="text-sm text-gray-500 mb-3">
                  Every tool with an attached tracker that has reported a position.
                  {mapTools.length === 0 && ' No tracked tools have reported a position yet.'}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLiveMapFull((open) => !open)}
              className={`${liveMapFull ? '' : 'lg:hidden'} shrink-0 px-3 py-1.5 rounded-md text-sm font-semibold border border-gray-300 bg-white text-gray-800 hover:bg-gray-50`}
            >
              {liveMapFull ? 'Close' : 'Full screen'}
            </button>
          </div>
          <div
            className={liveMapFull ? 'flex-1 min-h-0' : 'h-[280px] lg:h-[calc(100vh-220px)] lg:min-h-[480px]'}
          >
            <Suspense fallback={<div className="h-full w-full bg-gray-100 animate-pulse rounded" />}>
            <TrackerMap
              height="100%"
              layoutKey={liveMapFull ? 'live-full' : 'live-card'}
              onTripHistory={(toolId) => {
                setLiveMapFull(false)
                openTripHistory(toolId)
              }}
              markers={mapTools.map((m) => ({
                lat: m.latitude,
                lng: m.longitude,
                toolId: m.tool_id,
                thumbUrl: m.thumb_url,
                title: m.name,
                label: `#${m.number} ${m.name}`,
                sublabel: `${freshness(m.recorded_at).label} · ${relativeTime(
                  m.recorded_at
                )}${m.serial ? ` · ${m.serial}` : ''}${
                  m.battery != null ? ` · 🔋 ${battStr(m.battery)}` : ''
                }`,
              }))}
            />
            </Suspense>
          </div>
        </div>
      </div>
      {/* End two-column layout */}

      {/* Tracker editor modal — attach or detach a tool's tracker */}
      {editTool && (() => {
        const a = assignments[editTool.id]
        return (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-[10000] flex items-center justify-center p-4"
            onClick={() => setEditTool(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{editTool.name}</div>
                  <div className="text-xs text-gray-500">#{editTool.number}</div>
                </div>
                <button
                  onClick={() => setEditTool(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                {a ? (
                  <>
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Tracker attached
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <span>📡</span>
                        <span>{trackerName(a.serial)}</span>
                        <span className="text-xs font-normal text-gray-400">({a.serial})</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Detaching returns this tracker to your company's pool and records it in the
                      tool's transaction history.
                    </p>
                    <button
                      onClick={() => handleDetach(editTool.id, a.serial)}
                      disabled={busy}
                      className="w-full px-4 py-2.5 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Detach tracker
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Attach a tracker
                      </label>
                      {pool.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          No trackers available. Contact Smarter Tracks if you expect trackers here.
                        </p>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={editSearch}
                            onChange={(e) => {
                              setEditSearch(e.target.value)
                              setEditSerial('')
                            }}
                            placeholder="Search trackers by number or serial…"
                            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="mt-2 max-h-56 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
                            {pool
                              .filter((p) => {
                                const t = editSearch.trim().toLowerCase()
                                if (!t) return true
                                return (
                                  trackerName(p.serial, p.label).toLowerCase().includes(t) ||
                                  p.serial.toLowerCase().includes(t) ||
                                  (p.label || '').toLowerCase().includes(t)
                                )
                              })
                              .map((p) => {
                                const selected = editSerial === p.serial
                                return (
                                  <button
                                    key={p.serial}
                                    type="button"
                                    onClick={() => setEditSerial(p.serial)}
                                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 ${
                                      selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    <span className="text-sm font-medium text-gray-900">
                                      {trackerName(p.serial, p.label)}
                                    </span>
                                    <span className="text-xs text-gray-400">{p.serial}</span>
                                  </button>
                                )
                              })}
                            {pool.filter((p) => {
                              const t = editSearch.trim().toLowerCase()
                              if (!t) return true
                              return (
                                trackerName(p.serial, p.label).toLowerCase().includes(t) ||
                                p.serial.toLowerCase().includes(t) ||
                                (p.label || '').toLowerCase().includes(t)
                              )
                            }).length === 0 && (
                              <div className="px-3 py-3 text-sm text-gray-400">No matches.</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Attaching tags this tool's GPS location and records it in the tool's
                      transaction history. Only an admin can detach it.
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditTool(null)}
                        className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAttach(editTool.id, editSerial)}
                        disabled={busy || !editSerial}
                        className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Attach
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Map preview modal */}
      {mapTool && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-stretch sm:items-center justify-center sm:p-4"
          onClick={() => setMapTool(null)}
        >
          <div
            className="bg-white shadow-xl w-full max-w-6xl h-[100dvh] sm:h-[92vh] sm:max-h-[92vh] sm:rounded-lg flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative z-20 flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 truncate text-sm">{mapTool.name}</div>
                <div className="text-xs text-gray-500 truncate">{mapTool.sublabel}</div>
              </div>
              <button
                onClick={() => setMapTool(null)}
                className="ml-3 shrink-0 px-3 py-2 rounded-md text-sm font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
            {/* Everything below fits within the modal's max-height at once —
                no internal scrolling — by giving the map a flexible height
                (flex-1) that absorbs whatever space the fixed-height rows
                above/below it don't use, instead of a fixed vh that could
                push the replay controls off-screen on short viewports. */}
            {/* Prominent trail-range selector */}
            <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-blue-50 border-b border-blue-100 shrink-0">
              <span className="text-xs font-semibold text-gray-700 mr-1">Trail range:</span>
              {TRAIL_PRESETS.map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => {
                    setTrailHours(opt.v)
                    setCustomTrailOpen(false)
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    !isCustomTrail && trailHours === opt.v
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={openCustomTrail}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  isCustomTrail || customTrailOpen
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {isCustomTrail ? formatTrailHours(trailHours) : 'Custom'}
              </button>
              {customTrailOpen && (
                <form
                  className="flex flex-wrap items-center gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    applyCustomTrail()
                  }}
                >
                  <input
                    type="number"
                    min={1}
                    max={customTrailUnit === 'days' ? 365 : 8760}
                    step={1}
                    value={customTrailAmount}
                    onChange={(e) => setCustomTrailAmount(e.target.value)}
                    className="w-16 px-2 py-1 rounded-md border border-gray-300 text-xs font-semibold text-gray-900"
                    aria-label="Custom trail range amount"
                    autoFocus
                  />
                  <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCustomTrailUnit('hours')}
                      className={`px-2 py-1 text-xs font-semibold ${
                        customTrailUnit === 'hours'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Hours
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomTrailUnit('days')}
                      className={`px-2 py-1 text-xs font-semibold border-l border-gray-300 ${
                        customTrailUnit === 'days'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Days
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Apply
                  </button>
                </form>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-1 bg-gray-50 border-b shrink-0">
              {trail.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-600 shrink-0" />
                  <div className="leading-tight">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">Trip start</div>
                    <div className="text-xs font-bold text-gray-900">{fmtStop(trail[0].at)}</div>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-gray-500">
                  {trailLoading ? 'Loading trail…' : 'No movement recorded in this range'}
                </span>
              )}
              {trail.length > 1 && (
                <div className="flex items-center gap-1.5 text-right">
                  <div className="leading-tight">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">Trip end</div>
                    <div className="text-xs font-bold text-gray-900">
                      {fmtStop(trail[trail.length - 1].at)}
                    </div>
                  </div>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0">
            <Suspense fallback={<div className="w-full h-full bg-gray-100 animate-pulse" />}>
            <TrackerMap
              height="100%"
              layoutKey={mapTool.tool_id}
              path={trail}
              replayIndex={replayIndex}
              markers={
                replayIndex != null
                  ? []
                  : [
                      {
                        lat: mapTool.lat,
                        lng: mapTool.lng,
                        title: mapTool.name,
                        label: mapTool.name,
                        sublabel: mapTool.sublabel,
                        thumbUrl: mapTool.thumbUrl,
                    },
                  ]
              }
            />
            </Suspense>
            </div>
            {trail.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t shrink-0">
                <button
                  onClick={() => {
                    if (replaying) {
                      setReplaying(false)
                    } else {
                      if (replayIndex == null || replayIndex >= trail.length - 1) {
                        setReplayIndex(0)
                      }
                      setReplaying(true)
                    }
                  }}
                  className="px-3 py-1 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shrink-0"
                >
                  {replaying ? '⏸ Pause' : '▶ Replay'}
                </button>
                <div className="relative flex-1 min-w-[140px]">
                  {/* Clickable stop ticks: jump the scrubber straight to a stop. */}
                  <div className="absolute inset-x-0 -top-1.5 h-3 pointer-events-none">
                    {stops.map((s, i) => {
                      const pct = (s.index / (trail.length - 1)) * 100
                      return (
                        <button
                          key={`tick-${i}`}
                          onClick={() => {
                            setReplaying(false)
                            setReplayIndex(s.index)
                          }}
                          title={`${fmtStop(s.from)}${s.count > 1 ? ` – ${fmtStop(s.to)}` : ''}`}
                          className="absolute w-2 h-2 -ml-1 rounded-full border border-white pointer-events-auto hover:scale-150 transition-transform"
                          style={{
                            left: `${pct}%`,
                            backgroundColor:
                              i === 0 ? '#16a34a' : i === stops.length - 1 ? '#dc2626' : '#2563eb',
                          }}
                        />
                      )
                    })}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={trail.length - 1}
                    value={replayIndex ?? 0}
                    onChange={(e) => {
                      setReplaying(false)
                      setReplayIndex(Number(e.target.value))
                    }}
                    className="w-full"
                  />
                </div>
                <span className="text-xs text-gray-600 text-right tabular-nums shrink-0">
                  {replayIndex != null && trail[replayIndex]?.at
                    ? new Date(trail[replayIndex].at as string).toLocaleString()
                    : `${trail.length} points`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
