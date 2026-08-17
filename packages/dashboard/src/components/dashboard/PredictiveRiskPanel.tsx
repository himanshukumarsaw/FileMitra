/**
 * Predictive risk panel (spec #12) — conflict / fire / illegal-activity
 * forecasts derived from live data, always labelled as AI-generated estimates.
 */

import { useMemo } from 'react'
import { TrendingUp, Flame, ShieldAlert, PawPrint, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAlerts, useNodes, useFireRisk } from '@/hooks/useLiveData'
import {
  derivePredictiveRisks, THREAT_LEVEL_STYLE, type PredictiveRisk,
} from '@/services/intel'

const KIND_ICON = {
  conflict: PawPrint,
  fire: Flame,
  illegal: ShieldAlert,
} as const

export function PredictiveRiskPanel({ className }: { className?: string }) {
  const { alerts } = useAlerts()
  const { nodes } = useNodes()
  const { zones } = useFireRisk()

  const risks = useMemo(
    () => derivePredictiveRisks(alerts, nodes, zones),
    [alerts, nodes, zones]
  )

  return (
    <div className={cn('rounded-xl border border-white/5 bg-slate-surface p-4 shadow-lg shadow-black/20', className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-text">
          <TrendingUp className="h-4 w-4 text-forest-light" />
          Predictive Risk
        </h3>
        <span className="flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-400">
          <Sparkles size={9} />
          AI-generated estimate
        </span>
      </div>

      {risks.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-muted">
          Not enough activity in the last 24 hours to produce forecasts.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {risks.map((risk) => (
            <RiskCard key={risk.id} risk={risk} />
          ))}
        </div>
      )}
    </div>
  )
}

function RiskCard({ risk }: { risk: PredictiveRisk }) {
  const meta = THREAT_LEVEL_STYLE[risk.level]
  const Icon = KIND_ICON[risk.kind]

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ background: `${meta.color}1a`, color: meta.color }}
          >
            <Icon size={14} />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-text">
              {risk.title}
            </div>
            <div className="text-[10px] text-slate-muted">
              {risk.location}
              {risk.species && <> · {risk.species}</>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold tabular-nums" style={{ color: meta.color }}>
            {risk.score}
          </span>
          <span className="text-[10px] text-slate-muted">/100</span>
          <div
            className="text-[9px] font-bold uppercase"
            style={{ color: meta.color }}
          >
            {meta.label}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-muted">
        <span>
          Predicted window:{' '}
          <span className="font-medium tabular-nums text-slate-text">{risk.window}</span>
        </span>
      </div>

      <ul className="mt-2 flex flex-col gap-0.5">
        {risk.factors.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-[10px] text-slate-muted">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-muted/60" />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-2 rounded-md border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-[10px] text-slate-text">
        <span className="font-semibold text-forest-light">Recommendation: </span>
        {risk.recommendation}
      </div>
    </div>
  )
}
