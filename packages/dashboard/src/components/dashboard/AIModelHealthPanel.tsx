/**
 * AI model health panel (spec #14) — edge-model metrics and drift status.
 */

import { Brain, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AI_MODEL } from '@/services/intel'

export function AIModelHealthPanel({ className }: { className?: string }) {
  const metrics = [
    { label: 'Accuracy', value: AI_MODEL.accuracy },
    { label: 'Precision', value: AI_MODEL.precision },
    { label: 'Recall', value: AI_MODEL.recall },
    { label: 'F1 Score', value: AI_MODEL.f1 },
  ]

  return (
    <div className={cn('rounded-xl border border-white/5 bg-slate-surface p-4 shadow-lg shadow-black/20', className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-text">
          <Brain className="h-4 w-4 text-forest-light" />
          AI Model Health
        </h3>
        <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400">
          Operational
        </span>
      </div>

      <div className="mb-3 flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
        <div>
          <div className="text-xs font-semibold text-slate-text">
            {AI_MODEL.name} {AI_MODEL.version}
          </div>
          <div className="text-[10px] text-slate-muted">
            Last retrained{' '}
            {new Date(AI_MODEL.lastRetrained).toLocaleDateString(undefined, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium tabular-nums text-slate-text">
          <Timer size={12} className="text-forest-light" />
          {AI_MODEL.inferenceMs} ms
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-muted">{m.label}</div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-sm font-bold tabular-nums text-slate-text">{m.value}%</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-forest-light"
                  style={{ width: `${m.value}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drift */}
      <div className="mt-3">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-muted">
          Model Drift
        </div>
        <div className="flex flex-col gap-1">
          {AI_MODEL.drift.map((d) => (
            <div key={d.capability} className="flex items-center justify-between text-[11px]">
              <span className="text-slate-muted">{d.capability}</span>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[9px] font-bold',
                  d.status === 'NORMAL'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                )}
              >
                {d.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
