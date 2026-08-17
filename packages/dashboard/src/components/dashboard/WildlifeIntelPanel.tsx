/**
 * Wildlife movement intelligence (spec #11) — per-species movement, heading,
 * speed, activity level and behaviour anomalies derived from animal alerts.
 */

import { useMemo } from 'react'
import { PawPrint, Navigation, Gauge, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/format'
import { useAlerts } from '@/hooks/useLiveData'
import { deriveWildlifeTracks, type WildlifeTrack } from '@/services/intel'

const ACTIVITY_COLOR = { LOW: '#3B82F6', MODERATE: '#F59E0B', HIGH: '#EF4444' } as const

export function WildlifeIntelPanel({ className }: { className?: string }) {
  const { alerts } = useAlerts()
  const tracks = useMemo(() => deriveWildlifeTracks(alerts), [alerts])

  return (
    <div className={cn('rounded-xl border border-white/5 bg-slate-surface p-4 shadow-lg shadow-black/20', className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-text">
          <PawPrint className="h-4 w-4 text-forest-light" />
          Wildlife Movement
        </h3>
        <span className="text-[10px] text-slate-muted">
          {tracks.length} tracked species
        </span>
      </div>

      {tracks.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-muted">
          No animal detections yet — movement tracking starts with the first wildlife alert.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tracks.slice(0, 5).map((t) => (
            <TrackRow key={t.species} track={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function TrackRow({ track }: { track: WildlifeTrack }) {
  const activityColor = ACTIVITY_COLOR[track.activity]
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-text">{track.species}</span>
          <span className="text-[10px] text-slate-muted">
            {track.count} detection{track.count !== 1 ? 's' : ''} · {relativeTime(track.lastSeen)}
          </span>
        </div>
        <span
          className="rounded border px-1.5 py-0.5 text-[9px] font-bold"
          style={{ color: activityColor, borderColor: `${activityColor}55`, background: `${activityColor}14` }}
        >
          {track.activity}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
        <span className="flex items-center gap-1 text-slate-muted">
          <Navigation size={10} className="text-slate-muted/70" />
          {track.movementKm.toFixed(1)} km · {track.heading}
        </span>
        <span className="flex items-center gap-1 text-slate-muted">
          <Gauge size={10} className="text-slate-muted/70" />
          {track.speedKmh.toFixed(1)} km/h
        </span>
        <span className="text-right tabular-nums text-slate-muted">
          {track.lat.toFixed(4)}, {track.lng.toFixed(4)}
        </span>
      </div>

      {track.anomaly && track.anomalyReason && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] text-amber-300">
          <TriangleAlert size={11} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-bold">Behavior anomaly: YES</span> — {track.anomalyReason}
          </span>
        </div>
      )}
    </div>
  )
}
