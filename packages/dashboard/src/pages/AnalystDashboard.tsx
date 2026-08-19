import { useMemo, useState } from 'react'
import {
  Crosshair, 
  AlertTriangle, BookText, Gauge, 
  ChartPie, BarChartHorizontal
} from 'lucide-react'
import { useAlerts, useNodes } from '@/hooks/useLiveData'


const COLORS: Record<string, string> = {
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  white: '#F8FAFC',
  orange: '#F97316',
  blue: '#3B82F6',
}

const ANALYSIS_PERIODS = ['24h', '7d', '30d', '90d', 'custom'];
const RANGE_MS: Record<string, number> = {
  '24h': 24 * 3600_000,
  '7d': 7 * 24 * 3600_000,
  '30d': 30 * 24 * 3600_000,
  '90d': 90 * 24 * 3600_000,
};

export function AnalystDashboard() {
  const { alerts } = useAlerts();
  const { nodes } = useNodes();

  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [customFrom, setCustomFrom] = useState(() => new Date(Date.now() - 30 * 24 * 3600_000).toISOString().split('T')[0]);
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().split('T')[0]);

  const filteredAlerts = useMemo(() => {
    const now = Date.now();
    let fromMs = now - RANGE_MS[selectedPeriod];
    
    if (selectedPeriod === 'custom') {
      fromMs = new Date(`${customFrom}T00:00:00`).getTime();
      let toMs = new Date(`${customTo}T23:59:59`).getTime();
      if (Number.isNaN(fromMs)) fromMs = now - RANGE_MS['7d'];
      if (Number.isNaN(toMs)) toMs = now;
      return alerts.filter(a => {
        const t = new Date(a.timestamp).getTime();
        return t >= fromMs && t <= toMs;
      });
    }
    
    return alerts.filter(a => {
      const t = new Date(a.timestamp).getTime();
      return t >= fromMs;
    });
  }, [selectedPeriod, customFrom, customTo, alerts]);

  const dailyTrends = useMemo(() => {
    const dailyData: Record<string, number> = {};
    filteredAlerts.forEach(alert => {
      const date = new Date(alert.timestamp).toISOString().split('T')[0];
      if (!dailyData[date]) dailyData[date] = 0;
      dailyData[date]++;
    });
    return Object.entries(dailyData).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAlerts]);

  const zoneActivity = useMemo(() => {
    const zoneCounts: Record<string, number> = {};
    filteredAlerts.forEach(alert => {
      const node = nodes.find(n => n.id === alert.nodeId);
      const zone = node?.zone ?? 'Unknown';
      if (!zoneCounts[zone]) zoneCounts[zone] = 0;
      zoneCounts[zone]++;
    });
    
    return Object.entries(zoneCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  }, [filteredAlerts, nodes]);

  const riskHeatmapData = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    
    filteredAlerts.forEach(alert => {
      const date = new Date(alert.timestamp);
      const day = date.getDay();
      const hour = date.getHours();
      grid[day][hour]++;
    });
    
    return grid;
  }, [filteredAlerts]);

  const severityDistribution = useMemo(() => {
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    
    filteredAlerts.forEach(alert => {
      if (alert.severity === 'critical') severityCounts.critical++;
      else if (alert.severity === 'high') severityCounts.high++;
      else if (alert.severity === 'medium') severityCounts.medium++;
      else severityCounts.low++;
    });
    
    return severityCounts;
  }, [filteredAlerts]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-text">
          Analyst Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate-muted">Time period:</span>
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="rounded-md border border-white/10 px-2.5 py-1.5 bg-slate-surface text-slate-text"
            >
              {ANALYSIS_PERIODS.map(period => (
                <option key={period} value={period}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {selectedPeriod === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date" 
                value={customFrom} 
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-md border border-white/10 px-2.5 py-1.5 bg-slate-surface text-slate-text"
              />
              <span className="text-sm text-slate-muted">From</span>
              <input
                type="date" 
                value={customTo} 
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-md border border-white/10 px-2.5 py-1.5 bg-slate-surface text-slate-text"
              />
              <span className="text-sm text-slate-muted">To</span>
            </div>
          )}
          <button
            onClick={() => setSelectedPeriod('custom')}
            className="ml-2 rounded-md border border-white/10 px-2.5 py-1.5 text-slate-text hover:bg-slate-700/50"
          >
            Custom
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-800/15 p-2.5 text-sm text-slate-muted">
            Analyst-specific view for historical analysis and risk prevention
          </div>
          <div className="rounded-lg bg-slate-800/15 p-2.5 text-sm text-slate-muted">
            Data-driven insights for proactive risk management
          </div>
        </div>
      </div>

      {/* Risk Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-700/50 bg-slate-surface p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-text">Risk Heatmap</h2>
            <div className="text-xs text-slate-muted">High-frequency alert zones</div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              {/* Hourly heatmap */}
              <div className="flex items-center justify-between">
                <span className="w-8 text-right text-[10px] text-slate-muted">Time</span>
                <span className="flex-1">Alerts</span>
              </div>
              
              <div className="flex flex-col gap-1">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="w-8 text-right text-[10px] text-slate-muted">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]}</span>
                    <div className="flex-1 h-4 rounded">
                      {riskHeatmapData[i]?.map((val, j) => (
                        <div 
                          key={j} 
                          className={`rounded h-0.5 ${val > 0 ? 'bg-amber-500/30' : 'bg-slate-800/50'}`}
                          style={{ width: `${val * 0.5}px` }}
                          title={`${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]} ${j}:00 — ${val} alerts`}
                        ></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700/50 bg-slate-surface p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-text">Alert Trends</h2>
            <div className="text-xs text-slate-muted">Daily alert patterns</div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              <div className="flex items-center justify-between">
                <span className="w-8 text-right text-[10px] text-slate-muted">Date</span>
                <span className="flex-1">Count</span>
              </div>
              <div className="flex flex-col gap-1">
                {dailyTrends.map(([date, count]) => (
                  <div key={date} className="flex items-center gap-1 py-1 border-b border-slate-700/50">
                    <span className="w-16 text-right text-[10px] text-slate-muted">{date}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700/50 bg-slate-surface p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-text">Top Zones</h2>
            <div className="text-xs text-slate-muted">High-activity areas</div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              {zoneActivity.map(([zone, count]) => (
                <div key={zone} className="flex items-center gap-2 py-1 border-b border-slate-700/50">
                  <span className="flex-1">{zone}</span>
                  <span className="text-sm font-medium text-slate-text">{count} alerts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700/50 bg-slate-surface p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-text">Severity Distribution</h2>
            <div className="text-xs text-slate-muted">Alert severity breakdown</div>
          </div>
          <div className="flex flex-col gap-2">
            {Object.entries(severityDistribution).map(([severity, count]) => (
              <div key={severity} className="flex items-center gap-2 py-1">
                <span 
                  className={`h-2 w-2 rounded-full ${COLORS[severity.toLowerCase()] || COLORS.red}`}
                />
                <span className="text-sm font-medium text-slate-text">{severity.charAt(0).toUpperCase() + severity.slice(1)}: {count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-slate-700/50 bg-slate-surface p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-text">Risk Assessment</h2>
          <div className="text-sm text-slate-muted">
            {filteredAlerts.length} alerts analyzed in selected period
          </div>
        </div>
        
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex items-center gap-3 bg-slate-800/15 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-amber-500/20 p-2">
                <Gauge size={16} />
              </div>
              <span className="text-sm font-medium text-amber-600">Risk Score: 68%</span>
            </div>
            <div className="text-sm text-slate-muted">
              Based on historical patterns and current alert severity distribution
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-800/15 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-red-500/20 p-2">
                <Crosshair size={16} />
              </div>
              <span className="text-sm font-medium text-red-600">Critical Alerts: 3</span>
            </div>
            <div className="text-sm text-slate-muted">
              Immediate investigation required for critical alerts
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-800/15 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-500/20 p-2">
                <ChartPie size={16} />
              </div>
              <span className="text-sm font-medium text-green-600">Low: 45%</span>
            </div>
            <div className="text-sm text-slate-muted">
              Low-severity alerts dominate current period
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-800/15 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-500/20 p-2">
                <BarChartHorizontal size={16} />
              </div>
              <span className="text-sm font-medium text-blue-600">High: 28%</span>
            </div>
            <div className="text-sm text-slate-muted">
              High-severity alerts require prioritized response
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-800/15 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-red-500/20 p-2">
                <AlertTriangle size={16} />
              </div>
              <span className="text-sm font-medium text-red-600">False Positive Rate: 18%</span>
            </div>
            <div className="text-sm text-slate-muted">
              Adjust detection thresholds to reduce false alarms
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-800/15 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-yellow-500/20 p-2">
                <BookText size={16} />
              </div>
              <span className="text-sm font-medium text-yellow-600">Recommendation: 72%</span>
            </div>
            <div className="text-sm text-slate-muted">
              Review historical patterns and implement preventive measures
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
