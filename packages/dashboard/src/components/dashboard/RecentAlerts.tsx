import { Link } from 'react-router-dom'
import { User, Bug, Car, Flame, ArrowRight } from 'lucide-react'
import type { Alert, AlertSeverity, AlertType } from '../../../../../shared/types'
import { cn } from '@/lib/utils'

interface RecentAlertsProps {
  alerts: Alert[]
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const severityStyles: Record<AlertSeverity, string> = {
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
}

const typeIcons: Record<AlertType, typeof User> = {
  human: User,
  animal: Bug,
  vehicle: Car,
  fire: Flame,
}

export function RecentAlerts({ alerts }: RecentAlertsProps) {
  const recent = alerts.slice(0, 7)

  return (
    <div className="rounded-xl border border-white/5 bg-slate-surface p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-muted">
          Recent Alerts
        </h3>
        <Link
          to="/alerts"
          className="flex items-center gap-1 text-xs font-medium text-forest-light transition-colors hover:text-emerald-300"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        {recent.map((alert) => {
          const TypeIcon = typeIcons[alert.type]
          return (
            <Link
              key={alert.id}
              to="/alerts"
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                'hover:bg-white/[0.03]'
              )}
            >
              {/* Type icon */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-slate-muted">
                <TypeIcon size={14} />
              </div>

              {/* Description */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-text">
                  {alert.description ?? `${alert.type} detected`}
                </p>
                <p className="text-xs text-slate-muted">
                  {alert.species && (
                    <span className="capitalize text-forest-light">{alert.species} · </span>
                  )}
                  {relativeTime(alert.timestamp)}
                </p>
              </div>

              {/* Severity badge */}
              <span
                className={cn(
                  'shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase',
                  severityStyles[alert.severity]
                )}
              >
                {alert.severity}
              </span>

              {/* Confidence */}
              <span className="shrink-0 text-xs tabular-nums text-slate-muted">
                {Math.round(alert.confidence * 100)}%
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
