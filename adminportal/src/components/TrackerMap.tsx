import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { computeStops } from './trackerMapUtils'
import type { TrackerMapMarker, TrackerMapPoint, TrackerMapStop } from './trackerMapUtils'

export type { TrackerMapMarker, TrackerMapPoint, TrackerMapStop } from './trackerMapUtils'
export { computeStops } from './trackerMapUtils'

interface TrackerMapProps {
  markers: TrackerMapMarker[]
  /** Optional breadcrumb trail drawn as a polyline (chronological order). */
  path?: TrackerMapPoint[]
  /** When set, highlights this trail index (replay scrubber position). */
  replayIndex?: number | null
  height?: number | string
  /** Override the auto-zoom (defaults to 15 for one point, fit-bounds for many). */
  zoom?: number
  className?: string
  /** Called from a pin popup's "See trip history" button (marker.toolId). */
  onTripHistory?: (toolId: string) => void
}

function fmtTime(at?: string | null): string {
  if (!at) return ''
  const d = new Date(at)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// A round thumbnail pin with a name pill and pointer tail (Life360-style).
const PIN = 64 // circle diameter in px
const ICON_W = 180 // icon box width; content is centered so the anchor is exact
function buildIcon(marker: TrackerMapMarker): L.DivIcon {
  const inner = marker.thumbUrl
    ? `<img src="${marker.thumbUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;">📍</div>`
  const titleRaw = (marker.title || marker.label || '').trim()
  const title =
    titleRaw.length > 14 ? `${titleRaw.slice(0, 13)}…` : titleRaw
  const pill = title
    ? `<div style="max-width:170px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                   background:#1f2937;color:#fff;font-size:14px;font-weight:700;line-height:1.1;
                   padding:4px 9px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.35);
                   margin-bottom:4px;">${title}</div>`
    : ''
  const tail = 10 // pointer tail height; the very tip is the geographic point
  const totalH = (title ? 26 : 0) + PIN + tail
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;width:${ICON_W}px;">
      ${pill}
      <div style="position:relative;width:${PIN}px;height:${PIN}px;">
        <div style="width:${PIN}px;height:${PIN}px;border-radius:50%;background:#fff;border:3px solid #2563eb;
                    box-shadow:0 1px 5px rgba(0,0,0,.45);overflow:hidden;">${inner}</div>
        <div style="position:absolute;left:50%;bottom:-${tail}px;transform:translateX(-50%);
                    width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;
                    border-top:${tail}px solid #2563eb;"></div>
      </div>
    </div>`
  return L.divIcon({
    html,
    className: 'tracker-pin',
    iconSize: [ICON_W, totalH],
    iconAnchor: [ICON_W / 2, totalH],
    popupAnchor: [0, -totalH],
  })
}

export default function TrackerMap({
  markers,
  path,
  replayIndex,
  height = 220,
  zoom,
  className,
  onTripHistory,
}: TrackerMapProps) {
  const valid = markers.filter(
    (m) => typeof m.lat === 'number' && typeof m.lng === 'number' && !isNaN(m.lat) && !isNaN(m.lng)
  )
  const trail = (path || []).filter(
    (p) => typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng)
  )

  const allPts: [number, number][] = [
    ...valid.map((m) => [m.lat, m.lng] as [number, number]),
    ...trail.map((p) => [p.lat, p.lng] as [number, number]),
  ]
  const hasPoints = allPts.length > 0
  // With no points yet, still show a real (empty) map centered on the
  // continental US zoomed out, rather than a blank placeholder.
  const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795]
  const center: [number, number] = hasPoints ? allPts[0] : DEFAULT_CENTER
  const bounds = allPts.length > 1 ? L.latLngBounds(allPts) : undefined
  const defaultZoom = hasPoints ? 15 : 4

  const stops = computeStops(trail)
  const stopLabel = (s: TrackerMapStop) => {
    const start = fmtTime(s.from)
    const end = fmtTime(s.to)
    if (s.count > 1 && start && end && start !== end) return `${start} – ${end}`
    return start || end
  }

  return (
    <div className={className} style={{ height, borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={zoom ?? defaultZoom}
        bounds={bounds}
        boundsOptions={{ padding: [40, 40] }}
        scrollWheelZoom
        // Stop users from zooming all the way out to the whole globe, which
        // makes Leaflet request hundreds of OSM tiles at once. OSM rate-limits
        // that burst and Chrome reports the aborted requests as
        // net::ERR_INTERNET_DISCONNECTED (most visible on throttled mobile).
        minZoom={3}
        maxZoom={19}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          // Throttle tile fetching so panning/zooming doesn't fire a burst of
          // requests: only load once movement settles and keep a small buffer.
          updateWhenIdle
          updateWhenZooming={false}
          keepBuffer={2}
          maxZoom={19}
        />
        {trail.length > 1 && (
          <Polyline
            positions={trail.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.75 }}
          />
        )}
        {/* Intermediate stops (same-location points already collapsed). Labels
            are hover-only so they never stack on top of each other — use the
            timeline ticks below the map to step through stops instead. */}
        {stops.length > 2 &&
          stops.slice(1, -1).map((s, i) => (
            <CircleMarker
              key={`stop-${i + 1}`}
              center={[s.lat, s.lng]}
              radius={s.count > 1 ? 6 : 4}
              pathOptions={{ color: '#2563eb', fillColor: '#fff', fillOpacity: 1, weight: 2 }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                {stopLabel(s)}
                {s.count > 1 ? ` (${s.count})` : ''}
              </Tooltip>
            </CircleMarker>
          ))}
        {stops.length > 0 && (
          <CircleMarker
            center={[stops[0].lat, stops[0].lng]}
            radius={7}
            pathOptions={{ color: '#fff', fillColor: '#16a34a', fillOpacity: 1, weight: 2 }}
          >
            <Tooltip direction="left">Trip start · {stopLabel(stops[0])}</Tooltip>
          </CircleMarker>
        )}
        {stops.length > 1 && (
          <CircleMarker
            center={[stops[stops.length - 1].lat, stops[stops.length - 1].lng]}
            radius={7}
            pathOptions={{ color: '#fff', fillColor: '#dc2626', fillOpacity: 1, weight: 2 }}
          >
            <Tooltip direction="right">Trip end · {stopLabel(stops[stops.length - 1])}</Tooltip>
          </CircleMarker>
        )}
        {/* Replay scrubber position. */}
        {replayIndex != null &&
          trail[replayIndex] &&
          (() => {
            const p = trail[replayIndex]
            return (
              <CircleMarker
                center={[p.lat, p.lng]}
                radius={16}
                pathOptions={{ color: '#fff', fillColor: '#f59e0b', fillOpacity: 1, weight: 4 }}
              >
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -14]}
                  className="replay-time-tooltip"
                >
                  {fmtTime(p.at)}
                </Tooltip>
              </CircleMarker>
            )
          })()}
        {valid.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]} icon={buildIcon(m)}>
            <Popup>
              <div style={{ fontSize: 13, textAlign: 'center' }}>
                {m.thumbUrl && (
                  <img
                    src={m.thumbUrl}
                    style={{
                      width: 192,
                      height: 192,
                      objectFit: 'cover',
                      borderRadius: 10,
                      display: 'block',
                      margin: '0 auto 8px',
                    }}
                  />
                )}
                {m.label && <div style={{ fontWeight: 600 }}>{m.label}</div>}
                {m.sublabel && <div style={{ color: '#6b7280' }}>{m.sublabel}</div>}
                {m.toolId && onTripHistory && (
                  <button
                    type="button"
                    onClick={() => onTripHistory(m.toolId as string)}
                    style={{
                      display: 'block',
                      width: '100%',
                      margin: '8px 0 6px',
                      padding: '6px 10px',
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🧭 See trip history
                  </button>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#2563eb' }}
                >
                  Get directions
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
