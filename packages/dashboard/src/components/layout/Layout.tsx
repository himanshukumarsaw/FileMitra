/**
 * App shell (spec #22) — fixed sidebar on desktop, slide-in drawer on
 * mobile/tablet, skip-to-content link for keyboard users.
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useActivityBridge } from '@/hooks/useActivityBridge'
import { cn } from '@/lib/utils'

export function Layout() {
  // Pipe live socket events into the notification center + audit log
  useActivityBridge()

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-dark">
      {/* Skip link — first tab stop for keyboard users (spec #21) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[1200] focus:rounded-md focus:bg-forest-light focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-slate-950"
      >
        Skip to content
      </a>

      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300',
          collapsed ? 'lg:pl-[60px]' : 'lg:pl-[240px]'
        )}
      >
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main id="main-content" className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
