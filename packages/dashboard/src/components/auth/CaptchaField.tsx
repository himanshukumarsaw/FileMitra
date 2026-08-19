/**
 * CAPTCHA field (spec #32) — fetches a challenge from the backend and
 * validates the user's answer.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateCaptcha } from '@/services/employeeApi'
import { useToast } from '@/components/ui/Toast'

interface CaptchaFieldProps {
  value: string
  onChange: (value: string) => void
  onError?: (error: string) => void
  onValid?: (valid: boolean) => void
  onChallenge?: (challengeId: string) => void
}

interface CaptchaData {
  challengeId: string
  question: string
}

export function CaptchaField({ value, onChange, onError, onValid, onChallenge }: CaptchaFieldProps) {
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { push: toast } = useToast()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchCaptcha = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await generateCaptcha()
      if (!mountedRef.current) return
      const newCaptcha: CaptchaData = {
        challengeId: data.challengeId,
        question: data.question,
      }
      setCaptcha(newCaptcha)
      onChallenge?.(data.challengeId)
      onValid?.(false)
      setError(null)
    } catch (e) {
      if (!mountedRef.current) return
      const msg = e instanceof Error ? e.message : 'Failed to load CAPTCHA'
      setError(msg)
      onError?.(msg)
      toast('error', msg)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [onError, onValid, onChallenge, toast])

  useEffect(() => {
    fetchCaptcha()
  }, [fetchCaptcha])

  const handleRefresh = () => {
    onChange('')
    fetchCaptcha()
  }

  const handleAnswerChange = (val: string) => {
    onChange(val)
    onValid?.(val.length > 0)
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-3">
        <div className="flex-1 rounded-lg border border-white/10 bg-slate-surface px-3.5 py-3">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-muted">CAPTCHA</span>
            {loading && <RefreshCw className="h-3 w-3 animate-spin text-slate-muted" />}
          </div>
          {captcha ? (
            <>
              <div
                className="mb-2 text-sm font-medium text-slate-text"
                aria-live="polite"
              >
                {captcha.question}
              </div>
              <input
                type="text"
                value={value}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Enter your answer"
                disabled={loading}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/30"
                aria-label="CAPTCHA answer"
                aria-required
              />
            </>
          ) : (
            <div className="text-sm text-slate-muted">Click refresh to load the challenge</div>
          )}
          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className={cn(
            'mt-6 rounded-lg border border-white/10 bg-slate-surface p-2.5 text-slate-muted transition-colors hover:bg-forest-light/10 hover:text-forest-light disabled:cursor-not-allowed disabled:opacity-50',
            'focus:outline-none focus:ring-2 focus:ring-forest-light/30'
          )}
          aria-label="Refresh CAPTCHA"
          title="Refresh CAPTCHA"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>
    </div>
  )
}

