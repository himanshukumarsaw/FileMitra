/**
 * Employee dashboard (spec #38) — landing page after employee login.
 */

import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  UserCircle, Clock, FileText, CalendarDays, Shield, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEmployeeAuth } from '@/providers/EmployeeAuthProvider'

const QUICK_LINKS = [
  { label: 'My Profile', icon: UserCircle, path: '/employee/profile', color: 'text-forest-light' },
  { label: 'My Attendance', icon: Clock, path: '/employee/attendance', color: 'text-blue-400' },
  { label: 'Leave Applications', icon: CalendarDays, path: '/employee/leaves', color: 'text-amber' },
  { label: 'Documents', icon: FileText, path: '/employee/documents', color: 'text-slate-400' },
]

export function EmployeeDashboard() {
  const { employee, isAuthenticated, logout, isLoading } = useEmployeeAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth/login')
    }
  }, [isLoading, isAuthenticated, navigate])

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

  if (!isAuthenticated || !employee) return null

  return (
    <div className="min-h-screen bg-slate-dark py-8">
      <div className="mx-auto max-w-7xl px-4">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-light/15 ring-2 ring-forest-light/30">
              <UserCircle className="h-7 w-7 text-forest-light" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-text">Welcome, {employee.full_name}</h1>
              <p className="text-sm text-slate-muted">
                {employee.designation} &middot; {employee.department}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-muted transition-colors hover:bg-white/5 hover:text-slate-text"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </header>

        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-text">Quick Links</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className="rounded-xl border border-white/10 bg-slate-surface p-5 text-center shadow-lg shadow-black/20 transition-colors hover:border-forest-light/30 hover:bg-forest-light/5"
                >
                  <div
                    className={cn(
                      'mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', link.color)} />
                  </div>
                  <span className="block text-sm font-medium text-slate-text">{link.label}</span>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-surface p-5 shadow-lg shadow-black/20">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-forest-light" />
            <h3 className="text-sm font-semibold text-slate-text">Security Information</h3>
          </div>
          <div className="space-y-2.5 text-xs text-slate-muted">
            <div className="flex justify-between">
              <span>Role</span>
              <span className="font-medium text-slate-text">{employee.role.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span>Employee ID</span>
              <span className="font-medium text-slate-text">{employee.employee_code}</span>
            </div>
            {employee.office && (
              <div className="flex justify-between">
                <span>Office</span>
                <span className="font-medium text-slate-text">{employee.office}</span>
              </div>
            )}
            {employee.district && (
              <div className="flex justify-between">
                <span>District</span>
                <span className="font-medium text-slate-text">{employee.district}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Session</span>
              <span className="text-forest-light">Active</span>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-amber/20 bg-amber/10 px-3.5 py-2.5">
            <p className="text-xs text-amber">
              This is a secure government portal. All activity is monitored and audited per the
              Forest Department IT Security Policy. Log out when stepping away.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
