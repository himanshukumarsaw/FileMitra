/**
 * Employee login page (spec #34) — government-style login with forest theme.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Shield, Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useEmployeeAuth } from '@/providers/EmployeeAuthProvider'

const DEMO_CREDENTIALS = {
  employeeCode: 'FD-HR-0001',
  password: 'Forest@2026!Secure',
}

export function Login() {
  const [employeeCode, setEmployeeCode] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { login } = useEmployeeAuth()
  const { push: toast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeCode || !password) {
      toast('error', 'Please enter both Employee ID and Password.')
      return
    }
    setSubmitting(true)
    try {
      await login(employeeCode, password)
      navigate('/employee/dashboard')
    } catch {
      // error toast already shown in provider
    } finally {
      setSubmitting(false)
    }
  }

  function fillDemo() {
    setEmployeeCode(DEMO_CREDENTIALS.employeeCode)
    setPassword(DEMO_CREDENTIALS.password)
    toast('info', 'Demo credentials filled in.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-dark px-4 py-8">
      <main className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-light/15 ring-2 ring-forest-light/30">
            <Leaf className="h-7 w-7 text-forest-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-text">Forest Department</h1>
            <p className="text-sm text-slate-muted">Employee Login Portal</p>
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-amber/20 bg-amber/10 px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-xs font-medium text-amber">
            <Shield className="h-3.5 w-3.5" />
            <span>DEMO CREDENTIALS</span>
          </div>
          <div className="mt-1.5 space-y-1 text-xs text-slate-muted">
            <div>
              <span className="font-medium text-slate-text">Employee ID:</span> {DEMO_CREDENTIALS.employeeCode}
            </div>
            <div>
              <span className="font-medium text-slate-text">Password:</span> {DEMO_CREDENTIALS.password}
            </div>
          </div>
          <button
            type="button"
            onClick={fillDemo}
            className="mt-2 text-xs font-medium text-forest-light underline underline-offset-2 hover:text-forest"
          >
            Fill demo credentials
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-white/10 bg-slate-surface p-6 shadow-xl shadow-black/20"
        >
          <h2 className="mb-5 text-center text-xl font-bold text-slate-text">Employee Login</h2>

          <div className="space-y-4.5">
            <div className="space-y-1.5">
              <label htmlFor="employee-id" className="block text-sm font-medium text-slate-text">
                Employee ID
              </label>
              <input
                id="employee-id"
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="e.g. FD-HR-0001"
                disabled={submitting}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/30"
                aria-required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-text">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={submitting}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 pr-10 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/30"
                  aria-required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-muted hover:text-forest-light"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-text">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={submitting}
                  className="h-4 w-4 rounded border-white/10 bg-slate-dark text-forest-light focus:ring-forest-light/30"
                />
                Remember me
              </label>
              <Link
                to="/auth/forgot-password"
                className="text-sm font-medium text-forest-light hover:text-forest"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting || !employeeCode || !password}
              className={cn(
                'w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors',
                'bg-forest-light hover:bg-forest focus:outline-none focus:ring-2 focus:ring-forest-light/30',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-slate-muted">
          New Employee?{' '}
          <Link to="/auth/signup" className="font-medium text-forest-light hover:text-forest">
            Register
          </Link>
        </div>

        <div className="mt-8 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3.5 text-center text-xs text-slate-muted">
          <p className="mb-1">
            Protected portal for authorised Forest Department personnel. All activity is logged.
          </p>
          <p>
            By accessing this system, you consent to security monitoring and auditing per the IT
            Security Policy.
          </p>
        </div>
      </main>
    </div>
  )
}
