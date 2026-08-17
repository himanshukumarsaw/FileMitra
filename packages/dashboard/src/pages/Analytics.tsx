/**
 * Analytics (spec #13) — detection insights over the live alert stream with
 * time-range filters, model performance metrics and CSV / report export.
 * Every chart derives from the same filtered alert list, so all numbers stay
 * consistent with the rest of the command center.
 */

import { useMemo, useState } from 'react'
import type { PieLabelRenderProps } from 'recharts'
import {
  BarChart3, Activity, PieChart as PieIcon, Clock, Crosshair, MapPin,
  AlertTriangle, Download, FileText, Brain, Gauge,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts'
import { generateMockTrendData, generateMockSpeciesData } from '@/services/mockData'
import { useAlerts, useNodes } from '@/hooks/useLiveData'
import { AI_MODEL } from '@/services/intel'
import { useRole } from '@/providers/RoleProvider'
import { useToast } from '@/components/ui/Toast'
import { addAudit } from '@/services/activityStore'
import { cn } from '@/lib/utils'
import type { Alert } from '../../../../shared/types'

const COLORS = {
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  white: '#F8FAFC',
  orange: '#F97316',
  blue: '#3B82F6',
}

const SPECIES_COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#A855F7', '#EC4899', '#06B6D4', '#F97316']

const SEVERITY_META: { key: Alert['severity']; label: string; color: string }[] = [
  { key: 'critical', label: 'Critical', color: COLORS.red },
  { key: 'high', label: 'High', color: COLORS.orange },
  { key: 'medium', label: 'Medium', color: COLORS.amber },
  { key: 'low', label: 'Low', color: COLORS.green },
]

const TOOLTIP_STYLE = {
  background: '#1E293B',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#F8FAFC',
  fontSize: 12,
} as const

type RangeKey = '24h' | '7d' | '30d' | '90d' | 'custom'
const RANGE_MS: Record<Exclude<RangeKey, 'custom'>, number> = {
  '24h': 24 * 3600_000,
  '7d': 7 * 24 * 3600_000,
  '30d': 30 * 24 * 3600_000,
  '90d': 90 * 24 * 3600_000,
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function Analytics() {
  const { alerts } = useAlerts()
  const { nodes } = useNodes()
  const { can, roleLabel } = useRole()
  const { push } = useToast()

  const [range, setRange] = useState<RangeKey>('7d')
  const [customFrom, setCustomFrom] = useState(() => toDateInput(new Date(Date.now() - 14 * 24 * 3600_000)))
  const [customTo, setCustomTo] = useState(() => toDateInput(new Date()))

  // Single filtered source — every chart below reads from this list
  const filtered = useMemo(() => {
    const now = Date.now()
    let fromMs: number
    let toMs = now
    if (range === 'custom') {
      fromMs = new Date(`${customFrom}T00:00:00`).getTime()
      toMs = new Date(`${customTo}T23:59:59`).getTime()
      if (Number.isNaN(fromMs)) fromMs = now - RANGE_MS['7d']
      if (Number.isNaN(toMs)) toMs = now
    } else {
      fromMs = now - RANGE_MS[range]
    }
    return alerts.filter((a) => {
      const t = new Date(a.timestamp).getTime()
      return t >= fromMs && t <= toMs
    })
  }, [alerts, range, customFrom, customTo])

  // Derived chart datasets (pure functions over the filtered alert list)
  const trends = useMemo(() => generateMockTrendData(filtered), [filtered])
  const speciesData = useMemo(() => generateMockSpeciesData(filtered), [filtered])

  // Hourly heatmap data: 7 days x 24 hours
  const hourlyData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    for (const a of filtered) {
      const d = new Date(a.timestamp)
      grid[d.getDay()][d.getHours()]++
    }
    return grid
  }, [filtered])

  const maxHourly = useMemo(() => {
    let max = 0
    for (const row of hourlyData) for (const v of row) if (v > max) max = v
    return max || 1
  }, [hourlyData])

  // Detection accuracy buckets
  const accuracyData = useMemo(() => {
    const buckets = [
      { range: '0.60-0.70', count: 0 },
      { range: '0.70-0.80', count: 0 },
      { range: '0.80-0.90', count: 0 },
      { range: '0.90-1.00', count: 0 },
    ]
    for (const a of filtered) {
      if (a.confidence < 0.7) buckets[0].count++
      else if (a.confidence < 0.8) buckets[1].count++
      else if (a.confidence < 0.9) buckets[2].count++
      else buckets[3].count++
    }
    return buckets
  }, [filtered])

  // Top threat zones
  const zoneData = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of filtered) {
      const node = nodes.find(n => n.id === a.nodeId)
      const zone = node?.zone ?? 'Unknown'
      map.set(zone, (map.get(zone) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([zone, count]) => ({ zone: zone.replace(' Zone', ''), count }))
      .sort((a, b) => b.count - a.count)
  }, [filtered, nodes])

  // Alert severity distribution
  const severityData = useMemo(
    () =>
      SEVERITY_META.map((s) => ({
        severity: s.label,
        count: filtered.filter((a) => a.severity === s.key).length,
        color: s.color,
      })),
    [filtered]
  )

  // Alert type distribution
  const typeData = useMemo(() => {
    const map: Record<string, number> = { human: 0, animal: 0, vehicle: 0, fire: 0 }
    for (const a of filtered) map[a.type] = (map[a.type] ?? 0) + 1
    return [
      { name: 'Human', value: map.human, color: COLORS.red },
      { name: 'Animal', value: map.animal, color: COLORS.green },
      { name: 'Vehicle', value: map.vehicle, color: COLORS.amber },
      { name: 'Fire', value: map.fire, color: COLORS.orange },
    ]
  }, [filtered])

  // Model quality — false positives come from officer feedback on live data
  const reviewed = filtered.filter((a) => a.feedback !== undefined)
  const falsePositives = reviewed.filter((a) => a.feedback === 'false_alarm').length
  const falsePositiveRate = reviewed.length > 0 ? (falsePositives / reviewed.length) * 100 : null

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // --- Exports -----------------------------------------------------------------

  const zoneOf = (a: Alert): string => nodes.find((n) => n.id === a.nodeId)?.zone ?? 'Unknown'
  const nodeNameOf = (a: Alert): string => nodes.find((n) => n.id === a.nodeId)?.name ?? a.nodeId

  const exportCsv = () => {
    const rows = [
      ['ID', 'Timestamp', 'Type', 'Severity', 'Confidence', 'Species', 'Status', 'Verification', 'Node', 'Zone', 'Latitude', 'Longitude'],
      ...filtered.map((a) => {
        const [lng, lat] = a.location.coordinates
        return [
          a.id, a.timestamp, a.type, a.severity, String(a.confidence),
          a.species ?? '', a.status, a.verificationStatus ?? '', nodeNameOf(a), zoneOf(a),
          lat.toFixed(5), lng.toFixed(5),
        ]
      }),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadBlob(csv, 'text/csv', `forest-guard-alerts-${toDateInput(new Date())}.csv`)
    addAudit(roleLabel, `Exported alert CSV (${filtered.length} rows, ${range} window)`)
    push('success', `Alert data exported (${filtered.length} rows)`)
  }

  const exportReport = () => {
    const lines = [
      '# Forest Guard — Analytics Report',
      '',
      `Generated: ${new Date().toLocaleString()}`,
      `Time window: ${range === 'custom' ? `${customFrom} → ${customTo}` : range}`,
      `Alerts in window: ${filtered.length}`,
      '',
      '## Alerts by severity',
      ...severityData.map((s) => `- ${s.severity}: ${s.count}`),
      '',
      '## Alerts by type',
      ...typeData.map((t) => `- ${t.name}: ${t.value}`),
      '',
      '## Zone activity',
      ...zoneData.map((z) => `- ${z.zone}: ${z.count}`),
      '',
      '## Species distribution',
      ...(speciesData.length > 0 ? speciesData.map((s) => `- ${s.species}: ${s.count} detections`) : ['- No wildlife detections']),
      '',
      '## Model performance (AcousticNet ' + AI_MODEL.version + ')',
      `- Accuracy: ${AI_MODEL.accuracy}%`,
      `- Precision: ${AI_MODEL.precision}%`,
      `- Recall: ${AI_MODEL.recall}%`,
      `- F1 score: ${AI_MODEL.f1}%`,
      `- Inference latency: ${AI_MODEL.inferenceMs} ms`,
      `- False positive rate: ${falsePositiveRate === null ? 'n/a (no officer feedback in window)' : `${falsePositiveRate.toFixed(1)}% (${falsePositives}/${reviewed.length} reviewed)`}`,
      '',
    ]
    downloadBlob(lines.join('\n'), 'text/markdown', `forest-guard-report-${toDateInput(new Date())}.md`)
    addAudit(roleLabel, `Exported analytics report (${range} window)`)
    push('success', 'Analytics report exported')
  }

  const exportAllowed = can('export.reports')

  return (
    <div className="p-6">
      {/* Header + range filters + export */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-text">
            <BarChart3 className="h-6 w-6 text-forest-light" />
            Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-muted">
            Detection insights and activity patterns — {filtered.length} alert{filtered.length !== 1 ? 's' : ''} in selected window
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Time range" className="flex flex-wrap items-center gap-1.5">
            {(['24h', '7d', '30d', '90d', 'custom'] as RangeKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                aria-pressed={range === key}
                className={cn(
                  'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                  range === key
                    ? 'border-forest-light/40 bg-forest-light/10 text-forest-light'
                    : 'border-white/5 bg-white/[0.02] text-slate-muted hover:bg-white/5 hover:text-slate-text'
                )}
              >
                {key === 'custom' ? 'Custom' : key.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={exportCsv}
            disabled={!exportAllowed || filtered.length === 0}
            title={exportAllowed ? 'Export filtered alerts as CSV' : 'Analyst or Admin role required'}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-text transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={13} />
            Export CSV
          </button>
          <button
            onClick={exportReport}
            disabled={!exportAllowed || filtered.length === 0}
            title={exportAllowed ? 'Export a summary report' : 'Analyst or Admin role required'}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-text transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileText size={13} />
            Export Report
          </button>
        </div>
      </div>

      {/* Custom range inputs */}
      {range === 'custom' && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-slate-surface px-4 py-3">
          <label className="flex items-center gap-2 text-xs text-slate-muted">
            From
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-md border border-white/10 bg-slate-dark px-2 py-1 text-xs text-slate-text outline-none focus:border-forest-light"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-muted">
            To
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-md border border-white/10 bg-slate-dark px-2 py-1 text-xs text-slate-text outline-none focus:border-forest-light"
            />
          </label>
        </div>
      )}

      {/* No-data state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-700 bg-slate-surface px-6 py-16 text-slate-muted">
          <BarChart3 size={28} className="opacity-50" />
          <span className="text-sm font-medium text-slate-text">No detections in this window</span>
          <span className="text-xs opacity-70">Widen the time range or wait for new node transmissions.</span>
        </div>
      ) : (
        <>
          {/* Alerts Over Time — full width */}
          <ChartCard title="Alerts Over Time" icon={<Activity className="h-4 w-4" />} className="mb-4">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.white} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORS.white} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="count" name="Total" stroke={COLORS.white} fill="url(#gradTotal)" strokeWidth={2} />
                <Area type="monotone" dataKey="human" name="Human" stroke={COLORS.red} fill={COLORS.red} fillOpacity={0.1} strokeWidth={1.5} />
                <Area type="monotone" dataKey="animal" name="Animal" stroke={COLORS.green} fill={COLORS.green} fillOpacity={0.1} strokeWidth={1.5} />
                <Area type="monotone" dataKey="vehicle" name="Vehicle" stroke={COLORS.amber} fill={COLORS.amber} fillOpacity={0.1} strokeWidth={1.5} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Model performance strip */}
          <ChartCard title="AI Model Performance" icon={<Brain className="h-4 w-4" />} className="mb-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <MetricTile label="Precision" value={`${AI_MODEL.precision}%`} />
              <MetricTile label="Recall" value={`${AI_MODEL.recall}%`} />
              <MetricTile label="F1 Score" value={`${AI_MODEL.f1}%`} />
              <MetricTile label="Inference" value={`${AI_MODEL.inferenceMs} ms`} icon={<Gauge className="h-3.5 w-3.5" />} />
              <MetricTile
                label="False Positive Rate"
                value={falsePositiveRate === null ? 'n/a' : `${falsePositiveRate.toFixed(1)}%`}
                sub={falsePositiveRate === null ? 'no officer feedback yet' : `${falsePositives}/${reviewed.length} reviewed`}
                tone={falsePositiveRate !== null && falsePositiveRate > 20 ? 'text-amber' : undefined}
              />
              <MetricTile label="Model" value={`${AI_MODEL.name} ${AI_MODEL.version}`} sub={`retrained ${AI_MODEL.lastRetrained}`} />
            </div>
          </ChartCard>

          {/* Two-column grid */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Severity Distribution */}
            <ChartCard title="Alerts by Severity" icon={<AlertTriangle className="h-4 w-4" />}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={severityData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="severity" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" name="Alerts" radius={[4, 4, 0, 0]}>
                    {severityData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Species Distribution */}
            <ChartCard title="Species Distribution" icon={<PieIcon className="h-4 w-4" />}>
              {speciesData.length === 0 ? (
                <EmptyChart message="No wildlife detections in this window" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={speciesData}
                      dataKey="count"
                      nameKey="species"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={52}
                      paddingAngle={3}
                      label={(props: PieLabelRenderProps) =>
                        `${String(props.payload?.species ?? '')} (${String(props.payload?.count ?? '')} \u00b7 ${((Number(props.percent ?? 0)) * 100).toFixed(0)}%)`
                      }
                      labelLine={{ stroke: '#475569' }}
                    >
                      {speciesData.map((_, i) => (
                        <Cell key={i} fill={SPECIES_COLORS[i % SPECIES_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Hourly Activity Heatmap */}
            <ChartCard title="Hourly Activity" icon={<Clock className="h-4 w-4" />}>
              <div className="overflow-x-auto">
                <div className="min-w-[480px]">
                  {/* Hour labels */}
                  <div className="mb-1 flex pl-10">
                    {Array.from({ length: 24 }, (_, i) => (
                      <div key={i} className="flex-1 text-center text-[9px] text-slate-muted">
                        {i % 3 === 0 ? `${i}` : ''}
                      </div>
                    ))}
                  </div>
                  {/* Grid */}
                  {hourlyData.map((row, dayIdx) => (
                    <div key={dayIdx} className="mb-0.5 flex items-center gap-1">
                      <span className="w-8 text-right text-[10px] text-slate-muted">{dayNames[dayIdx]}</span>
                      <div className="flex flex-1 gap-0.5">
                        {row.map((val, hourIdx) => {
                          const intensity = val / maxHourly
                          return (
                            <div
                              key={hourIdx}
                              className="aspect-square flex-1 rounded-[2px] transition-colors"
                              style={{
                                background: intensity === 0
                                  ? '#1E293B'
                                  : `rgba(16, 185, 129, ${0.15 + intensity * 0.85})`,
                              }}
                              title={`${dayNames[dayIdx]} ${hourIdx}:00 — ${val} alerts`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-muted">
                    <span>Less</span>
                    {[0.15, 0.35, 0.55, 0.75, 1].map((v, i) => (
                      <div
                        key={i}
                        className="h-2.5 w-2.5 rounded-[2px]"
                        style={{ background: `rgba(16, 185, 129, ${v})` }}
                      />
                    ))}
                    <span>More</span>
                  </div>
                </div>
              </div>
            </ChartCard>

            {/* Detection Accuracy */}
            <ChartCard title="Detection Confidence" icon={<Crosshair className="h-4 w-4" />}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={accuracyData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" name="Detections" radius={[4, 4, 0, 0]}>
                    {accuracyData.map((_, i) => (
                      <Cell key={i} fill={i === 3 ? COLORS.green : i === 2 ? '#84CC16' : i === 1 ? COLORS.amber : COLORS.orange} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Top Threat Zones */}
            <ChartCard title="Zone Activity" icon={<MapPin className="h-4 w-4" />} className="lg:col-span-2">
              {zoneData.length === 0 ? (
                <EmptyChart message="No zone activity in this window" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={zoneData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="zone" tick={{ fontSize: 11, fill: '#94A3B8' }} width={90} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="count" name="Alerts" radius={[0, 4, 4, 0]}>
                      {zoneData.map((_, i) => (
                        <Cell key={i} fill={[COLORS.red, COLORS.orange, COLORS.amber, COLORS.green][i % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Alert Type Distribution — full width */}
          <ChartCard title="Alert Type Distribution" icon={<AlertTriangle className="h-4 w-4" />} className="mt-4">
            <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={typeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={50}
                    paddingAngle={4}
                    label={(props: PieLabelRenderProps) =>
                      `${String(props.name ?? '')}: ${String(props.value ?? '')} (${((Number(props.percent ?? 0)) * 100).toFixed(0)}%)`
                    }
                  >
                    {typeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-3">
                {typeData.map(entry => (
                  <div key={entry.name} className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-sm" style={{ background: entry.color }} />
                    <span className="text-sm text-slate-text">{entry.name}</span>
                    <span className="text-sm font-semibold text-slate-text">{entry.value}</span>
                    <span className="text-xs text-slate-muted">
                      ({((entry.value / Math.max(1, filtered.length)) * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  )
}

function downloadBlob(content: string, type: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function MetricTile({ label, value, sub, tone, icon }: {
  label: string; value: string; sub?: string; tone?: string; icon?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-slate-muted">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('mt-1 text-sm font-semibold text-slate-text', tone)}>{value}</p>
      {sub && <p className="text-[10px] text-slate-muted">{sub}</p>}
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center gap-1 text-slate-muted">
      <BarChart3 size={22} className="opacity-40" />
      <span className="text-xs">{message}</span>
    </div>
  )
}

function ChartCard({ title, icon, children, className }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('rounded-lg border border-slate-700 bg-slate-surface p-5', className)}>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-text">
        <span className="text-forest-light">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  )
}
