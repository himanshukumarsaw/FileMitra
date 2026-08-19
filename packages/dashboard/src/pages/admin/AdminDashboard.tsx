/**
 * Admin dashboard (spec #42) — landing page after admin login.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, UserCheck, FileText, ScrollText, Shield, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEmployeeAuth } from '@/providers/EmployeeAuthProvider'
import { useToast } from '@/components/ui/Toast'
import { fetchAdminStats, type AdminStats } from '@/services/adminApi'

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'department_admin', 'office_admin'])

const QUICK_LINKS = [
  { label: 'Manage Employees', icon: Users, path: '/admin/employees', color: 'text-forest-light' },
  { label: 'Registration Requests', icon: UserCheck, path: '/admin/registrations', color: 'text-blue-400' },
  { label: 'Audit Logs', icon: ScrollText, path: '/admin/audit-logs', color: 'text-amber' },
]

export function AdminDashboard() {
  const { employee, isAuthenticated, isLoading } = useEmployeeAuth()
  const navigate = useNavigate()
  const { push } = useToast()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !employee || !ADMIN_ROLES.has(employee.role))) {
      navigate('/auth/login')
    }
  }, [isLoading, isAuthenticated, employee, navigate])

  useEffect(() => {
    if (!isAuthenticated || !employee || !ADMIN_ROLES.has(employee.role)) return
    let cancelled = false
    setLoadingStats(true)
    setError(null)
    fetchAdminStats()
      .then((s) => {
        if (!cancelled) setStats(s)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load stats')
          push('error', 'Failed to load dashboard stats')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, employee, push])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-dark">
        <div className="flex items-center gap-2 text-slate-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-forest-light border-t-transparent" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !employee || !ADMIN_ROLES.has(employee.role)) return null

  return (
    <div className="min-h-screen bg-slate-dark py-8">
      <div className="mx-auto max-w-7xl px-4">
        <header className="mb-8">
          <nav className="mb-4 flex items-center gap-2 text-xs text-slate-muted">
            <Link to="/" className="hover:text-slate-text">Home</Link>
            <span>/</span>
            <span className="text-slate-text">Admin Panel</span>
          </nav>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-light/15 ring-2 ring-forest-light/30">
              <Shield className="h-7 w-7 text-forest-light" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-text">Admin Panel</h1>
              <p className="text-sm text-slate-muted">
                {employee.designation} &middot; {employee.department}
              </p>
            </div>
          </div>
        </header>

        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-text">Overview</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Employees', value: stats?.totalEmployees ?? '—', icon: Users, color: 'text-forest-light' },
              { label: 'Active Registrations', value: stats?.activeRegistrations ?? '—', icon: UserCheck, color: 'text-blue-400' },
              { label: 'Pending Approvals', value: stats?.pendingApprovals ?? '—', icon: FileText, color: 'text-amber' },
              { label: 'Audit Events', value: stats?.auditEvents ?? '—', icon: ScrollText, color: 'text-violet-400' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-slate-surface p-5 shadow-lg shadow-black/20"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-muted">{item.label}</span>
                    <Icon className={cn('h-4 w-4', item.color)} />
                  </div>
                  <div className="text-2xl font-bold text-slate-text">
                    {loadingStats ? (
                      <span className="inline-block h-6 w-16 animate-pulse rounded bg-white/10" />
                    ) : error ? (
                      <span className="text-sm text-red-400">Error</span>
                    ) : (
                      item.value
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-text">Quick Links</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-slate-surface p-5 shadow-lg shadow-black/20 transition-colors hover:border-forest-light/30 hover:bg-forest-light/5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
                    <Icon className={cn('h-5 w-5', link.color)} />
                  </div>
                  <div className="flex-1">
                    <span className="block text-sm font-medium text-slate-text">{link.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-muted" />
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
