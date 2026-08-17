/**
 * Toast notifications (spec #25) — app-wide success/info/warning/error
 * feedback for every command action. Hosted once at the layout root.
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastKind = 'success' | 'info' | 'warning' | 'error'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const KIND_META: Record<ToastKind, { icon: typeof Info; classes: string }> = {
  success: { icon: CheckCircle2, classes: 'border-emerald-500/40 text-emerald-400' },
  info: { icon: Info, classes: 'border-sky-500/40 text-sky-400' },
  warning: { icon: AlertTriangle, classes: 'border-amber-500/40 text-amber-400' },
  error: { icon: XCircle, classes: 'border-red-500/40 text-red-400' },
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++
    setToasts((prev) => [...prev.slice(-3), { id, kind, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[1100] flex w-80 flex-col gap-2"
      >
        {toasts.map((toast) => {
          const meta = KIND_META[toast.kind]
          const Icon = meta.icon
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-slate-surface px-3.5 py-3 shadow-xl shadow-black/40',
                meta.classes
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1 text-xs leading-relaxed text-slate-text">{toast.message}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="rounded p-0.5 text-slate-muted hover:text-slate-text"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
