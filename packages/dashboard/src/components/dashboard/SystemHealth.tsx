import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface SystemHealthProps {
  online: number
  warning: number
  offline: number
  uptimePercent: number
}

const COLORS = {
  online: '#10B981',
  warning: '#F59E0B',
  offline: '#EF4444',
}

export function SystemHealth({ online, warning, offline, uptimePercent }: SystemHealthProps) {
  const total = online + warning + offline
  const data = [
    { name: 'Online', value: online, color: COLORS.online },
    { name: 'Warning', value: warning, color: COLORS.warning },
    { name: 'Offline', value: offline, color: COLORS.offline },
  ]

  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-white/5 bg-slate-surface p-5 shadow-lg shadow-black/20">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-muted">
        System Health
      </h3>

      <div className="relative h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-text">{uptimePercent}%</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-muted">Uptime</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 flex gap-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-slate-muted">
              {item.name}{' '}
              <span className={cn('font-semibold text-slate-text')}>
                {item.value}/{total}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
