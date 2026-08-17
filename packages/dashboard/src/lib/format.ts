/** Shared display formatters — single source of truth for time/geo strings. */

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function timeAgoDetailed(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m ago`
}

/** [lng, lat] GeoJSON -> "21.6418° N, 79.5321° E" */
export function formatCoords([lng, lat]: [number, number], digits = 4): string {
  return `${lat.toFixed(digits)}° N, ${lng.toFixed(digits)}° E`
}

export function shortId(id: string): string {
  return id.length > 10 ? id.slice(-6) : id
}

export function durationBetween(fromIso: string, toIso: string): string {
  const mins = Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000))
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}
