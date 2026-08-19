/**
 * Standalone OTP verification page (spec #35) — shared by Signup and
 * Forgot Password flows.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ShieldCheck, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { OtpInput, ResendTimer } from '@/components/auth/OtpInput'
import { verifyOtp, sendOtp } from '@/services/employeeApi'

type OtpContext = 'signup' | 'forgot_password'

interface LocationState {
  registrationId?: string
  employeeCode?: string
  context?: OtpContext
}

export function OtpVerification() {
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { push: toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const state = (location.state as LocationState | null) ?? {}
  const context: OtpContext = state.context ?? 'signup'
  const registrationId = state.registrationId
  const employeeCode = state.employeeCode

  useEffect(() => {
    if (!registrationId && !employeeCode) {
      toast('error', 'No verification context found. Please start over.')
      navigate('/auth/signup')
    }
  }, [registrationId, employeeCode, navigate, toast])

  const handleVerify = useCallback(async () => {
    if (!otp || otp.length !== 6) {
      toast('error', 'Please enter the complete 6-digit code.')
      return
    }

    setVerifying(true)
    setError(null)
    try {
      const id = registrationId ?? employeeCode ?? ''
      const result = await verifyOtp(id, otp)
      if (result.success) {
        toast('success', 'OTP verified successfully.')
        if (context === 'signup') {
          navigate('/auth/login', {
            state: { registrationId, employeeCode },
          })
        } else {
          navigate('/auth/reset-password', {
            state: { employeeCode, resetToken: result.resetToken },
          })
        }
      } else {
        setError(result.message)
        toast('error', result.message)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Verification failed'
      setError(msg)
      toast('error', msg)
    } finally {
      setVerifying(false)
    }
  }, [otp, registrationId, employeeCode, context, navigate, toast])

  const handleResend = useCallback(async () => {
    const id = registrationId ?? employeeCode ?? ''
    setResendLoading(true)
    try {
      await sendOtp(id)
      toast('success', 'New OTP sent to your registered contact.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to resend OTP'
      toast('error', msg)
    } finally {
      setResendLoading(false)
    }
  }, [registrationId, employeeCode, toast])

  const isFormValid = otp.length === 6

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-dark px-4 py-8">
      <main className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-light/15 ring-2 ring-forest-light/30">
            <ShieldCheck className="h-7 w-7 text-forest-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-text">Forest Department</h1>
            <p className="text-sm text-slate-muted">
              {context === 'signup' ? 'Account Registration' : 'Password Reset'} &middot; Verify OTP
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-surface p-6 shadow-xl shadow-black/20">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-slate-text">Enter Verification Code</h2>
            <p className="mt-1.5 text-sm text-slate-muted">
              We sent a 6-digit code to your registered mobile number ending in{' '}
              <span className="font-medium text-slate-text">****{employeeCode?.slice(-4) ?? '0000'}</span>.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex justify-center">
              <OtpInput
                value={otp}
                onChange={setOtp}
                onComplete={() => {
                  if (isFormValid) {
                    void handleVerify()
                  }
                }}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <ResendTimer
              initialSeconds={42}
              onResend={handleResend}
              loading={resendLoading}
            />

            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying || !isFormValid}
              className={cn(
                'w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors',
                'bg-forest-light hover:bg-forest focus:outline-none focus:ring-2 focus:ring-forest-light/30',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              {verifying ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-slate-muted">
            <Link to={context === 'signup' ? '/auth/signup' : '/auth/forgot-password'} className="text-forest-light hover:text-forest">
              Back
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-muted">
          <p>{context === 'signup' ? 'Already have an account?' : 'Remember your password?'}</p>
          <Link
            to={context === 'signup' ? '/auth/login' : '/auth/login'}
            className="font-medium text-forest-light hover:text-forest"
          >
            {context === 'signup' ? 'Sign in' : 'Sign in'}
          </Link>
        </div>
      </main>
    </div>
  )
}
