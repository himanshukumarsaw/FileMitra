/** Threat score gauge + contributing factors (spec #7). */

import type { ThreatAssessment } from '@/services/intel'
import { THREAT_LEVEL_STYLE } from '@/services/intel'

export function ThreatScoreGauge({ assessment }: { assessment: ThreatAssessment }) {
  const { score, level, factors } = assessment
  const meta = THREAT_LEVEL_STYLE[level]
  const r = 34
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ * 0.75 // 270° arc

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-text">Threat Score</span>
        <span
          className="rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase"
          style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}14` }}
        >
          {meta.label}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-[225deg]">
            <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"
              strokeDasharray={`${circ * 0.75} ${circ}`} strokeLinecap="round" />
            <circle cx="40" cy="40" r={r} fill="none" stroke={meta.color} strokeWidth="7"
              strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.7s ease-out' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold tabular-nums" style={{ color: meta.color }}>{score}</span>
            <span className="text-[9px] text-slate-muted">/100</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          {factors.slice(0, 4).map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] text-slate-muted">{f.label}</span>
              <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-text">+{f.points}</span>
            </div>
          ))}
        </div>
      </div>

      {factors.length > 4 && (
        <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
          {factors.slice(4).map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] text-slate-muted">{f.label}</span>
              <span className="shrink-0 text-[11px] tabular-nums text-slate-muted">+{f.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
