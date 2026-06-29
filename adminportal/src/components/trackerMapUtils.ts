export interface TrackerMapMarker {
  lat: number
  lng: number
  /** Optional tool/tracker thumbnail shown inside the pin (Life360 style). */
  thumbUrl?: string | null
  label?: string
  /** Optional secondary line in the popup (e.g. "last fix" time). */
  sublabel?: string
  /** Short name shown on a pill above the pin (truncated). */
  title?: string
  /** Tool id — enables the "See trip history" action in the pin popup. */
  toolId?: string
}

export interface TrackerMapPoint {
  lat: number
  lng: number
  /** ISO timestamp of when this point was recorded (enables time labels/replay). */
  at?: string | null
}

export interface TrackerMapStop {
  lat: number
  lng: number
  /** First/last timestamp the tool was at this spot. */
  from: string | null
  to: string | null
  /** How many raw trail points collapsed into this stop. */
  count: number
  /** Index of this stop's first point within the raw trail (for the replay scrubber). */
  index: number
}

// Collapse consecutive trail points that sit at (roughly) the same spot into a
// single "stop". A stationary tool reports the same coordinate over and over
// (with a few meters of GPS jitter), which otherwise piles dozens of
// overlapping markers/timestamps on one pixel. ~4 decimals ≈ 11m, enough to
// absorb jitter while keeping genuinely separate stops apart.
export function computeStops(trail: TrackerMapPoint[]): TrackerMapStop[] {
  const same = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
    Math.round(a.lat * 1e4) === Math.round(b.lat * 1e4) &&
    Math.round(a.lng * 1e4) === Math.round(b.lng * 1e4)
  const stops: TrackerMapStop[] = []
  trail.forEach((p, i) => {
    const last = stops[stops.length - 1]
    if (last && same(last, p)) {
      last.to = p.at ?? last.to
      last.count++
    } else {
      stops.push({ lat: p.lat, lng: p.lng, from: p.at ?? null, to: p.at ?? null, count: 1, index: i })
    }
  })
  return stops
}
