import { useState, useMemo, useCallback } from 'react'
import {
  User,
  Bug,
  Car,
  Flame,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CheckSquare,
  Square,
} from 'lucide-react'
import type { Alert, AlertSeverity, AlertType, AlertStatus } from '../../../shared/types'
import { useAlerts, useNodes } from '@/hooks/useLiveData'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/format'
import { computeThreatScore, THREAT_LEVEL_STYLE, type ThreatAssessment } from '@/services/intel'
import { ExplainableAI } from '@/components/alerts/ExplainableAI'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const severityStyles: Record<AlertSeverity, string> = {
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
}

const statusStyles: Record<AlertStatus, string> = {
  new: 'bg-blue-500/15 text-blue-400',
  acknowledged: 'bg-amber-500/15 text-amber-400',
  resolved: 'bg-emerald-500/15 text-emerald-400',
  dismissed: 'bg-slate-500/15 text-slate-400',
}

const typeIcons: Record<AlertType, typeof User> = {
  human: User,
  animal: Bug,
  vehicle: Car,
  fire: Flame,
}

const severityOrder: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

type SortKey = 'timestamp' | 'confidence' | 'severity' | 'threat'
type SortDir = 'asc' | 'desc'

const PER_PAGE = 10

// ---------------------------------------------------------------------------
// Filter button group
// ---------------------------------------------------------------------------

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-slate-muted">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
              value === opt.value
                ? 'border-forest-light/40 bg-forest-light/10 text-forest-light'
                : 'border-white/5 bg-white/[0.02] text-slate-muted hover:bg-white/5 hover:text-slate-text'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Alerts page
// ---------------------------------------------------------------------------

export function Alerts() {
  const { alerts } = useAlerts()
  const { nodes } = useNodes()

  // Threat scores derived once per data change — same engine as the drawer
  const threatMap = useMemo(() => {
    const m = new Map<string, ThreatAssessment>()
    for (const a of alerts) m.set(a.id, computeThreatScore(a, { nodes, alerts }))
    return m
  }, [alerts, nodes])

  // Filter state
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<AlertType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('all')
  const [search, setSearch] = useState('')

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>('timestamp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Pagination
  const [page, setPage] = useState(0)

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Drawer
  const [drawerAlert, setDrawerAlert] = useState<Alert | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Resolve the drawer alert from the live list so officer actions / socket
  // updates are reflected without reopening
  const liveDrawerAlert = useMemo(
    () => (drawerAlert ? alerts.find((a) => a.id === drawerAlert.id) ?? drawerAlert : null),
    [alerts, drawerAlert]
  )

  // ---- Filtered + sorted data ----
  const filtered = useMemo(() => {
    const now = Date.now()
    const rangeMs = dateRange === '7d' ? 7 * 86400000 : dateRange === '30d' ? 30 * 86400000 : Infinity
    const q = search.toLowerCase()

    let result = alerts.filter((a) => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (rangeMs !== Infinity && now - new Date(a.timestamp).getTime() > rangeMs) return false
      if (q) {
        const haystack = `${a.description ?? ''} ${a.species ?? ''} ${a.type} ${a.id}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })

    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'timestamp') {
        cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      } else if (sortKey === 'confidence') {
        cmp = a.confidence - b.confidence
      } else if (sortKey === 'threat') {
        cmp = (threatMap.get(a.id)?.score ?? 0) - (threatMap.get(b.id)?.score ?? 0)
      } else {
        cmp = severityOrder[a.severity] - severityOrder[b.severity]
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

    return result
  }, [alerts, threatMap, severityFilter, typeFilter, statusFilter, dateRange, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageAlerts = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  // Reset page when filters change
  const safePage = Math.min(page, totalPages - 1)
  if (safePage !== page) setPage(safePage)

  // ---- Selection helpers ----
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const allOnPage = pageAlerts.map((a) => a.id)
      const allSelected = allOnPage.every((id) => prev.has(id))
      const next = new Set(prev)
      if (allSelected) {
        allOnPage.forEach((id) => next.delete(id))
      } else {
        allOnPage.forEach((id) => next.add(id))
      }
      return next
    })
  }, [pageAlerts])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const openDrawer = (alert: Alert) => {
    setDrawerAlert(alert)
    setDrawerOpen(true)
  }

  const allOnPageSelected = pageAlerts.length > 0 && pageAlerts.every((a) => selected.has(a.id))

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-text">Alerts</h1>
          <p className="text-sm text-slate-muted">
            {filtered.length} alert{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {selected.size > 0 && (
          <span className="rounded-lg border border-forest-light/30 bg-forest-light/10 px-3 py-1.5 text-xs font-medium text-forest-light">
            {selected.size} selected
          </span>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-white/5 bg-slate-surface p-4 shadow-lg shadow-black/20">
        <FilterGroup
          label="Severity"
          options={[
            { label: 'All', value: 'all' },
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
            { label: 'Critical', value: 'critical' },
          ]}
          value={severityFilter}
          onChange={setSeverityFilter}
        />
        <FilterGroup
          label="Type"
          options={[
            { label: 'All', value: 'all' },
            { label: 'Human', value: 'human' },
            { label: 'Animal', value: 'animal' },
            { label: 'Vehicle', value: 'vehicle' },
            { label: 'Fire', value: 'fire' },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
        />
        <FilterGroup
          label="Status"
          options={[
            { label: 'All', value: 'all' },
            { label: 'New', value: 'new' },
            { label: 'Acknowledged', value: 'acknowledged' },
            { label: 'Resolved', value: 'resolved' },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <FilterGroup
          label="Date Range"
          options={[
            { label: 'All time', value: 'all' },
            { label: 'Last 7 days', value: '7d' },
            { label: 'Last 30 days', value: '30d' },
          ]}
          value={dateRange}
          onChange={setDateRange}
        />

        {/* Search */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-muted">Search</span>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-muted" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 rounded-md border border-white/5 bg-white/[0.03] pl-8 pr-3 text-xs text-slate-text placeholder:text-slate-muted/50 focus:border-forest-light/40 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-surface shadow-lg shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="w-10 px-4 py-3">
                  <button onClick={toggleSelectAll} className="text-slate-muted hover:text-slate-text">
                    {allOnPageSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
                  Severity
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
                  Type
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
                  Description
                </th>
                <th className="px-3 py-3">
                  <button
                    onClick={() => handleSort('confidence')}
                    className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-muted hover:text-slate-text"
                  >
                    Confidence <ArrowUpDown size={10} />
                  </button>
                </th>
                <th className="px-3 py-3">
                  <button
                    onClick={() => handleSort('threat')}
                    className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-muted hover:text-slate-text"
                  >
                    Threat <ArrowUpDown size={10} />
                  </button>
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
                  Location
                </th>
                <th className="px-3 py-3">
                  <button
                    onClick={() => handleSort('timestamp')}
                    className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-muted hover:text-slate-text"
                  >
                    Time <ArrowUpDown size={10} />
                  </button>
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
                  Status
                </th>
                <th className="px-3 py-3">
                  <button
                    onClick={() => handleSort('severity')}
                    className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-muted hover:text-slate-text"
                  >
                    Actions <ArrowUpDown size={10} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageAlerts.map((alert) => {
                const TypeIcon = typeIcons[alert.type]
                const isSelected = selected.has(alert.id)
                const threat = threatMap.get(alert.id)
                const threatMeta = threat ? THREAT_LEVEL_STYLE[threat.level] : null
                const [lng, lat] = alert.location.coordinates
                return (
                  <tr
                    key={alert.id}
                    className={cn(
                      'cursor-pointer border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]',
                      isSelected && 'bg-forest-light/5'
                    )}
                    onClick={() => openDrawer(alert)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelect(alert.id)}
                        className="text-slate-muted hover:text-slate-text"
                      >
                        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'rounded border px-2 py-0.5 text-[10px] font-semibold uppercase',
                          severityStyles[alert.severity]
                        )}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <TypeIcon size={14} className="text-slate-muted" />
                        <span className="capitalize text-slate-text">{alert.type}</span>
                      </div>
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-3 text-slate-text">
                      {alert.description ?? '—'}
                      {alert.species && (
                        <span className="ml-1 text-xs capitalize text-forest-light">
                          ({alert.species})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-forest-light"
                            style={{ width: `${alert.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-slate-muted">
                          {Math.round(alert.confidence * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {threat && threatMeta ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-bold tabular-nums"
                          style={{
                            color: threatMeta.color,
                            borderColor: `${threatMeta.color}55`,
                            background: `${threatMeta.color}14`,
                          }}
                          title={`Threat level: ${threatMeta.label}`}
                        >
                          {threat.score}
                          <span className="font-medium opacity-80">{threatMeta.label}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs tabular-nums text-slate-muted">
                      {lat.toFixed(2)}, {lng.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-muted">
                      {relativeTime(alert.timestamp)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-[10px] font-medium uppercase',
                          statusStyles[alert.status]
                        )}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openDrawer(alert)}
                        className="rounded-md p-1.5 text-slate-muted transition-colors hover:bg-white/5 hover:text-slate-text"
                        title="View details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {pageAlerts.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-sm text-slate-muted">
                    No alerts match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
          <span className="text-xs text-slate-muted">
            Page {safePage + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-md p-1.5 text-slate-muted transition-colors hover:bg-white/5 hover:text-slate-text disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="rounded-md p-1.5 text-slate-muted transition-colors hover:bg-white/5 hover:text-slate-text disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Explainable AI Drawer */}
      <ExplainableAI
        alert={liveDrawerAlert}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}
