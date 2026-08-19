/**
 * Employee management page (spec #43) — list, search, and manage employees.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, MoreVertical, Edit3, Ban, KeyRound, Loader2, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEmployeeAuth } from '@/providers/EmployeeAuthProvider'
import { useToast } from '@/components/ui/Toast'
import {
  fetchAdminEmployees,
  updateAdminEmployee,
  updateEmployeeStatus,
  resetEmployeeAccess,
  type AdminEmployee,
  type PaginatedResponse,
} from '@/services/adminApi'

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'department_admin', 'office_admin'])

const STATUS_OPTIONS = ['active', 'inactive', 'suspended', 'on_leave']

export function AdminEmployees() {
  const { employee, isAuthenticated, isLoading } = useEmployeeAuth()
  const navigate = useNavigate()
  const { push } = useToast()

  const [data, setData] = useState<PaginatedResponse<AdminEmployee> | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', department: '', designation: '' })
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    fetchAdminEmployees({ page, limit: 20, search, department: department || undefined })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load employees')
          push('error', 'Failed to load employees')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, employee, page, search, department, push])

  const departments = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.data.map((e) => e.department).filter(Boolean)))
  }, [data])

  const startEdit = (emp: AdminEmployee) => {
    setEditingId(emp._id ?? emp.id ?? null)
    setEditForm({ full_name: emp.full_name, department: emp.department, designation: emp.designation })
    setOpenMenuId(null)
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      await updateAdminEmployee(editingId, editForm)
      push('success', 'Employee updated successfully')
      setEditingId(null)
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          data: prev.data.map((e) => (e._id === editingId || e.id === editingId ? { ...e, ...editForm } : e)),
        }
      })
    } catch (e) {
      push('error', e instanceof Error ? e.message : 'Failed to update employee')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    setOpenMenuId(null)
    try {
      const updated = await updateEmployeeStatus(id, newStatus)
      push('success', `Status updated to ${newStatus}`)
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          data: prev.data.map((e) => ((e._id === id || e.id === id) ? { ...e, status: updated.status } : e)),
        }
      })
    } catch (e) {
      push('error', e instanceof Error ? e.message : 'Failed to update status')
    }
  }

  const handleResetAccess = async (id: string) => {
    setOpenMenuId(null)
    try {
      await resetEmployeeAccess(id)
      push('success', 'Access reset successfully')
    } catch (e) {
      push('error', e instanceof Error ? e.message : 'Failed to reset access')
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
            <span className="text-slate-text">Employees</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-text">Manage Employees</h1>
          <p className="text-sm text-slate-muted">View and manage forest department employees</p>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by code or name..."
              className="h-9 w-full rounded-lg border border-white/10 bg-slate-surface pl-9 pr-3 text-sm text-slate-text placeholder:text-slate-muted/60 focus:border-forest-light/40 focus:outline-none"
            />
          </div>
          <select
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setPage(1) }}
            className="h-9 rounded-lg border border-white/10 bg-slate-surface px-3 text-sm text-slate-text focus:border-forest-light/40 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
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
              <span>Loading employees...</span>
            </div>
          ) : data && data.data.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-muted">No employees found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Employee Code</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Full Name</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Department</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Designation</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Status</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Registration</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((emp) => {
                    const id = emp._id ?? emp.id
                    if (!id) return null
                    const isEditing = editingId === id
                    return (
                      <tr key={id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-slate-muted">
                          {emp.employee_code}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-text">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.full_name}
                              onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                              className="h-7 rounded border border-white/10 bg-white/5 px-2 text-xs text-slate-text focus:border-forest-light/40 focus:outline-none"
                            />
                          ) : (
                            emp.full_name
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-text">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.department}
                              onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                              className="h-7 rounded border border-white/10 bg-white/5 px-2 text-xs text-slate-text focus:border-forest-light/40 focus:outline-none"
                            />
                          ) : (
                            emp.department
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-text">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.designation}
                              onChange={(e) => setEditForm((f) => ({ ...f, designation: e.target.value }))}
                              className="h-7 rounded border border-white/10 bg-white/5 px-2 text-xs text-slate-text focus:border-forest-light/40 focus:outline-none"
                            />
                          ) : (
                            emp.designation
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              'rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase',
                              emp.status === 'active'
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                : emp.status === 'inactive'
                                  ? 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                                  : emp.status === 'suspended'
                                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                                    : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                            )}
                          >
                            {emp.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-muted">
                          {emp.registration_status ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
                              className="rounded p-1 text-slate-muted hover:text-slate-text"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {openMenuId === id && (
                              <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-white/10 bg-slate-dark py-1 shadow-xl shadow-black/40">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={saveEdit}
                                      disabled={saving}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-text hover:bg-white/5 disabled:opacity-50"
                                    >
                                      {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-muted hover:bg-white/5 hover:text-slate-text"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => startEdit(emp)}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-text hover:bg-white/5"
                                    >
                                      <Edit3 className="h-3 w-3" /> Edit
                                    </button>
                                    <div className="mx-2 my-1 h-px bg-white/5" />
                                    {STATUS_OPTIONS.map((s) => (
                                      <button
                                        key={s}
                                        onClick={() => handleStatusChange(id, s)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-muted hover:bg-white/5 hover:text-slate-text"
                                      >
                                        <Ban className="h-3 w-3" /> Set {s}
                                      </button>
                                    ))}
                                    <div className="mx-2 my-1 h-px bg-white/5" />
                                    <button
                                      onClick={() => handleResetAccess(id)}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/5"
                                    >
                                      <KeyRound className="h-3 w-3" /> Reset Access
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
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
