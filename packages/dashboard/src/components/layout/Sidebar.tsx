/**
 * Sidebar (spec #22) — fixed navigation on desktop (collapsible), slide-in
 * drawer with backdrop on tablet/mobile.
 */

import { useEffect } from 'react'
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
  TreePine,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Wifi,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/incidents', icon: Crosshair, label: 'Activity' },
  { to: '/dispatch', icon: Siren, label: 'Teams' },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/nodes', icon: Radio, label: 'Devices' },
  { to: '/analytics', icon: BarChart3, label: 'Reports' },
  { to: '/audit', icon: ShieldCheck, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  // Close the mobile drawer with Escape
  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mobileOpen, onCloseMobile])

  // The drawer on small screens always shows labels regardless of collapse
  const showLabels = !collapsed || mobileOpen

  return (
    <>
      {/* Mobile backdrop */}
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
          'fixed left-0 top-0 z-50 flex h-screen w-[240px] flex-col border-r border-slate-surface bg-slate-surface transition-all duration-300',
          // Desktop: width follows the collapsed state
          collapsed ? 'lg:w-[60px]' : 'lg:w-[240px]',
          // Mobile: slide-in drawer
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-700/50 px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest-light/20">
            <TreePine className="h-5 w-5 text-forest-light" />
          </div>
          {showLabels && (
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
    </>
  )
}
