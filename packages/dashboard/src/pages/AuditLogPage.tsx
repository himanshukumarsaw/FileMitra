/**
 * Audit log page (spec #18) — every important action recorded in the shared
 * activity store: officer decisions, system events and team status changes.
 */

import { useMemo, useState, useSyncExternalStore } from 'react'
import { ShieldCheck, Download, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { subscribe, getAuditLog } from '@/services/activityStore'
import { useRole } from '@/providers/RoleProvider'
import { useToast } from '@/components/ui/Toast'

type ActorFilter = 'all' | 'system' | 'officer'

export function AuditLogPage() {
  const log = useSyncExternalStore(subscribe, getAuditLog)
  const [filter, setFilter] = useState<ActorFilter>('all')
  const [search, setSearch] = useState('')
  const { can, roleLabel } = useRole()
  const { push } = useToast()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return log.filter((e) => {
      if (filter === 'system' && e.actor !== 'System' && !e.actor.startsWith('Ranger')) return false
      if (filter === 'officer' && (e.actor === 'System' || e.actor.startsWith('Ranger'))) return false
      if (q && !`${e.actor} ${e.action} ${e.target ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [log, filter, search])

  const exportCsv = () => {
    const rows = [
      ['Timestamp', 'Actor', 'Action', 'Target'],
      ...filtered.map((e) => [e.at, e.actor, e.action, e.target ?? '']),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    push('success', `Audit log exported (${filtered.length} entries)`)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-text">
            <ShieldCheck className="h-6 w-6 text-forest-light" />
            Audit Log
          </h1>
          <p className="text-sm text-slate-muted">
            {filtered.length} recorded event{filtered.length !== 1 ? 's' : ''} — officer actions,
            system events and team status changes
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!can('export.reports') || filtered.length === 0}
          title={can('export.reports') ? 'Export audit log as CSV' : 'Analyst or Admin role required'}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-text transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['all', 'All events'],
            ['system', 'System'],
            ['officer', 'Officers'],
          ] as [ActorFilter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
              filter === value
                ? 'border-forest-light/40 bg-forest-light/10 text-forest-light'
                : 'border-white/5 bg-white/[0.02] text-slate-muted hover:bg-white/5 hover:text-slate-text'
            )}
          >
            {label}
          </button>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter entries…"
          aria-label="Filter audit log"
          className="ml-auto h-8 w-56 rounded-md border border-white/5 bg-white/[0.03] px-3 text-xs text-slate-text placeholder:text-slate-muted/50 focus:border-forest-light/40 focus:outline-none"
        />
      </div>

      {/* Log table */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-surface shadow-lg shadow-black/20">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-slate-muted">
            <ScrollText size={26} className="opacity-50" />
            <span className="text-sm">No audit entries yet.</span>
            <span className="text-xs opacity-70">
              Officer actions and live system events will be recorded here as they happen.
            </span>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="w-28 px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
                  Time
                </th>
                <th className="w-44 px-3 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
                  Actor
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
                  Action
                </th>
                <th className="w-36 px-3 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
                  Target
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((e) => (
                <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-slate-muted">
                    {new Date(e.at).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[11px] font-medium',
                        e.actor === 'System'
                          ? 'bg-blue-500/10 text-blue-400'
                          : e.actor.startsWith('Ranger')
                            ? 'bg-violet-500/10 text-violet-400'
                            : 'bg-forest-light/10 text-forest-light'
                      )}
                    >
                      {e.actor}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-text">{e.action}</td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-slate-muted">{e.target ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] text-slate-muted">
        Signed in as <span className="font-medium text-slate-text">{roleLabel}</span> · entries are
        recorded client-side for this demo session.
      </p>
    </div>
  )
}
