import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Bell,
  Map,
  Radio,
  BarChart3,
  Settings,
  TreePine,
  ChevronLeft,
  ChevronRight,
  Wifi,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/nodes', icon: Radio, label: 'Nodes' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-surface bg-slate-surface transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-700/50 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest-light/20">
          <TreePine className="h-5 w-5 text-forest-light" />
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight text-slate-text">
            FileMitra
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-forest-light/15 text-forest-light'
                  : 'text-slate-muted hover:bg-slate-700/50 hover:text-slate-text',
                collapsed && 'justify-center px-2'
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* System status */}
      <div className="border-t border-slate-700/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-forest-light" />
          {!collapsed && (
            <span className="text-xs text-slate-muted">System Online</span>
          )}
          <span className="ml-auto h-2 w-2 rounded-full bg-forest-light shadow-[0_0_6px_theme(colors.forest-light)]" />
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(prev => !prev)}
        className="flex h-10 items-center justify-center border-t border-slate-700/50 text-slate-muted transition-colors hover:bg-slate-700/50 hover:text-slate-text"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  )
}
