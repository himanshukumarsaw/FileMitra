/** Confirmation dialog (spec #25) — used before destructive/command actions. */

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

interface ConfirmDialogProps {
  options: ConfirmOptions | null
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ options, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    if (!options) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [options, onCancel])

  if (!options) return null

  return (
    <div
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={options.title}
        className="w-full max-w-sm rounded-xl border border-white/10 bg-slate-dark p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2.5">
          {options.danger && (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </span>
          )}
          <h3 className="text-sm font-semibold text-slate-text">{options.title}</h3>
        </div>
        <p className="mb-5 text-xs leading-relaxed text-slate-muted">{options.message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-white/10 px-3.5 py-2 text-xs font-medium text-slate-muted transition-colors hover:bg-white/5 hover:text-slate-text"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors',
              options.danger
                ? 'bg-red-500/90 text-white hover:bg-red-500'
                : 'bg-forest-light/90 text-slate-950 hover:bg-forest-light'
            )}
          >
            {options.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
