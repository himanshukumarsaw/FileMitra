/**
 * Employee signup (spec #36) — multi-step registration:
 * 1. Employee verification (code, DOB, department, CAPTCHA)
 * 2. OTP verification (reuses OtpVerification component)
 * 3. Account creation (login ID, password + strength meter)
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { OtpInput } from '@/components/auth/OtpInput'
import { CaptchaField } from '@/components/auth/CaptchaField'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import { verifyEmployee, sendOtp, verifyOtp as apiVerifyOtp, registerAccount } from '@/services/employeeApi'
import type { Employee } from '@/providers/EmployeeAuthProvider'

interface VerifiedEmployee extends Employee {
  registrationId: string
}

type SignupStep = 1 | 2 | 3

const STEPS: { label: string; description: string }[] = [
  { label: 'Verify Employee', description: 'Confirm your employment details' },
  { label: 'OTP Verification', description: 'Enter the code sent to your mobile' },
  { label: 'Create Account', description: 'Set your login credentials' },
]

export function Signup() {
  const [step, setStep] = useState<SignupStep>(1)
  const [verifiedEmployee, setVerifiedEmployee] = useState<VerifiedEmployee | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaChallengeId, setCaptchaChallengeId] = useState('')

  const { push: toast } = useToast()
  const navigate = useNavigate()

  const [step1, setStep1] = useState({
    employeeCode: '',
    dob: '',
    registeredMobile: '',
    department: '',
  })

  const [step2, setStep2] = useState({
    otp: '',
  })

  const [step3, setStep3] = useState({
    loginId: '',
    password: '',
    confirmPassword: '',
  })

  const handleVerifyStep1 = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!step1.employeeCode || !step1.dob || !step1.registeredMobile || !step1.department || !captchaAnswer || !captchaChallengeId) {
      toast('error', 'Please fill in all fields including the CAPTCHA.')
      return
    }

    setSubmitting(true)
    try {
      const result = await verifyEmployee({
        employeeCode: step1.employeeCode,
        dob: step1.dob,
        captchaToken: captchaChallengeId,
        captchaAnswer,
      })

      if (result.success) {
        const emp = result as VerifiedEmployee
        setVerifiedEmployee(emp)
        toast('success', 'Employee verified. Sending OTP...')
        await sendOtp(emp.registrationId)
        toast('success', 'OTP sent to your registered mobile number.')
        setStep(2)
      } else {
        toast('error', result.message)
        setCaptchaAnswer('')
        setCaptchaChallengeId('')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Verification failed'
      toast('error', msg)
    } finally {
      setSubmitting(false)
    }
  }, [step1, captchaAnswer, captchaChallengeId, toast])

  const handleOtpVerified = useCallback(async () => {
    if (!step2.otp || step2.otp.length !== 6) {
      toast('error', 'Please enter the complete 6-digit OTP.')
      return
    }
    if (!verifiedEmployee) {
      toast('error', 'No verified employee found. Please start over.')
      return
    }

    setSubmitting(true)
    try {
      const result = await apiVerifyOtp(verifiedEmployee.registrationId, step2.otp)
      if (result.success) {
        toast('success', 'OTP verified successfully.')
        setStep(3)
        setStep3({
          loginId: verifiedEmployee.employee_code ?? '',
          password: '',
          confirmPassword: '',
        })
      } else {
        toast('error', result.message)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'OTP verification failed'
      toast('error', msg)
    } finally {
      setSubmitting(false)
    }
  }, [step2.otp, verifiedEmployee, toast])

  const handleCreateAccount = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!step3.loginId || !step3.password || !step3.confirmPassword) {
      toast('error', 'Please fill in all fields.')
      return
    }
    if (step3.password !== step3.confirmPassword) {
      toast('error', 'Passwords do not match.')
      return
    }
    if (!verifiedEmployee) {
      toast('error', 'No verified employee found. Please start over.')
      return
    }

    setSubmitting(true)
    try {
      const result = await registerAccount({
        registrationId: verifiedEmployee.registrationId,
        loginId: step3.loginId,
        password: step3.password,
        confirmPassword: step3.confirmPassword,
      })
      if (result.success) {
        toast('success', 'Account created successfully! Please log in.')
        navigate('/auth/login')
      } else {
        toast('error', result.message)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Registration failed'
      toast('error', msg)
    } finally {
      setSubmitting(false)
    }
  }, [step3, verifiedEmployee, toast, navigate])

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as SignupStep)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-dark px-4 py-8">
      <main className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-light/15 ring-2 ring-forest-light/30">
            <UserPlus className="h-7 w-7 text-forest-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-text">Forest Department</h1>
            <p className="text-sm text-slate-muted">Employee Registration Portal</p>
          </div>
        </div>

        <div className="mb-6 rounded-full bg-slate-surface/50 p-1.5">
          <div className="flex items-center justify-between text-center">
            {STEPS.map((s, i) => {
              const active = i + 1 === step
              const completed = i + 1 < step
              return (
                <div key={s.label} className="flex flex-1 flex-col">
                  <div className="flex items-center justify-center">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                        active && 'bg-forest-light text-slate-950',
                        completed && 'bg-forest-light text-slate-950',
                        !active && !completed && 'border border-white/20 text-slate-muted'
                      )}
                    >
                      {completed ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          'absolute h-0.5 flex-1',
                          completed ? 'bg-forest-light' : 'bg-white/10'
                        )}
                        style={{ width: '7rem', marginLeft: '2rem' }}
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
            <form onSubmit={handleVerifyStep1} className="space-y-4.5">
              <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="employee-code" className="block text-sm font-medium text-slate-text">
                    Employee Code
                  </label>
                  <input
                    id="employee-code"
                    type="text"
                    value={step1.employeeCode}
                    onChange={(e) => setStep1({ ...step1, employeeCode: e.target.value })}
                    placeholder="e.g. FD-HR-0001"
                    disabled={submitting}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/30"
                    aria-required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="dob" className="block text-sm font-medium text-slate-text">
                    Date of Birth
                  </label>
                  <input
                    id="dob"
                    type="date"
                    value={step1.dob}
                    onChange={(e) => setStep1({ ...step1, dob: e.target.value })}
                    disabled={submitting}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/30"
                    aria-required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="mobile" className="block text-sm font-medium text-slate-text">
                    Registered Mobile (last 4)
                  </label>
                  <input
                    id="mobile"
                    type="text"
                    value={step1.registeredMobile}
                    onChange={(e) => setStep1({ ...step1, registeredMobile: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="e.g. 1234"
                    maxLength={4}
                    disabled={submitting}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/30"
                    aria-required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="department" className="block text-sm font-medium text-slate-text">
                    Department
                  </label>
                  <input
                    id="department"
                    type="text"
                    value={step1.department}
                    onChange={(e) => setStep1({ ...step1, department: e.target.value })}
                    placeholder="e.g. Wildlife Conservation"
                    disabled={submitting}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/30"
                    aria-required
                  />
                </div>
              </div>

              <CaptchaField
                value={captchaAnswer}
                onChange={setCaptchaAnswer}
                onChallenge={setCaptchaChallengeId}
              />

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors',
                  'bg-forest-light hover:bg-forest focus:outline-none focus:ring-2 focus:ring-forest-light/30',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {submitting ? 'Verifying...' : 'Verify Employee'}
              </button>
            </form>
          )}

          {step === 2 && verifiedEmployee && (
            <div className="flex flex-col items-center gap-6 py-4">
              <CheckCircle2 className="h-12 w-12 text-forest-light" />
              <p className="text-center text-sm text-slate-muted">
                An OTP has been sent to the mobile number registered with employee{' '}
                <span className="font-medium text-slate-text">{verifiedEmployee.employee_code}</span>.
              </p>
              <p className="text-center text-xs text-slate-muted">
                Enter the 6-digit code below to verify your identity.
              </p>
              <div className="flex justify-center">
                <OtpInput
                  value={step2.otp}
                  onChange={(val) => setStep2({ ...step2, otp: val })}
                  length={6}
                  autoFocus
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
                  type="button"
                  onClick={handleOtpVerified}
                  disabled={submitting || step2.otp.length !== 6}
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

          {step === 3 && verifiedEmployee && (
            <form onSubmit={handleCreateAccount} className="space-y-4.5">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <h3 className="mb-2 text-xs font-medium text-slate-muted">Employee Information</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-muted">Name:</span>
                    <span className="font-medium text-slate-text">{verifiedEmployee.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-muted">Code:</span>
                    <span className="font-medium text-slate-text">{verifiedEmployee.employee_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-muted">Department:</span>
                    <span className="font-medium text-slate-text">{verifiedEmployee.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-muted">Designation:</span>
                    <span className="font-medium text-slate-text">{verifiedEmployee.designation}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-id" className="block text-sm font-medium text-slate-text">
                  Login ID
                </label>
                <input
                  id="login-id"
                  type="text"
                  value={step3.loginId}
                  onChange={(e) => setStep3({ ...step3, loginId: e.target.value })}
                  disabled={submitting}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/30"
                  aria-required
                />
                <p className="text-xs text-slate-muted">This will be your login ID (same as employee code).</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-text">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={step3.password}
                  onChange={(e) => setStep3({ ...step3, password: e.target.value })}
                  disabled={submitting}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/30"
                  aria-required
                />
              </div>

              <PasswordStrengthMeter
                password={step3.password}
                employeeCode={verifiedEmployee.employee_code}
                employeeMobile={step1.registeredMobile || undefined}
              />

              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-text">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={step3.confirmPassword}
                  onChange={(e) => setStep3({ ...step3, confirmPassword: e.target.value })}
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
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-slate-muted">
          Already have an account?{' '}
          <a
            href="/auth/login"
            className="font-medium text-forest-light hover:text-forest"
          >
            Sign in
          </a>
        </div>
      </main>
    </div>
  )
}
