/**
 * Command-center dashboard (spec #24) — answers the nine operational
 * questions at a glance: system status, what is happening now, where, how
 * serious, who is responding and what is likely next.
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, ShieldAlert, Siren,
  Crosshair, ChevronRight,
} from 'lucide-react'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix default marker icons for Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

import { useAlerts, useNodes, useDispatches } from '@/hooks/useLiveData'
import { useConnectionStatus } from '@/hooks/useSocket'
import { StatCard } from '@/components/dashboard/StatCard'
import { RecentAlerts } from '@/components/dashboard/RecentAlerts'
import { getRecentAlerts } from '@/services/mockData'
import { relativeTime } from '@/lib/format'
import {
  computeThreatScore, groupIncidents, THREAT_LEVEL_STYLE,
} from '@/services/intel'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  online: '#10B981',
  warning: '#F59E0B',
  offline: '#EF4444',
}

const DISPATCH_STATUS_STYLE: Record<string, string> = {
  dispatched: 'bg-blue-500/15 text-blue-400',
  enroute: 'bg-amber-500/15 text-amber-400',
  onscene: 'bg-emerald-500/15 text-emerald-400',
  resolved: 'bg-slate-500/15 text-slate-400',
}

export function Dashboard() {
  const navigate = useNavigate()
  const connected = useConnectionStatus()
  const { alerts } = useAlerts()
  const { nodes } = useNodes()
  const { dispatches } = useDispatches()

  const recentAlerts = useMemo(() => getRecentAlerts(alerts, 7), [alerts])

  const onlineCount = nodes.filter((n) => n.status === 'online').length
  const warningCount = nodes.filter((n) => n.status === 'warning').length
  const offlineCount = nodes.filter((n) => n.status === 'offline').length

  // Single-source derivations — same engines as every other page
  const incidents = useMemo(() => groupIncidents(alerts), [alerts])
  const activeIncidents = useMemo(() => {
    const dayAgo = Date.now() - 24 * 3600_000
    return incidents.filter((i) => new Date(i.lastAt).getTime() >= dayAgo)
  }, [incidents])

  const activeAlerts = useMemo(
    () => alerts.filter((a) => a.status === 'new' || a.status === 'acknowledged'),
    [alerts]
  )
  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical').length
  const criticalList = useMemo(
    () =>
      activeAlerts
        .filter((a) => a.severity === 'critical' || a.severity === 'high')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5),
    [activeAlerts]
  )

  const peakThreat = useMemo(() => {
    let best: { score: number; level: ReturnType<typeof computeThreatScore>['level'] } = {
      score: 0,
      level: 'low',
    }
    for (const a of activeAlerts) {
      const t = computeThreatScore(a, { nodes, alerts })
      if (t.score > best.score) best = { score: t.score, level: t.level }
    }
    return best
  }, [activeAlerts, nodes, alerts])
  const threatMeta = THREAT_LEVEL_STYLE[peakThreat.level]

  const activeTeams = useMemo(() => dispatches.filter((d) => d.status !== 'resolved'), [dispatches])

  // Center map on the average node position
  const centerLat = nodes.reduce((s, n) => s + n.location.coordinates[1], 0) / Math.max(1, nodes.length)
  const centerLng = nodes.reduce((s, n) => s + n.location.coordinates[0], 0) / Math.max(1, nodes.length)

  // Show 5 most recent alert positions
  const alertMarkers = useMemo(
    () =>
      [...alerts]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5),
    [alerts]
  )

  const systemOperational = connected && offlineCount < nodes.length
  const situation = criticalCount > 0
    ? {
        title: `${criticalCount} urgent ${criticalCount === 1 ? 'alert needs' : 'alerts need'} attention`,
        detail: 'Review the alerts and confirm that help is on the way.',
        action: 'Review urgent alerts',
        path: '/alerts',
        tone: 'border-red-500/30 bg-red-500/10',
        text: 'text-red-300',
      }
    : activeTeams.length > 0
      ? {
          title: `${activeTeams.length} response ${activeTeams.length === 1 ? 'team is' : 'teams are'} active`,
          detail: 'Teams are responding in the field. You can follow their progress here.',
          action: 'Track response',
          path: '/dispatch',
          tone: 'border-violet-500/30 bg-violet-500/10',
          text: 'text-violet-200',
        }
      : {
          title: 'Everything is calm right now',
          detail: `${onlineCount} field devices are reporting normally. We will highlight anything that needs your attention.`,
          action: 'See the map',
          path: '/map',
          tone: 'border-emerald-500/30 bg-emerald-500/10',
          text: 'text-emerald-200',
        }

  return (
    <div className="flex flex-col gap-5 p-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-forest/35 to-slate-surface px-5 py-5 shadow-lg shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-text sm:text-4xl">What is happening?</h1>
        </div>
        <button onClick={() => navigate(situation.path)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-forest-light px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-300">
          {situation.action} <ChevronRight size={16} />
        </button>
      </section>

      <section className={cn('flex flex-col gap-3 rounded-xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between', situation.tone)}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-slate-950/20 p-2"><AlertTriangle className={cn('h-5 w-5', situation.text)} /></div>
          <div>
            <h2 className={cn('text-base font-bold', situation.text)}>{situation.title}</h2>
          </div>
        </div>
        <button onClick={() => navigate(situation.path)} className={cn('text-left text-sm font-semibold underline underline-offset-4 sm:text-right', situation.text)}>{situation.action}</button>
      </section>

      {/* System status banner */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-white/5 bg-slate-surface px-5 py-3.5 shadow-lg shadow-black/20">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              systemOperational ? 'bg-forest-light shadow-[0_0_8px_theme(colors.forest-light)]' : 'bg-red-500'
            )}
          />
          <div>
            <div className="text-sm font-semibold text-slate-muted">System</div>
            <div className={cn('text-lg font-bold', systemOperational ? 'text-forest-light' : 'text-red-400')}>
              {systemOperational ? 'All systems working' : connected ? 'Some devices need checking' : 'Connection lost — showing saved data'}
            </div>
          </div>
        </div>
        <div className="h-8 w-px bg-white/5" />
        <StatusStat label="Nodes" value={nodes.length} />
        <StatusStat label="Online" value={onlineCount} color="#10B981" />
        <StatusStat label="Warning" value={warningCount} color="#F59E0B" />
        <StatusStat label="Offline" value={offlineCount} color="#EF4444" />
      </div>

      {/* Command stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<ShieldAlert size={20} />}
          label="Urgent alerts"
          value={criticalCount}
          color="#EF4444"
          onClick={() => navigate('/alerts')}
        />
        <StatCard
          icon={<Crosshair size={20} />}
          label="Events today"
          value={activeIncidents.length}
          color="#38BDF8"
          onClick={() => navigate('/incidents')}
        />
        <StatCard
          icon={<Activity size={20} />}
          label="Highest risk"
          value={activeAlerts.length ? peakThreat.score : 0}
          color={threatMeta.color}
          onClick={() => navigate('/alerts')}
        />
        <StatCard
          icon={<Siren size={20} />}
          label="Teams responding"
          value={activeTeams.length}
          color="#A78BFA"
          onClick={() => navigate('/dispatch')}
        />
      </div>

      {/* Main area — live map + side panel */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Left — map + recent alerts */}
        <div className="flex flex-col gap-4 xl:col-span-2">
          <div className="overflow-hidden rounded-xl border border-white/5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between border-b border-white/5 bg-slate-surface px-4 py-2.5">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-text">
                <span className="live-dot h-2 w-2 rounded-full bg-red-500" />
                Live map
              </span>
              <button
                onClick={() => navigate('/map')}
                className="flex items-center gap-1 text-[11px] font-medium text-forest-light hover:text-emerald-300"
              >
                Open command map <ChevronRight size={12} />
              </button>
            </div>
            <MapContainer
              center={[centerLat, centerLng]}
              zoom={9}
              scrollWheelZoom={false}
              style={{ height: '300px', width: '100%', background: '#0F172A' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              {/* Node markers */}
              {nodes.map((node) => {
                const [lng, lat] = node.location.coordinates
                const color = statusColors[node.status] ?? '#94A3B8'
                return (
                  <CircleMarker
                    key={node.id}
                    center={[lat, lng]}
                    radius={7}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
                  >
                    <Tooltip direction="top" offset={[0, -8]}>
                      <span style={{ color: '#0F172A', fontWeight: 600 }}>{node.name}</span>
                    </Tooltip>
                    <Popup>
                      <div style={{ color: '#0F172A', fontSize: 12 }}>
                        <strong>{node.name}</strong>
                        <br />
                        Status: {node.status} · Battery: {node.batteryLevel}%
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}

              {/* Recent alert markers */}
              {alertMarkers.map((alert) => {
                const [lng, lat] = alert.location.coordinates
                return (
                  <CircleMarker
                    key={alert.id}
                    center={[lat, lng]}
                    radius={4}
                    pathOptions={{
                      color: '#EF4444',
                      fillColor: '#EF4444',
                      fillOpacity: 0.5,
                      weight: 1,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -5]}>
                      <span style={{ color: '#0F172A', fontSize: 11 }}>
                        Alert: {alert.type} — {Math.round(alert.confidence * 100)}%
                      </span>
                    </Tooltip>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          </div>

          <RecentAlerts alerts={recentAlerts} />
        </div>

        {/* Right — command side panel */}
        <div className="flex flex-col gap-4">
          {/* Critical alerts */}
          <div className="rounded-xl border border-white/5 bg-slate-surface p-4 shadow-lg shadow-black/20">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-text">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Needs attention
              </h3>
              <button
                onClick={() => navigate('/alerts')}
                className="text-[11px] font-medium text-forest-light hover:text-emerald-300"
              >
                View all →
              </button>
            </div>
            {criticalList.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-muted">
                No critical or high-severity alerts right now.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {criticalList.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate('/alerts')}
                    className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        a.severity === 'critical' ? 'bg-red-500' : 'bg-orange-400'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium capitalize text-slate-text">
                        {a.soundType ?? a.type} · {a.severity}
                      </div>
                      <div className="truncate text-[10px] text-slate-muted">
                        {a.description ?? a.id.slice(-6)} · {relativeTime(a.timestamp)}
                      </div>
                    </div>
                    <ChevronRight size={13} className="shrink-0 text-slate-muted" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active response */}
          <div className="rounded-xl border border-white/5 bg-slate-surface p-4 shadow-lg shadow-black/20">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-text">
                <Siren className="h-4 w-4 text-violet-400" />
                Teams in the field
              </h3>
              <button
                onClick={() => navigate('/dispatch')}
                className="text-[11px] font-medium text-forest-light hover:text-emerald-300"
              >
                Response center →
              </button>
            </div>
            {activeTeams.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-muted">
                No teams in the field — responses are auto-dispatched for critical alerts.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {activeTeams.slice(0, 3).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => navigate('/dispatch')}
                    className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-slate-text">{d.team}</div>
                      <div className="truncate text-[10px] text-slate-muted">
                        {d.zone}
                        {d.status !== 'onscene' && d.etaMinutes > 0 && ` · ETA ${d.etaMinutes} min`}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                        DISPATCH_STATUS_STYLE[d.status]
                      )}
                    >
                      {d.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

function StatusStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-slate-muted">{label}</span>
      <span className="text-sm font-bold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  )
}
