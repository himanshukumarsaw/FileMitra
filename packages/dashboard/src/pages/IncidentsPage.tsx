import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Crosshair,
  Flame,
  User,
  Car,
  Bug,
  Clock,
  Timer,
  ShieldCheck,
  ShieldAlert,
  Mic,
  Image,
  Siren,
  ThumbsDown,
} from 'lucide-react'
import type { Alert, AlertType, Dispatch } from '../../../shared/types'
import { useAlerts, useDispatches, useResponseStats } from '@/hooks/useLiveData'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<AlertType, typeof User> = {
  human: User,
  animal: Bug,
  vehicle: Car,
  fire: Flame,
}

const SEVERITY_COLORS: Record<Alert['severity'], string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
}

interface Incident {
  id: string
  alerts: Alert[]
  firstAt: Date
  lastAt: Date
  nodes: number
  severity: Alert['severity']
  types: AlertType[]
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m ago`
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(-6) : id
}

function IncidentCard({ incident, dispatch }: { incident: Incident; dispatch?: Dispatch }) {
  const color = SEVERITY_COLORS[incident.severity]
  const PrimaryIcon = TYPE_ICONS[incident.types[0]] ?? User

  return (
    <div className="rounded-xl border border-white/10 bg-slate-dark p-5 shadow-lg shadow-black/20">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: `${color}1f`, color }}
          >
            <PrimaryIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-slate-text">{incident.id}</span>
              <span
                className="rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                style={{ color, borderColor: `${color}55`, background: `${color}14` }}
              >
                {incident.severity}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-muted">
              <span className="capitalize">{incident.types.join(' + ')}</span>
              <span>·</span>
              <span>{incident.nodes} node{incident.nodes > 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{incident.alerts.length} alert{incident.alerts.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        {dispatch ? (
          <Link
            to="/dispatch"
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
              dispatch.status === 'resolved'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
            )}
            title="View in Response Center"
          >
            <Siren size={12} />
            {dispatch.status === 'resolved' ? 'Resolved' : `Response: ${dispatch.status}`}
          </Link>
        ) : (
          <span className="rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] text-slate-muted">
            No dispatch
          </span>
        )}
      </div>

      {/* Alert timeline */}
      <div className="flex flex-col">
        {incident.alerts.map((alert, i) => {
          const Icon = TYPE_ICONS[alert.type] ?? User
          const confirmed = alert.verificationStatus === 'confirmed'
          return (
            <div key={alert.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: i === 0 ? color : '#475569' }}
                />
                {i < incident.alerts.length - 1 && <span className="w-px flex-1 bg-slate-700/50" />}
              </div>
              <div className="min-w-0 flex-1 pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Icon size={13} className="shrink-0 text-slate-muted" />
                  <span className="text-xs font-medium capitalize text-slate-text">{alert.type}</span>
                  <span className="text-[10px] tabular-nums text-slate-muted">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-[10px] text-slate-muted/70">node {shortId(alert.nodeId)}</span>
                  {alert.verificationStatus && (
                    confirmed ? (
                      <span title="Confirmed"><ShieldCheck size={12} className="text-emerald-400" /></span>
                    ) : (
                      <span title="Suspicious — single node"><ShieldAlert size={12} className="text-amber-400" /></span>
                    )
                  )}
                  {alert.audioUrl && <span title="Audio evidence"><Mic size={12} className="text-slate-muted/60" /></span>}
                  {alert.imageUrl && <span title="Image evidence"><Image size={12} className="text-slate-muted/60" /></span>}
                  {alert.feedback === 'false_alarm' && (
                    <span className="flex items-center gap-0.5 text-[10px] text-red-400">
                      <ThumbsDown size={10} /> false alarm
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-muted">
                  {alert.description ?? alert.explanation.summary}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-slate-muted">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          First report {timeAgo(incident.firstAt.toISOString())}
        </span>
        <span>
          {incident.alerts.filter((a) => a.verificationStatus === 'confirmed').length}/{incident.alerts.length} confirmed
        </span>
      </div>
    </div>
  )
}

export function IncidentsPage() {
  const { alerts, isLive } = useAlerts()
  const { dispatches } = useDispatches()
  const { stats } = useResponseStats()

  const incidents = useMemo<Incident[]>(() => {
    const groups = new Map<string, Alert[]>()
    for (const alert of alerts) {
      if (!alert.incidentId) continue
      const list = groups.get(alert.incidentId) ?? []
      list.push(alert)
      groups.set(alert.incidentId, list)
    }

    const severityRank: Record<Alert['severity'], number> = { low: 0, medium: 1, high: 2, critical: 3 }

    return [...groups.entries()]
      .map(([id, list]) => {
        const sorted = [...list].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        return {
          id,
          alerts: sorted,
          firstAt: new Date(sorted[0].timestamp),
          lastAt: new Date(sorted[sorted.length - 1].timestamp),
          nodes: new Set(sorted.map((a) => a.nodeId)).size,
          severity: sorted.reduce<Alert['severity']>(
            (max, a) => (severityRank[a.severity] > severityRank[max] ? a.severity : max),
            'low'
          ),
          types: [...new Set(sorted.map((a) => a.type))],
        }
      })
      .sort((a, b) => b.firstAt.getTime() - a.firstAt.getTime())
  }, [alerts])

  const dispatchByIncident = useMemo(() => {
    const map = new Map<string, Dispatch>()
    for (const d of dispatches) {
      if (d.incidentId && !map.has(d.incidentId)) map.set(d.incidentId, d)
    }
    return map
  }, [dispatches])

  const avgResponse =
    stats.avgResponseSeconds !== null
      ? stats.avgResponseSeconds >= 60
        ? `${Math.round(stats.avgResponseSeconds / 60)}m ${Math.round(stats.avgResponseSeconds % 60)}s`
        : `${Math.round(stats.avgResponseSeconds)}s`
      : '—'

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-text">Incidents</h1>
          <p className="text-sm text-slate-muted">
            Multi-node correlated events — each incident bundles every mesh report with its evidence package
          </p>
        </div>
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-center">
          <div className="text-lg font-bold tabular-nums text-sky-400">{incidents.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-muted">Incidents</div>
        </div>
      </div>

      {/* Response stats strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-slate-dark px-4 py-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-muted">
            <Timer size={12} /> Avg response
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-slate-text">{avgResponse}</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-dark px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-muted">Acknowledged</div>
          <div className="mt-1 text-lg font-bold tabular-nums text-sky-400">{stats.acknowledgedCount}</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-dark px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-muted">False-alarm rate</div>
          <div className="mt-1 text-lg font-bold tabular-nums text-red-400">
            {stats.totalFeedback > 0 ? `${Math.round(stats.falseAlarmRate * 100)}%` : '—'}
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-dark px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-muted">Officer feedback</div>
          <div className="mt-1 text-lg font-bold tabular-nums text-emerald-400">{stats.totalFeedback}</div>
        </div>
      </div>

      {/* Incident grid */}
      {incidents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/5 bg-slate-dark py-16">
          <Crosshair size={32} className="text-slate-muted/50" />
          <p className="text-sm text-slate-muted">
            No correlated incidents yet — incidents appear when two or more nodes report the same event.
          </p>
          {!isLive && (
            <p className="text-xs text-slate-muted/70">Backend unreachable — showing nothing yet.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {incidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              dispatch={dispatchByIncident.get(incident.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
