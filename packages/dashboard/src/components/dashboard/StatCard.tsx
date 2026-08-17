import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  trend?: string
  trendUp?: boolean
  color: string
  tooltip?: string
  onClick?: () => void
}

function useCountUp(target: number, duration = 1200): number {
  const [count, setCount] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return count
}

export function StatCard({ icon, label, value, trend, trendUp, color, tooltip, onClick }: StatCardProps) {
  const numericValue = typeof value === 'number' ? value : parseInt(value, 10)
  const isNumeric = !isNaN(numericValue)
  const animatedValue = useCountUp(isNumeric ? numericValue : 0)
  const displayValue = isNumeric ? animatedValue.toLocaleString() : value

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={onClick ? `View ${label.toLowerCase()}` : undefined}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-white/5 bg-slate-surface p-5',
        'w-full text-left shadow-lg shadow-black/20 transition-all duration-300 hover:border-white/10 hover:shadow-xl',
        onClick && 'cursor-pointer hover:-translate-y-0.5',
        !onClick && 'cursor-default'
      )}
      title={tooltip}
    >
      {/* Subtle gradient accent */}
      <div
        className="absolute inset-0 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, transparent 60%)`,
        }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-slate-muted">
            {label}
          </span>
            <span className="text-4xl font-bold tabular-nums text-slate-text">
            {displayValue}
          </span>
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold',
                trendUp ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              <span className="text-[10px]">{trendUp ? '▲' : '▼'}</span>
              {trend}
            </span>
          )}
        </div>

        <div
          className="flex h-11 w-11 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {icon}
        </div>
      </div>
    </button>
  )
}
