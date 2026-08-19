/**
 * Forgot password flow (spec #37) — government-style password reset.
 * 1. Enter Employee ID with CAPTCHA
 * 2. OTP verification (reuses OtpVerification component)
 * 3. Create new password with strength meter
 */

import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { CaptchaField } from '@/components/auth/CaptchaField'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import { forgotPassword, verifyResetOtp, resetPassword } from '@/services/employeeApi'

type ForgotStep = 1 | 2 | 3

const STEPS: { label: string; description: string }[] = [
  { label: 'Find Account', description: 'Enter your Employee ID with CAPTCHA' },
  { label: 'Verify OTP', description: 'Enter the code sent to your mobile' },
  { label: 'Reset Password', description: 'Create a new password' },
]

export function ForgotPassword() {
  const [step, setStep] = useState<ForgotStep>(1)
  const [submitting, setSubmitting] = useState(false)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [otp, setOtp] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { push: toast } = useToast()
  const navigate = useNavigate()

  const handleSendOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!employeeCode || !captchaAnswer) {
        toast('error', 'Please enter your Employee ID and solve the CAPTCHA.')
        return
      }

      setSubmitting(true)
      try {
        const result = await forgotPassword({
          employeeCode,
          captchaToken: '',
          captchaAnswer,
        })
        if (result.success) {
          toast('success', 'OTP sent to your registered mobile number.')
          setStep(2)
        } else {
          toast('error', result.message)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to send OTP'
        toast('error', msg)
      } finally {
        setSubmitting(false)
      }
    },
    [employeeCode, captchaAnswer, toast]
  )

  const handleVerifyOtp = useCallback(async () => {
    if (!otp || otp.length !== 6) {
      toast('error', 'Please enter the complete 6-digit OTP.')
      return
    }

    setSubmitting(true)
    try {
        const result = await verifyResetOtp(employeeCode, otp)
        if (result.success) {
          toast('success', 'OTP verified. Now set your new password.')
          setResetToken(result.resetToken)
          setStep(3)
        } else {
          toast('error', result.message ?? 'OTP verification failed')
        }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'OTP verification failed'
      toast('error', msg)
    } finally {
      setSubmitting(false)
    }
  }, [otp, employeeCode, toast])

  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newPassword || !confirmPassword) {
        toast('error', 'Please fill in both password fields.')
        return
      }
      if (newPassword !== confirmPassword) {
        toast('error', 'Passwords do not match.')
        return
      }
      if (newPassword.length < 12) {
        toast('error', 'Password must be at least 12 characters long.')
        return
      }

      setSubmitting(true)
      try {
        const result = await resetPassword({
          resetToken,
          newPassword,
          confirmPassword,
        })
        if (result.success) {
          toast('success', 'Password reset successfully! Please log in.')
          navigate('/auth/login')
        } else {
          toast('error', result.message)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Password reset failed'
        toast('error', msg)
      } finally {
        setSubmitting(false)
      }
    },
    [resetToken, newPassword, confirmPassword, navigate, toast]
  )

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as ForgotStep)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-dark px-4 py-8">
      <main className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-light/15 ring-2 ring-forest-light/30">
            <KeyRound className="h-7 w-7 text-forest-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-text">Forest Department</h1>
            <p className="text-sm text-slate-muted">Employee Portal &middot; Forgot Password</p>
          </div>
        </div>

        <div className="mb-6 rounded-full bg-slate-surface/50 p-1.5">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const active = i + 1 === step
              const completed = i + 1 < step
              return (
                <div key={s.label} className="flex flex-1 flex-col items-center">
                  <div className="flex items-center justify-center">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                        active && 'bg-forest-light text-slate-950',
                        completed && 'bg-forest-light text-slate-950',
                        !active && !completed && 'border border-white/20 text-slate-muted'
                      )}
                    >
                      {completed ? <ShieldCheck className="h-4 w-4" /> : i + 1}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          'absolute h-0.5',
                          completed ? 'bg-forest-light' : 'bg-white/10'
                        )}
                        style={{ width: '6rem', marginLeft: '2rem' }}
                      />
                    )}
                  </div>
                  <span className="mt-1.5 text-xs font-medium text-slate-muted">{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-surface p-6 shadow-xl shadow-black/20">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-text">{STEPS[step - 1].label}</h2>
            <p className="text-sm text-slate-muted">{STEPS[step - 1].description}</p>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4.5">
              <div className="space-y-1.5">
                <label htmlFor="employee-code" className="block text-sm font-medium text-slate-text">
                  Employee ID
                </label>
                <input
                  id="employee-code"
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="e.g. FD-HR-0001"
                  disabled={submitting}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/30"
                  aria-required
                />
              </div>

              <CaptchaField value={captchaAnswer} onChange={setCaptchaAnswer} />

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors',
                  'bg-forest-light hover:bg-forest focus:outline-none focus:ring-2 focus:ring-forest-light/30',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {submitting ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-light/15">
                <ShieldCheck className="h-6 w-6 text-forest-light" />
              </div>
              <p className="text-center text-sm text-slate-muted">
                We sent a 6-digit OTP to the mobile number registered with{' '}
                <span className="font-medium text-slate-text">{employeeCode}</span>.
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                disabled={submitting}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-center text-xl font-mono text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/30"
                aria-label="OTP code"
                aria-required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-muted transition-colors hover:bg-white/5"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={submitting || !otp || otp.length !== 6}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-semibold text-slate-950 transition-colors',
                    'bg-forest-light hover:bg-forest focus:outline-none focus:ring-2 focus:ring-forest-light/30',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  {submitting ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4.5">
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-text">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/30"
                  aria-required
                />
              </div>

              <PasswordStrengthMeter
                password={newPassword}
                employeeCode={employeeCode || undefined}
              />

              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-text">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/30"
                  aria-required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-muted transition-colors hover:bg-white/5"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors',
                    'bg-forest-light hover:bg-forest focus:outline-none focus:ring-2 focus:ring-forest-light/30',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  {submitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-slate-muted">
          <Link to="/auth/login" className="font-medium text-forest-light hover:text-forest">
            Back to Login
          </Link>
        </div>
      </main>
    </div>
  )
}
