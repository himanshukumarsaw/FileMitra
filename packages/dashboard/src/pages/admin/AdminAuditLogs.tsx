/**
 * Audit log viewer (spec #45) — view system audit logs with filtering and pagination.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Filter, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEmployeeAuth } from '@/providers/EmployeeAuthProvider'
import { useToast } from '@/components/ui/Toast'
import {
  fetchAdminAuditLogs,
  type AdminAuditLog,
  type PaginatedResponse,
} from '@/services/adminApi'

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'department_admin', 'office_admin'])

export function AdminAuditLogs() {
  const { employee, isAuthenticated, isLoading } = useEmployeeAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const [data, setData] = useState<PaginatedResponse<AdminAuditLog> | null>(null)
  const [page, setPage] = useState(1)
  const [eventType, setEventType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !employee || !ADMIN_ROLES.has(employee.role))) {
      navigate('/auth/login')
    }
  }, [isLoading, isAuthenticated, employee, navigate])

  useEffect(() => {
    if (!isAuthenticated || !employee || !ADMIN_ROLES.has(employee.role)) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAdminAuditLogs({ page, limit: 20, event_type: eventType || undefined, start_date: startDate || undefined, end_date: endDate || undefined })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load audit logs')
          push('error', 'Failed to load audit logs')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, employee, page, eventType, startDate, endDate, push])

  const filteredLogs = useMemo(() => {
    if (!data || !search.trim()) return data?.data ?? []
    const q = search.toLowerCase()
    return data.data.filter((log) => {
      const text = `${log.event_type} ${log.employee_code ?? ''} ${log.employee_name ?? ''} ${log.ip} ${log.action ?? ''} ${log.actor ?? ''} ${log.target ?? ''}`.toLowerCase()
      return text.includes(q)
    })
  }, [data, search])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-dark">
        <div className="flex items-center gap-2 text-slate-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !employee || !ADMIN_ROLES.has(employee.role)) return null

  return (
    <div className="min-h-screen bg-slate-dark py-8">
      <div className="mx-auto max-w-7xl px-4">
        <header className="mb-6">
          <nav className="mb-3 flex items-center gap-2 text-xs text-slate-muted">
            <Link to="/admin" className="hover:text-slate-text">Admin Panel</Link>
            <span>/</span>
            <span className="text-slate-text">Audit Logs</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-text">Audit Logs</h1>
          <p className="text-sm text-slate-muted">System events, user actions, and security logs</p>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="h-9 w-full rounded-lg border border-white/10 bg-slate-surface pl-9 pr-3 text-sm text-slate-text placeholder:text-slate-muted/60 focus:border-forest-light/40 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-muted" />
            <input
              type="text"
              value={eventType}
              onChange={(e) => { setEventType(e.target.value); setPage(1) }}
              placeholder="Event type"
              className="h-9 w-40 rounded-lg border border-white/10 bg-slate-surface px-3 text-sm text-slate-text placeholder:text-slate-muted/60 focus:border-forest-light/40 focus:outline-none"
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
              className="h-9 rounded-lg border border-white/10 bg-slate-surface px-3 text-sm text-slate-text focus:border-forest-light/40 focus:outline-none"
            />
            <span className="text-xs text-slate-muted">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
              className="h-9 rounded-lg border border-white/10 bg-slate-surface px-3 text-sm text-slate-text focus:border-forest-light/40 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-surface shadow-lg shadow-black/20">
          {error ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : loading && !data ? (
            <div className="flex items-center justify-center gap-2 px-4 py-12 text-slate-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading audit logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-muted">No audit logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Timestamp</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Event Type</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Employee Code</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">IP</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Success</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const id = log._id ?? log.id
                    return (
                      <tr key={id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-slate-muted">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-text">
                          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono">
                            {log.event_type}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs font-mono text-slate-muted">
                          {log.employee_code ?? log.employee_name ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-muted">
                          {log.ip}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <span
                            className={cn(
                              'rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase',
                              log.success
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                : 'border-red-500/30 bg-red-500/10 text-red-400'
                            )}
                          >
                            {log.success ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="max-w-xs truncate px-4 py-2.5 text-xs text-slate-muted">
                          {log.metadata && Object.keys(log.metadata).length > 0
                            ? JSON.stringify(log.metadata)
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
              <span className="text-xs text-slate-muted">
                Page {data.page} of {data.totalPages} &middot; {data.total} total
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-text transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3 w-3" /> Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-text transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
