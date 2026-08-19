import { useEffect, useState } from 'react'
import { Sun, Moon, Radio, AlertTriangle, Siren, Volume2, VolumeX, UserCircle2, Menu } from 'lucide-react'
import { useTheme } from '@/providers/ThemeProvider'
import { useConnectionStatus, useSocketEvent } from '@/hooks/useSocket'
import { useLiveAlertListener } from '@/hooks/useLiveData'
import { useRole, ROLES, type Role } from '@/providers/RoleProvider'

import { NotificationCenter } from './NotificationCenter'
import type { Alert, Dispatch } from '../../../../shared/types'

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, toggleTheme } = useTheme()
  const connected = useConnectionStatus()
  const { role, setRole, roleLabel } = useRole()

  // Voice alerts (spec #25) — critical events are announced via text-to-speech
  const [voiceEnabled, setVoiceEnabled] = useState(true)

  // Transient toast when a live alert arrives from the mesh
  const [toast, setToast] = useState<Alert | null>(null)
  useLiveAlertListener((alert) => {
    setToast(alert)
    if (voiceEnabled && alert.severity === 'critical' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Warning. ${alert.type} alert, severity critical. ${alert.description ?? ''}`
      )
      utterance.rate = 1.05
      window.speechSynthesis.speak(utterance)
    }
  })
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  // Transient toast when the system auto-dispatches a ranger team
  const [dispatchToast, setDispatchToast] = useState<Dispatch | null>(null)
  useSocketEvent<Dispatch>('dispatch:new', (dispatch) => setDispatchToast(dispatch))
  useEffect(() => {
    if (!dispatchToast) return
    const timer = setTimeout(() => setDispatchToast(null), 7000)
    return () => clearTimeout(timer)
  }, [dispatchToast])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-surface bg-slate-dark/80 px-4 backdrop-blur-md lg:gap-4 lg:px-6">
      {/* Mobile navigation toggle (spec #22) */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-muted transition-colors hover:bg-slate-surface hover:text-slate-text lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Live connection pill */}
      <div
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
          connected
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
        }`}
        title={connected ? 'Realtime connection to backend active' : 'Backend unreachable — showing cached/mock data'}
      >
        <Radio className="h-3 w-3" />
        {connected ? 'SYSTEM LIVE' : 'RECONNECTING'}
      </div>

      {/* New-alert toast */}
      {toast && (
        <div className="absolute left-1/2 top-16 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-red-500/40 bg-slate-surface px-4 py-2 text-sm text-slate-text shadow-xl shadow-black/40">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span>
            New <span className="font-semibold capitalize">{toast.type}</span> alert —{' '}
            <span className="capitalize text-red-400">{toast.severity}</span>
            {toast.description ? `: ${toast.description.slice(0, 60)}` : ''}
          </span>
        </div>
      )}

      {/* Auto-dispatch toast */}
      {dispatchToast && (
        <div className="absolute left-1/2 top-[7.5rem] z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-emerald-500/40 bg-slate-surface px-4 py-2 text-sm text-slate-text shadow-xl shadow-black/40">
          <Siren className="h-4 w-4 text-emerald-400" />
          <span>
            📟 SMS → <span className="font-semibold">{dispatchToast.team}</span>:{' '}
            dispatched to <span className="capitalize">{dispatchToast.zone}</span> — ETA{' '}
            {dispatchToast.etaMinutes} min
          </span>
        </div>
      )}



      <div className="flex items-center gap-3 ml-auto">
        {/* Voice alert toggle */}
        <button
          onClick={() => setVoiceEnabled((v) => !v)}
          className="rounded-lg p-2 text-slate-muted transition-colors hover:bg-slate-surface hover:text-slate-text"
          aria-label={voiceEnabled ? 'Mute voice alerts' : 'Enable voice alerts'}
          title={voiceEnabled ? 'Voice alerts on (critical events)' : 'Voice alerts muted'}
        >
          {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>

        {/* Notifications (spec #16) */}
        <NotificationCenter />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-muted transition-colors hover:bg-slate-surface hover:text-slate-text"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-700/50" />

        {/* Role switcher (spec #19) */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-light/20 text-forest-light">
            <UserCircle2 className="h-5 w-5" />
          </div>
          <div className="hidden flex-col md:flex">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              aria-label="Switch role"
              className="cursor-pointer rounded-md border border-white/10 bg-slate-surface px-2 py-1 text-xs font-medium text-slate-text focus:border-forest-light/40 focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-muted">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
