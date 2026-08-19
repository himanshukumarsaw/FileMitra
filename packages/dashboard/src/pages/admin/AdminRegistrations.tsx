/**
 * Registration requests page (spec #44) — approve or reject employee self-registrations.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, X, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEmployeeAuth } from '@/providers/EmployeeAuthProvider'
import { useToast } from '@/components/ui/Toast'
import {
  fetchAdminRegistrations,
  approveRegistration,
  rejectRegistration,
  type AdminRegistration,
  type PaginatedResponse,
} from '@/services/adminApi'

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'department_admin', 'office_admin'])

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  OTP_VERIFIED: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  ACCOUNT_CREATED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  REJECTED: 'border-red-500/30 bg-red-500/10 text-red-400',
}

export function AdminRegistrations() {
  const { employee, isAuthenticated, isLoading } = useEmployeeAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const [data, setData] = useState<PaginatedResponse<AdminRegistration> | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)

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
    fetchAdminRegistrations({ page, limit: 20, status: statusFilter || undefined })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load registrations')
          push('error', 'Failed to load registrations')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, employee, page, statusFilter, push])

  const handleApprove = async (id: string) => {
    setActionId(id)
    try {
      await approveRegistration(id)
      push('success', 'Registration approved')
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          data: prev.data.map((r) => ((r._id === id || r.id === id) ? { ...r, status: 'ACCOUNT_CREATED' } : r)),
        }
      })
    } catch (e) {
      push('error', e instanceof Error ? e.message : 'Failed to approve registration')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (id: string) => {
    setActionId(id)
    try {
      await rejectRegistration(id)
      push('success', 'Registration rejected')
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          data: prev.data.map((r) => ((r._id === id || r.id === id) ? { ...r, status: 'REJECTED' } : r)),
        }
      })
    } catch (e) {
      push('error', e instanceof Error ? e.message : 'Failed to reject registration')
    } finally {
      setActionId(null)
    }
  }

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
            <span className="text-slate-text">Registration Requests</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-text">Registration Requests</h1>
          <p className="text-sm text-slate-muted">Review and process employee self-registrations</p>
        </header>

        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="h-9 rounded-lg border border-white/10 bg-slate-surface px-3 text-sm text-slate-text focus:border-forest-light/40 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="OTP_VERIFIED">OTP Verified</option>
            <option value="ACCOUNT_CREATED">Account Created</option>
            <option value="REJECTED">Rejected</option>
          </select>
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
              <span>Loading registrations...</span>
            </div>
          ) : data && data.data.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-muted">No registration requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Employee Code</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Name</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">DOB</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Status</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Created At</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((reg) => {
                    const id = reg._id ?? reg.id
                    if (!id) return null
                    const isPending = reg.status === 'PENDING'
                    const isOtpVerified = reg.status === 'OTP_VERIFIED'
                    const canAct = isPending || isOtpVerified
                    return (
                      <tr key={id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-slate-muted">
                          {reg.employee_code}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-text">{reg.full_name}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-muted">
                          {reg.dob ? new Date(reg.dob).toLocaleDateString() : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              'rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase',
                              STATUS_STYLES[reg.status] ?? 'border-white/10 bg-white/5 text-slate-muted'
                            )}
                          >
                            {reg.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-muted">
                          {new Date(reg.createdAt).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {canAct ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApprove(id)}
                                disabled={actionId === id}
                                className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actionId === id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(id)}
                                disabled={actionId === id}
                                className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actionId === id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-muted">No actions</span>
                          )}
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
                  className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-text transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-text transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
