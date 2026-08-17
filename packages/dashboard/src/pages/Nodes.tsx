import { useState, useMemo } from 'react'
import {
  Radio, Battery, Sun, MapPin, Grid3X3, List,
  Signal, Clock, Cpu, Filter, Zap, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNodes } from '@/hooks/useLiveData'
import { NodeDetailDrawer } from '@/components/nodes/NodeDetailDrawer'
import { deriveTelemetry, deriveNodeWarnings } from '@/services/nodeTelemetry'
import type { MonitoringNode, NodeStatus } from '../../../../shared/types'

const statusConfig: Record<NodeStatus, { color: string; bg: string; label: string }> = {
  online:  { color: 'text-forest-light', bg: 'bg-forest-light', label: 'Online' },
  warning: { color: 'text-amber',        bg: 'bg-amber',        label: 'Warning' },
  offline: { color: 'text-danger',       bg: 'bg-danger',       label: 'Offline' },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function batteryColor(level: number): string {
  if (level > 60) return '#10B981'
  if (level > 30) return '#F59E0B'
  return '#EF4444'
}

function signalLabel(dbm: number): string {
  if (dbm > -60) return 'Excellent'
  if (dbm > -70) return 'Good'
  if (dbm > -80) return 'Fair'
  return 'Weak'
}

export function Nodes() {
  const { nodes } = useNodes()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Always resolve the drawer node from the live list so telemetry refreshes
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId]
  )

  const zones = useMemo(() => {
    const set = new Set(nodes.map(n => n.zone))
    return ['all', ...Array.from(set).sort()]
  }, [nodes])

  const filtered = useMemo(() => {
    return nodes.filter(n => {
      if (zoneFilter !== 'all' && n.zone !== zoneFilter) return false
      if (statusFilter !== 'all' && n.status !== statusFilter) return false
      return true
    })
  }, [nodes, zoneFilter, statusFilter])

  const total = nodes.length
  const onlineCount = nodes.filter(n => n.status === 'online').length
  const warningCount = nodes.filter(n => n.status === 'warning').length
  const offlineCount = nodes.filter(n => n.status === 'offline').length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-text">
            <Radio className="h-6 w-6 text-forest-light" />
            Monitoring Nodes
          </h1>
          <p className="mt-1 text-sm text-slate-muted">Manage and monitor all deployed sensor nodes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('grid')}
            className={cn(
              'rounded-lg p-2 transition-colors',
              view === 'grid' ? 'bg-forest-light/15 text-forest-light' : 'text-slate-muted hover:bg-slate-surface'
            )}
            aria-label="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              'rounded-lg p-2 transition-colors',
              view === 'list' ? 'bg-forest-light/15 text-forest-light' : 'text-slate-muted hover:bg-slate-surface'
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Nodes" value={total} icon={<Radio className="h-4 w-4" />} color="#10B981" />
        <StatCard label="Online" value={onlineCount} icon={<span className="h-2.5 w-2.5 rounded-full bg-forest-light" />} color="#10B981" />
        <StatCard label="Warning" value={warningCount} icon={<span className="h-2.5 w-2.5 rounded-full bg-amber" />} color="#F59E0B" />
        <StatCard label="Offline" value={offlineCount} icon={<span className="h-2.5 w-2.5 rounded-full bg-danger" />} color="#EF4444" />
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-slate-muted" />
        <select
          value={zoneFilter}
          onChange={e => setZoneFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-surface px-3 py-1.5 text-sm text-slate-text outline-none focus:border-forest-light"
        >
          {zones.map(z => (
            <option key={z} value={z}>{z === 'all' ? 'All Zones' : z}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-surface px-3 py-1.5 text-sm text-slate-text outline-none focus:border-forest-light"
        >
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="warning">Warning</option>
          <option value="offline">Offline</option>
        </select>
        <span className="text-xs text-slate-muted">{filtered.length} of {total} nodes</span>
      </div>

      {/* Content */}
      {view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(node => (
            <NodeCard key={node.id} node={node} onOpen={() => setSelectedId(node.id)} />
          ))}
        </div>
      ) : (
        <NodeTable nodes={filtered} onOpen={setSelectedId} />
      )}

      <NodeDetailDrawer node={selectedNode} onClose={() => setSelectedId(null)} />
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-surface p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-text">{value}</div>
        <div className="text-xs text-slate-muted">{label}</div>
      </div>
    </div>
  )
}

function NodeCard({ node, onOpen }: { node: MonitoringNode; onOpen: () => void }) {
  const cfg = statusConfig[node.status]
  const [lng, lat] = node.location.coordinates
  const battColor = batteryColor(node.batteryLevel)
  const warnings = deriveNodeWarnings(node, deriveTelemetry(node))

  return (
    <div
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${node.name}`}
      className="group cursor-pointer rounded-lg border border-slate-700 bg-slate-surface p-5 transition-all hover:border-forest-light/40 hover:shadow-lg hover:shadow-black/20 focus-visible:outline-2 focus-visible:outline-forest-light"
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-text">{node.name}</h3>
          <span className="mt-0.5 inline-block text-xs text-slate-muted">{node.zone}</span>
        </div>
        <span className={cn('flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium', cfg.color, `${cfg.bg}/10`)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', cfg.bg)} />
          {cfg.label}
        </span>
      </div>

      {/* Battery */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-muted">
            <Battery className="h-3.5 w-3.5" />
            Battery
          </span>
          <span className="font-medium text-slate-text">{node.batteryLevel}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/50">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${node.batteryLevel}%`, background: battColor }}
          />
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-y-2.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-muted">
          <Sun className={cn('h-3.5 w-3.5', node.solarCharging ? 'text-forest-light' : 'text-slate-muted')} />
          <span>
            {node.solarCharging ? 'Solar charging' : 'No solar'}
            {node.solarInputW !== undefined && node.solarInputW > 0 && ` · ${node.solarInputW.toFixed(1)}W`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className={cn('h-3.5 w-3.5', node.powerMode === 'critical' ? 'text-danger' : node.powerMode === 'suspicious' ? 'text-amber' : 'text-slate-muted')} />
          <span className={cn(node.powerMode === 'critical' ? 'text-danger' : node.powerMode === 'suspicious' ? 'text-amber' : 'text-slate-muted')}>
            Power: {node.powerMode ?? 'normal'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-muted">
          <Signal className="h-3.5 w-3.5" />
          <span>{node.signalStrength} dBm ({signalLabel(node.signalStrength)})</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-muted">
          <Clock className="h-3.5 w-3.5" />
          <span>{relativeTime(node.lastSeen)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-muted">
          <Cpu className="h-3.5 w-3.5" />
          <span>{node.firmwareVersion}</span>
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-slate-muted">
          <MapPin className="h-3.5 w-3.5" />
          <span className="font-mono text-[10px]">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
        </div>
      </div>

      {/* Model + warnings */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-700/50 pt-2.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-muted">
          {node.hardwareModel}
        </span>
        {warnings.length > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber">
            <AlertTriangle className="h-3 w-3" />
            {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

function NodeTable({ nodes, onOpen }: { nodes: MonitoringNode[]; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-dark/50">
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-muted">Node</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-muted">Zone</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-muted">Status</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-muted">Battery</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-muted">Solar</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-muted">Signal</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-muted">Last Seen</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-muted">FW</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {nodes.map(node => {
            const cfg = statusConfig[node.status]
            return (
              <tr
                key={node.id}
                onClick={() => onOpen(node.id)}
                className="cursor-pointer transition-colors hover:bg-forest-light/5"
              >
                <td className="px-4 py-3 font-medium text-slate-text">{node.name}</td>
                <td className="px-4 py-3 text-slate-muted">{node.zone}</td>
                <td className="px-4 py-3">
                  <span className={cn('flex items-center gap-1.5 text-xs font-medium', cfg.color)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', cfg.bg)} />
                    {cfg.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-700/50">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${node.batteryLevel}%`, background: batteryColor(node.batteryLevel) }}
                      />
                    </div>
                    <span className="text-xs text-slate-muted">{node.batteryLevel}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Sun className={cn('h-4 w-4', node.solarCharging ? 'text-forest-light' : 'text-slate-muted')} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-muted">{node.signalStrength} dBm</td>
                <td className="px-4 py-3 text-xs text-slate-muted">{relativeTime(node.lastSeen)}</td>
                <td className="px-4 py-3 text-xs text-slate-muted">{node.firmwareVersion}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
