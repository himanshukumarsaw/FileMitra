/**
 * Password strength meter (spec #31) — real-time feedback for the
 * employee password requirements.
 */

import { useMemo } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEmployeeAuth } from '@/providers/EmployeeAuthProvider'

interface PasswordStrengthMeterProps {
  password: string
  employeeCode?: string
  employeeMobile?: string
}

interface Requirement {
  id: string
  label: string
  met: boolean
}

const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']

export function PasswordStrengthMeter({
  password,
  employeeCode,
  employeeMobile,
}: PasswordStrengthMeterProps) {
  const { employee } = useEmployeeAuth()

  const requirements: Requirement[] = useMemo(() => {
    const mobileLast4 = employeeMobile ?? employee?.employee_code
    const codeMatch = employeeCode ?? employee?.employee_code

    const checks: Requirement[] = [
      {
        id: 'length',
        label: 'At least 12 characters',
        met: password.length >= 12,
      },
      {
        id: 'uppercase',
        label: 'Contains uppercase letter',
        met: /[A-Z]/.test(password),
      },
      {
        id: 'lowercase',
        label: 'Contains lowercase letter',
        met: /[a-z]/.test(password),
      },
      {
        id: 'number',
        label: 'Contains a number',
        met: /[0-9]/.test(password),
      },
      {
        id: 'special',
        label: 'Contains a special character',
        met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      },
    ]

    if (codeMatch) {
      checks.push({
        id: 'no-code',
        label: `Must not contain your employee code (${codeMatch})`,
        met: !password.toLowerCase().includes(codeMatch.toLowerCase()),
      })
    }

    if (mobileLast4 && mobileLast4.length >= 4) {
      checks.push({
        id: 'no-mobile',
        label: 'Must not contain your registered mobile number',
        met: !password.includes(mobileLast4),
      })
    }

    return checks
  }, [password, employeeCode, employeeMobile, employee])

  const score = useMemo(
    () => Math.max(0, Math.min(4, Math.floor(requirements.filter((r) => r.met).length / 2))),
    [requirements]
  )

  const allMet = requirements.every((r) => r.met)
  const strengthLabel = STRENGTH_LABELS[score]

  return (
    <div className="space-y-2.5" aria-label="Password strength requirements">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-muted">Password strength: {strengthLabel}</span>
        <span className="tabular-nums text-slate-muted">
          {requirements.filter((r) => r.met).length}/{requirements.length} requirements met
        </span>
      </div>

      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-slate-700"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-label="Password strength progress"
      >
        <div
          className={cn(
            'h-full w-1/4 transition-all duration-300',
            score >= 1 && 'w-1/4',
            score >= 2 && 'w-2/4',
            score >= 3 && 'w-3/4',
            score >= 4 && 'w-full',
            score === 0 && 'w-0',
            score === 1 && 'bg-red-500',
            score === 2 && 'bg-orange-500',
            score === 3 && 'bg-amber-400',
            score === 4 && 'bg-forest-light'
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {requirements.map((req) => (
          <div key={req.id} className="flex items-center gap-1.5 text-xs">
            {req.met ? (
              <Check className="h-3 w-3 text-forest-light" />
            ) : (
              <X className="h-3 w-3 text-slate-muted" />
            )}
            <span className={cn('text-slate-muted', req.met && 'text-forest-light')}>
              {req.label}
            </span>
          </div>
        ))}
      </div>

      {allMet && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-forest-light">
          <Check className="h-3 w-3" />
          Password meets all requirements
        </div>
      )}
    </div>
  )
}
