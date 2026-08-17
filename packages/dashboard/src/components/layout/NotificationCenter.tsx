/**
 * Notification center (spec #16) — bell dropdown fed by the shared activity
 * store. Supports mark-as-read per item, mark-all-read and view-all.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, AlertTriangle, Radio, Crosshair, Siren, Settings, CheckCheck, Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/format'
import {
  subscribe, getNotifications, unreadCount, markNotificationRead,
  markAllNotificationsRead, type NotificationKind,
} from '@/services/activityStore'

const KIND_META: Record<NotificationKind, { icon: typeof Bell; color: string }> = {
  alert: { icon: AlertTriangle, color: '#EF4444' },
  node: { icon: Radio, color: '#F59E0B' },
  incident: { icon: Crosshair, color: '#38BDF8' },
  response: { icon: Siren, color: '#10B981' },
  system: { icon: Settings, color: '#94A3B8' },
}

export function NotificationCenter() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const notifications = useSyncExternalStore(subscribe, getNotifications)
  const unread = useSyncExternalStore(subscribe, unreadCount)

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const visible = showAll ? notifications : notifications.slice(0, 6)

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-muted transition-colors hover:bg-slate-surface hover:text-slate-text"
        aria-label={`Notifications — ${unread} unread`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notification center"
          className="absolute right-0 top-12 z-[1200] w-[360px] overflow-hidden rounded-xl border border-white/10 bg-slate-dark shadow-2xl shadow-black/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <span className="text-sm font-semibold text-slate-text">
              Notifications
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                  {unread} new
                </span>
              )}
            </span>
            <button
              onClick={markAllNotificationsRead}
              disabled={unread === 0}
              className="flex items-center gap-1 text-[11px] font-medium text-forest-light transition-colors hover:text-emerald-300 disabled:cursor-default disabled:opacity-40"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto">
            {visible.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-slate-muted">
                <Inbox size={22} className="opacity-50" />
                <span className="text-xs">No notifications yet.</span>
              </div>
            )}
            {visible.map((n) => {
              const meta = KIND_META[n.kind]
              const Icon = meta.icon
              return (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-3 border-b border-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.03]',
                    !n.read && 'bg-forest-light/[0.04]'
                  )}
                >
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${meta.color}1a`, color: meta.color }}
                  >
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn('text-xs', n.read ? 'text-slate-muted' : 'font-semibold text-slate-text')}>
                        {n.title}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-slate-muted">
                        {relativeTime(n.at)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-muted">{n.body}</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      {!n.read && (
                        <button
                          onClick={() => markNotificationRead(n.id)}
                          className="text-[10px] font-medium text-forest-light hover:text-emerald-300"
                        >
                          Mark as read
                        </button>
                      )}
                      {n.link && (
                        <button
                          onClick={() => {
                            markNotificationRead(n.id)
                            setOpen(false)
                            navigate(n.link!)
                          }}
                          className="text-[10px] font-medium text-slate-muted hover:text-slate-text"
                        >
                          Open →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          {notifications.length > 6 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="w-full border-t border-white/5 px-4 py-2.5 text-center text-[11px] font-medium text-slate-muted transition-colors hover:bg-white/[0.03] hover:text-slate-text"
            >
              {showAll ? 'Show fewer' : `View all (${notifications.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
