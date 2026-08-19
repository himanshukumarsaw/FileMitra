/**
 * 6-digit OTP input (spec #33) — auto-focus, auto-advance, and resend timer.
 */

import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const [values, setValues] = useState<string[]>(() => {
    const arr = value.split('')
    return [...arr, ...Array.from({ length: Math.max(0, length - arr.length) }, () => '')]
  })

  const inputsRef = useRef<HTMLInputElement[]>([])
  const lengthRef = useRef(length)

  useEffect(() => {
    lengthRef.current = length
  }, [length])

  useEffect(() => {
    const arr = value.split('')
    setValues([...arr, ...Array.from({ length: Math.max(0, lengthRef.current - arr.length) }, () => '')])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length])

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus()
    }
  }, [autoFocus])

  function focusInput(index: number) {
    const input = inputsRef.current[index]
    if (input && !disabled) {
      input.focus()
      input.select()
    }
  }

  function updateValue(index: number, digit: string) {
    const newValues = [...values]
    newValues[index] = digit
    setValues(newValues)

    const newValue = newValues.slice(0, length).join('')
    onChange(newValue)

    if (digit && index < length - 1) {
      focusInput(index + 1)
    }

    if (newValue.length === length) {
      onComplete?.(newValue)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === 'Backspace') {
      if (values[index]) {
        updateValue(index, '')
      } else if (index > 0) {
        focusInput(index - 1)
      }
    } else if (e.key === 'ArrowLeft') {
      if (index > 0) focusInput(index - 1)
    } else if (e.key === 'ArrowRight') {
      if (index < length - 1) focusInput(index + 1)
    } else if (e.key === 'Delete') {
      updateValue(index, '')
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text/plain').slice(0, length).replace(/\D/g, '')
    if (!pasted) return

    const newValues = pasted.split('')
    for (let i = 0; i < length; i++) {
      newValues.push('')
    }
    const trimmed = newValues.slice(0, length)
    setValues(trimmed)
    onChange(trimmed.join(''))

    const lastFilled = pasted.length - 1
    if (lastFilled < length - 1) {
      focusInput(lastFilled + 1)
    } else {
      onComplete?.(pasted)
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:justify-start" role="group">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el!
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={values[i] ?? ''}
          onChange={(e) => {
            const digit = e.target.value.replace(/\D/g, '')[0] ?? ''
            updateValue(i, digit)
          }}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-required
          autoComplete="one-time-code"
          className={cn(
            'h-12 w-10 rounded-lg border border-white/10 bg-slate-surface text-center text-xl font-medium text-slate-text outline-none transition-all duration-150 placeholder:text-slate-muted focus:border-forest-light focus:ring-2 focus:ring-forest-light/30 disabled:cursor-not-allowed disabled:opacity-50'
          )}
        />
      ))}
    </div>
  )
}

interface ResendTimerProps {
  initialSeconds?: number
  onResend: () => void
  loading?: boolean
  disabled?: boolean
}

export function ResendTimer({
  initialSeconds = 42,
  onResend,
  loading = false,
  disabled = false,
}: ResendTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    if (seconds === 0) {
      setCanResend(true)
      return
    }

    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [seconds])

  function handleResend() {
    if (!canResend || loading || disabled) return
    setCanResend(false)
    setSeconds(initialSeconds)
    onResend()
  }

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')

  return (
    <div className="flex items-center justify-center gap-1 text-sm text-slate-muted">
      <span aria-live="polite">
        Resend in <span className="font-mono font-medium text-slate-text">{mins}:{secs}</span>
      </span>
      <button
        type="button"
        onClick={handleResend}
        disabled={!canResend || loading || disabled}
        className={cn(
          'text-sm font-medium text-forest-light underline underline-offset-2 transition-opacity',
          (canResend && !loading && !disabled) && 'hover:text-forest hover:opacity-80',
          (!canResend || loading || disabled) && 'cursor-not-allowed opacity-50'
        )}
        aria-label={canResend ? 'Resend OTP' : `Resend OTP in ${mins}:${secs}`}
      >
        Resend
      </button>
    </div>
  )
}
