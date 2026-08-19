/**
 * Sidebar (spec #22) — fixed navigation on desktop (collapsible), slide-in
 * drawer with backdrop on tablet/mobile.
 */

import { useEffect, useState, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Bell,
  Map,
  Radio,
  BarChart3,
  Settings,
  Siren,
  Crosshair,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Wifi,
  BookOpen,
  Newspaper,
  Trees,
  Leaf,
  ScrollText,
  User,
  LogOut,
  Globe,
  MapPin,
  Thermometer,
  Wind,
  Droplets,
  Camera,
  AlertOctagon,
  Navigation,
  Download,
  X,
  Send,
  Filter,
  Activity,
  Brain,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/incidents', icon: Crosshair, label: 'Activity' },
  { to: '/dispatch', icon: Siren, label: 'Teams' },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/nodes', icon: Radio, label: 'Devices' },
  { to: '/analytics', icon: BarChart3, label: 'Reports' },
  { to: '/audit', icon: ShieldCheck, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const RESEARCH_NEWS = [
  {
    id: '1',
    title: 'Deforestation Alert: 12 hectares cleared near Core Zone',
    type: 'damage',
    zone: 'Core Zone',
    severity: 'high',
    timestamp: Date.now() - 10 * 60 * 1000,
    icon: Trees,
    color: 'text-red-400',
  },
  {
    id: '2',
    title: 'Villagers report illegal logging in Buffer Zone corridor',
    type: 'report',
    zone: 'Buffer Zone',
    severity: 'medium',
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    icon: ScrollText,
    color: 'text-amber-400',
  },
  {
    id: '3',
    title: 'Study: Elephant migration patterns disrupted by boundary encroachment',
    type: 'research',
    zone: 'Boundary Zone',
    severity: 'low',
    timestamp: Date.now() - 26 * 60 * 60 * 1000,
    icon: BookOpen,
    color: 'text-blue-400',
  },
  {
    id: '4',
    title: 'New satellite imagery reveals 3 active logging sites near river',
    type: 'news',
    zone: 'River Corridor',
    severity: 'high',
    timestamp: Date.now() - 48 * 60 * 60 * 1000,
    icon: Globe,
    color: 'text-emerald-400',
  },
  {
    id: '5',
    title: 'Research: Soil erosion 40% higher in zones with repeated fire incidents',
    type: 'research',
    zone: 'Multiple Zones',
    severity: 'medium',
    timestamp: Date.now() - 72 * 60 * 60 * 1000,
    icon: Leaf,
    color: 'text-cyan-400',
  },
]

const WEATHER = {
  temp: 34,
  humidity: 62,
  wind: 12,
  direction: 'NE',
  fireRisk: 'High',
}

const SENSORS = [
  { id: 'cam-01', label: 'Trail Cam A', status: 'online', battery: 85 },
  { id: 'cam-02', label: 'Trail Cam B', status: 'online', battery: 42 },
  { id: 'snd-01', label: 'Acoustic Node 1', status: 'online', battery: 91 },
  { id: 'snd-02', label: 'Acoustic Node 2', status: 'offline', battery: 0 },
  { id: 'drn-01', label: 'Drone Alpha', status: 'charging', battery: 30 },
]

const ANIMALS = [
  { id: 'ELE-042', name: 'Tusker #7', zone: 'Core Zone', status: 'active' },
  { id: 'ELE-043', name: 'Matriarch #3', zone: 'Buffer Zone', status: 'active' },
  { id: 'TGR-012', name: 'Tiger #12', zone: 'Core Zone', status: 'alert' },
]

const AI_PREDICTION = {
  risk: 85,
  zone: 'Buffer Zone B',
  window: '48h',
  summary: '3 critical alerts detected today. Illegal logging activity increased 40% in northern sector.',
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const [severityFilter, setSeverityFilter] = useState<string | null>(null)
  const [zoneFilter, setZoneFilter] = useState<string | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportType, setReportType] = useState('')

  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mobileOpen, onCloseMobile])

  const showLabels = !collapsed || mobileOpen

  const filteredNews = useMemo(() => {
    return RESEARCH_NEWS.filter(item => {
      if (severityFilter && item.severity !== severityFilter) return false
      if (zoneFilter && item.zone !== zoneFilter) return false
      return true
    })
  }, [severityFilter, zoneFilter])

  const zones = useMemo(() => {
    return Array.from(new Set(RESEARCH_NEWS.map(n => n.zone)))
  }, [])

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Main navigation"
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-slate-surface bg-slate-surface transition-all duration-300',
          collapsed ? 'lg:w-[60px]' : 'lg:w-[280px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <NavLink
          to="/"
          onClick={onCloseMobile}
          title="Back to JungleSathi home"
          className="flex h-16 items-center gap-3 border-b border-slate-700/50 px-4 transition-colors hover:bg-slate-700/30"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest-light/20">
            <img src="/junglesathi-logo.svg" alt="JungleSathi" className="h-6 w-6" />
          </div>
          {showLabels && (
            <span className="text-lg font-semibold tracking-tight text-slate-text">
              JungleSathi
            </span>
          )}
        </NavLink>

        <div className="flex-1 overflow-y-auto">
          {/* Quick Actions */}
          {showLabels && (
            <div className="border-b border-slate-700/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-forest-light" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                  Quick Actions
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => { setReportType('incident'); setReportModalOpen(true) }}
                  className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                >
                  <AlertOctagon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Report Incident</span>
                </button>
                <button
                  onClick={() => { setReportType('sighting'); setReportModalOpen(true) }}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                >
                  <Camera className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Log Sighting</span>
                </button>
                <button
                  onClick={() => alert('Exporting SitRep...')}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-2 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
                >
                  <Download className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Export SitRep</span>
                </button>
                <button
                  onClick={() => alert('Opening patrol routing...')}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                >
                  <Navigation className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Patrol Route</span>
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          {showLabels && (
            <div className="border-b border-slate-700/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-forest-light" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                  Filters
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {['All', 'high', 'medium', 'low'].map(sev => (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev === 'All' ? null : sev)}
                      className={cn(
                        'rounded px-2 py-1 text-[10px] font-bold uppercase transition-colors',
                        (sev === 'All' && !severityFilter) || severityFilter === sev
                          ? 'bg-forest-light/20 text-forest-light'
                          : 'bg-slate-800/40 text-slate-muted hover:text-slate-text'
                      )}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {zones.map(zone => (
                    <button
                      key={zone}
                      onClick={() => setZoneFilter(zoneFilter === zone ? null : zone)}
                      className={cn(
                        'rounded px-2 py-1 text-[10px] font-medium transition-colors',
                        zoneFilter === zone
                          ? 'bg-forest-light/20 text-forest-light'
                          : 'bg-slate-800/40 text-slate-muted hover:text-slate-text'
                      )}
                    >
                      {zone}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Predictions */}
          {showLabels && (
            <div className="border-b border-slate-700/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-forest-light" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                  AI Predictions
                </span>
              </div>
              <div className="rounded-lg bg-slate-800/40 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-muted">Hotspot Risk</span>
                  <span className="text-xs font-bold text-red-400">{AI_PREDICTION.risk}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                    style={{ width: `${AI_PREDICTION.risk}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-muted">
                  {AI_PREDICTION.risk}% risk in {AI_PREDICTION.zone} over next {AI_PREDICTION.window}
                </div>
                <div className="border-t border-slate-700/50 pt-2 mt-2">
                  <div className="text-[10px] text-slate-muted mb-1">Daily Briefing</div>
                  <div className="text-[11px] text-slate-text leading-relaxed">
                    {AI_PREDICTION.summary}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Monitoring */}
          {showLabels && (
            <div className="border-b border-slate-700/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-forest-light" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                  Live Monitoring
                </span>
              </div>

              {/* Weather */}
              <div className="rounded-lg bg-slate-800/40 p-2.5 mb-2">
                <div className="text-[10px] text-slate-muted mb-1.5">Weather & Fire Risk</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center gap-0.5">
                    <Thermometer className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-xs font-bold text-slate-text">{WEATHER.temp}°</span>
                    <span className="text-[9px] text-slate-muted">Temp</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Wind className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-bold text-slate-text">{WEATHER.wind}km/h</span>
                    <span className="text-[9px] text-slate-muted">Wind {WEATHER.direction}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-text">{WEATHER.humidity}%</span>
                    <span className="text-[9px] text-slate-muted">Humidity</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between rounded bg-red-500/10 px-2 py-1">
                  <span className="text-[10px] font-bold text-red-400 uppercase">Fire Risk: {WEATHER.fireRisk}</span>
                  <Zap className="h-3 w-3 text-red-400" />
                </div>
              </div>

              {/* Sensors */}
              <div className="rounded-lg bg-slate-800/40 p-2.5 mb-2">
                <div className="text-[10px] text-slate-muted mb-1.5">Active Sensors</div>
                <div className="space-y-1.5">
                  {SENSORS.slice(0, 3).map(sensor => (
                    <div key={sensor.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Camera className="h-3 w-3 text-slate-muted" />
                        <span className="text-[11px] text-slate-text truncate">{sensor.label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          sensor.status === 'online' ? 'bg-forest-light' :
                            sensor.status === 'charging' ? 'bg-amber-400' : 'bg-red-400'
                        )} />
                        <span className="text-[10px] text-slate-muted">{sensor.battery}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Animal Tracking */}
              <div className="rounded-lg bg-slate-800/40 p-2.5">
                <div className="text-[10px] text-slate-muted mb-1.5">Animal GPS Tracking</div>
                <div className="space-y-1.5">
                  {ANIMALS.map(animal => (
                    <div key={animal.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-forest-light" />
                        <span className="text-[11px] text-slate-text truncate">{animal.name}</span>
                      </div>
                      <span className={cn(
                        'text-[10px] font-medium uppercase',
                        animal.status === 'alert' ? 'text-red-400' : 'text-forest-light'
                      )}>
                        {animal.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 text-[10px] text-slate-muted">
                  {ANIMALS.length} tracked | {ANIMALS.filter(a => a.status === 'alert').length} active alerts
                </div>
              </div>
            </div>
          )}

          {/* Forest Research & News Feed */}
          {showLabels && (
            <div className="border-b border-slate-700/50">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <Newspaper className="h-4 w-4 text-forest-light" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-muted">
                  Forest Research & News
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredNews.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-2.5 border-l-2 px-3 py-2 transition-colors hover:bg-slate-800/40"
                      style={{ borderLeftColor: item.severity === 'high' ? '#EF4444' : item.severity === 'medium' ? '#F59E0B' : '#3B82F6' }}
                    >
                      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', item.color)} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-text leading-tight">
                          {item.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-muted" />
                          <span className="text-[10px] text-slate-muted">{item.zone}</span>
                          <span className={cn(
                            'ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                            item.severity === 'high' ? 'bg-red-500/20 text-red-400'
                              : item.severity === 'medium' ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-blue-500/20 text-blue-400'
                          )}>
                            {item.severity}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-muted mt-0.5">
                          {timeAgo(item.timestamp)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filteredNews.length === 0 && (
                  <div className="px-3 py-2 text-xs text-slate-muted">No alerts match filters</div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                title={!showLabels ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-forest-light/15 text-forest-light'
                      : 'text-slate-muted hover:bg-slate-700/50 hover:text-slate-text',
                    !showLabels && 'justify-center px-2'
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {showLabels && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Profile */}
        <div className="border-t border-slate-700/50 px-3 py-3">
          {showLabels ? (
            <div className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-light/20">
                <User className="h-4 w-4 text-forest-light" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-text">Field Officer</div>
                <div className="truncate text-xs text-slate-muted">ranger@junglesathi.in</div>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('employee.token')
                  localStorage.removeItem('employee.data')
                  window.location.href = '/auth/login'
                }}
                className="shrink-0 rounded p-1 text-slate-muted transition-colors hover:bg-slate-700/50 hover:text-red-400"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                localStorage.removeItem('employee.token')
                localStorage.removeItem('employee.data')
                window.location.href = '/auth/login'
              }}
              className="flex w-full items-center justify-center rounded-lg p-2 text-slate-muted transition-colors hover:bg-slate-700/50 hover:text-red-400"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* System status */}
        <div className="border-t border-slate-700/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-forest-light" />
            {showLabels && (
              <span className="text-xs text-slate-muted">System Online</span>
            )}
            <span className="ml-auto h-2 w-2 rounded-full bg-forest-light shadow-[0_0_6px_theme(colors.forest-light)]" />
          </div>
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={onToggleCollapse}
          className="hidden h-10 items-center justify-center border-t border-slate-700/50 text-slate-muted transition-colors hover:bg-slate-700/50 hover:text-slate-text lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </aside>

      {/* Report Incident Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-lg border border-slate-700/50 bg-slate-surface p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-text">
                {reportType === 'incident' ? 'Report Incident' : 'Log Sighting'}
              </h3>
              <button
                onClick={() => setReportModalOpen(false)}
                className="rounded p-1 text-slate-muted transition-colors hover:bg-slate-700/50 hover:text-slate-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-muted mb-1">Location / Coordinates</label>
                <input
                  type="text"
                  placeholder="e.g., 23.4567, 85.2345"
                  className="w-full rounded-md border border-white/10 bg-slate-800/40 px-3 py-2 text-sm text-slate-text placeholder:text-slate-muted"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-muted mb-1">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Describe what you observed..."
                  className="w-full rounded-md border border-white/10 bg-slate-800/40 px-3 py-2 text-sm text-slate-text placeholder:text-slate-muted"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-muted mb-1">Attach Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full rounded-md border border-dashed border-white/10 bg-slate-800/40 px-3 py-2 text-xs text-slate-muted"
                />
              </div>
              <button
                onClick={() => { alert('Report submitted'); setReportModalOpen(false) }}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-forest-light px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light/90"
              >
                <Send className="h-4 w-4" />
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
