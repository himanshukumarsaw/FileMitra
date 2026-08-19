/**
 * Response center (spec #9) — live response tracking with a mini map per
 * team, dispatch/arrival times and a working officer action set:
 * [CONTACT TEAM] [TRACK TEAM] [RESOLVE INCIDENT].
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Siren, Truck, MapPin, CheckCircle2, Phone, Clock, Flame, User, Car, Bug,
  Navigation, Crosshair,
} from 'lucide-react'
import { MapContainer, TileLayer, CircleMarker, Circle, Tooltip } from 'react-leaflet'
import type { AlertType, Dispatch, DispatchStatus } from '../../../shared/types'
import { useDispatches } from '@/hooks/useLiveData'
import { resolveDispatch } from '@/services/api'
import { useRole } from '@/providers/RoleProvider'
import { useToast } from '@/components/ui/Toast'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ui/ConfirmDialog'
import { addAudit, pushNotification } from '@/services/activityStore'
import { cn } from '@/lib/utils'

const STATUS_ORDER: DispatchStatus[] = ['dispatched', 'enroute', 'onscene', 'resolved']

const STATUS_META: Record<DispatchStatus, { label: string; color: string; icon: typeof Siren }> = {
  dispatched: { label: 'Dispatched', color: '#EF4444', icon: Siren },
  enroute: { label: 'En Route', color: '#F59E0B', icon: Truck },
  onscene: { label: 'On Scene', color: '#3B82F6', icon: MapPin },
  resolved: { label: 'Resolved', color: '#10B981', icon: CheckCircle2 },
}

const TYPE_ICONS: Record<AlertType, typeof User> = {
  human: User,
  animal: Bug,
  vehicle: Car,
  fire: Flame,
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m ago`
}

/** Simulated team offset from the incident while travelling (demo-grade) */
function teamPosition(d: Dispatch): [number, number] {
  const [lng, lat] = d.coordinates
  if (d.status === 'dispatched') return [lat - 0.022, lng - 0.018]
  if (d.status === 'enroute') return [lat - 0.009, lng - 0.007]
  return [lat, lng]
}

function StatusStepper({ status }: { status: DispatchStatus }) {
  const activeIndex = STATUS_ORDER.indexOf(status)
  return (
    <div className="flex items-center gap-1">
      {STATUS_ORDER.map((step, i) => {
        const meta = STATUS_META[step]
        const reached = i <= activeIndex
        const StepIcon = meta.icon
        return (
          <div key={step} className="flex flex-1 items-center gap-1">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                reached ? 'border-transparent' : 'border-slate-700/60 bg-white/[0.02]'
              )}
              style={reached ? { background: `${meta.color}26`, color: meta.color } : { color: '#475569' }}
              title={meta.label}
            >
              <StepIcon size={14} />
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <div
                className="h-0.5 flex-1 rounded"
                style={{ background: i < activeIndex ? STATUS_META[STATUS_ORDER[i + 1]].color : '#334155' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Mini map — incident epicenter + live team marker */
function DispatchMiniMap({ dispatch }: { dispatch: Dispatch }) {
  const [lng, lat] = dispatch.coordinates
  const [teamLat, teamLng] = teamPosition(dispatch)
  const meta = STATUS_META[dispatch.status]

  return (
    <div className="overflow-hidden rounded-lg border border-white/5">
      <MapContainer
        center={[lat, lng]}
        zoom={12}
        style={{ height: '150px', width: '100%', background: '#0F172A' }}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {/* Incident location */}
        <Circle
          center={[lat, lng]}
          radius={700}
          pathOptions={{ color: '#38BDF8', fillColor: '#38BDF8', fillOpacity: 0.08, weight: 1, dashArray: '4 6' }}
        />
        <CircleMarker center={[lat, lng]} radius={6} pathOptions={{ color: '#38BDF8', fillColor: '#38BDF8', fillOpacity: 0.9, weight: 2 }}>
          <Tooltip direction="top" offset={[0, -6]}>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Incident</span>
          </Tooltip>
        </CircleMarker>
        {/* Team marker */}
        <CircleMarker
          center={[teamLat, teamLng]}
          radius={6}
          pathOptions={{ color: meta.color, fillColor: meta.color, fillOpacity: 0.9, weight: 2 }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>{dispatch.team}</span>
          </Tooltip>
        </CircleMarker>
      </MapContainer>
    </div>
  )
}

function DispatchCard({ dispatch }: { dispatch: Dispatch }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can, roleLabel } = useRole()
  const { push } = useToast()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null)

  const meta = STATUS_META[dispatch.status]
  const TypeIcon = TYPE_ICONS[dispatch.alertType] ?? User
  const active = dispatch.status !== 'resolved'

  const dispatchedAt = new Date(dispatch.createdAt)
  const arrivalEntry = dispatch.timeline.find((t) => t.label.toLowerCase().includes('arrived'))
  const arrivalAt = arrivalEntry ? new Date(arrivalEntry.at) : null

  const handleResolve = () => {
    setConfirm({
      title: 'Resolve incident?',
      message: `${dispatch.team} will be marked RESOLVED and the response closed. This is recorded in the audit log.`,
      confirmLabel: 'Resolve Incident',
    })
  }

  const doResolve = async () => {
    setBusy(true)
    try {
      const { alreadyResolved } = await resolveDispatch(dispatch.id)
      queryClient.setQueryData<Dispatch[]>(['dispatches'], (prev) =>
        (prev ?? []).map((d) =>
          d.id === dispatch.id
            ? {
                ...d,
                status: 'resolved' as const,
                timeline: [
                  ...d.timeline,
                  { at: new Date().toISOString(), label: 'Officer resolved the incident from the command center' },
                ],
              }
            : d
        )
      )
      addAudit(roleLabel, `Resolved incident ${dispatch.incidentId ?? dispatch.zone}`, dispatch.team)
      pushNotification({
        kind: 'response',
        severity: 'info',
        title: `${dispatch.team} resolved the incident`,
        body: `Response in ${dispatch.zone} closed by ${roleLabel}.`,
        link: '/dispatch',
      })
      push(alreadyResolved ? 'info' : 'success', alreadyResolved ? 'Response was already resolved' : `${dispatch.team} marked RESOLVED`)
    } catch {
      push('error', 'Could not resolve the incident — backend unreachable')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-slate-surface p-5 shadow-lg shadow-black/20 transition-colors',
        active ? 'border-white/10' : 'border-white/5 opacity-80'
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: `${meta.color}1f`, color: meta.color }}
          >
            <TypeIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold capitalize text-slate-text">{dispatch.alertType} incident</span>
              <span
                className="rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}14` }}
              >
                {dispatch.severity}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-muted">
              <span>{dispatch.zone}</span>
              {dispatch.incidentId && (
                <>
                  <span>·</span>
                  <span className="font-mono">{dispatch.incidentId}</span>
                </>
              )}
              <span>·</span>
              <span>{timeAgo(dispatch.createdAt)}</span>
            </div>
          </div>
        </div>
        {active && (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
            <Clock size={12} />
            ETA {dispatch.etaMinutes} min
          </div>
        )}
      </div>

      {/* Live tracking mini map */}
      <div className="mb-4">
        <DispatchMiniMap dispatch={dispatch} />
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-muted">
          <span className="flex items-center gap-1">
            <Crosshair size={10} className="text-sky-400" />
            Incident: {dispatch.coordinates[1].toFixed(3)}, {dispatch.coordinates[0].toFixed(3)}
          </span>
          <span className="flex items-center gap-1" style={{ color: meta.color }}>
            <Navigation size={10} />
            {STATUS_META[dispatch.status].label}
          </span>
        </div>
      </div>

      {/* Status stepper */}
      <StatusStepper status={dispatch.status} />
      <div className="mb-3 mt-1.5 flex justify-between text-[10px] text-slate-muted">
        <span>Dispatched</span>
        <span>En Route</span>
        <span>On Scene</span>
        <span>Resolved</span>
      </div>

      {/* Times */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-muted">Dispatch time</div>
          <div className="font-medium tabular-nums text-slate-text">
            {dispatchedAt.toLocaleTimeString()}
          </div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-muted">Arrival time</div>
          <div className="font-medium tabular-nums text-slate-text">
            {arrivalAt
              ? arrivalAt.toLocaleTimeString()
              : active
                ? `ETA ${dispatch.etaMinutes} min`
                : '—'}
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
        <Siren size={14} className="text-forest-light" />
        <span className="text-sm font-medium text-slate-text">{dispatch.team}</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-muted">
          <Phone size={12} />
          {dispatch.rangerPhone}
        </span>
      </div>

      {/* Actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => window.open(`tel:${dispatch.rangerPhone.replace(/[^\d+]/g, '')}`)}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-text transition-colors hover:bg-white/5"
          title={`Call ${dispatch.team}`}
        >
          <Phone size={12} />
          Contact Team
        </button>
        <button
          onClick={() => navigate('/map')}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-text transition-colors hover:bg-white/5"
          title="Track the team on the command map"
        >
          <MapPin size={12} />
          Track Team
        </button>
        {active && (
          <button
            onClick={handleResolve}
            disabled={!can('incident.resolve') || busy}
            title={can('incident.resolve') ? 'Close this response' : 'Admin or Forest Officer role required'}
            className="flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCircle2 size={12} />
            {busy ? 'Resolving…' : 'Resolve Incident'}
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="flex flex-col gap-0">
        {[...dispatch.timeline].reverse().map((entry, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ background: i === 0 ? meta.color : '#475569' }}
              />
              {i < dispatch.timeline.length - 1 && <span className="w-px flex-1 bg-slate-700/50" />}
            </div>
            <div className="pb-3">
              <p className={cn('text-xs leading-relaxed', i === 0 ? 'text-slate-text' : 'text-slate-muted')}>
                {entry.label}
              </p>
              <p className="text-[10px] text-slate-muted/70">
                {new Date(entry.at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation dialog */}
      <ConfirmDialog
        options={confirm}
        onConfirm={() => {
          setConfirm(null)
          void doResolve()
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

export function DispatchPage() {
  const { dispatches, isLive } = useDispatches()

  const sorted = useMemo(
    () =>
      [...dispatches].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [dispatches]
  )

  const activeCount = sorted.filter((d) => d.status !== 'resolved').length
  const resolvedCount = sorted.length - activeCount

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-text">Response Center</h1>
          <p className="text-sm text-slate-muted">
            Live ranger response tracking — automated and officer-initiated dispatches
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center">
            <div className="text-lg font-bold tabular-nums text-red-400">{activeCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-muted">Active</div>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center">
            <div className="text-lg font-bold tabular-nums text-emerald-400">{resolvedCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-muted">Resolved</div>
          </div>
        </div>
      </div>

      {/* Dispatch grid */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/5 bg-slate-surface py-16">
          <Siren size={32} className="text-slate-muted/50" />
          <p className="text-sm text-slate-muted">
            No dispatches yet — a critical or high-severity alert will trigger an automatic response.
          </p>
          {!isLive && (
            <p className="text-xs text-slate-muted/70">Backend unreachable — showing nothing yet.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {sorted.map((dispatch) => (
            <DispatchCard key={dispatch.id} dispatch={dispatch} />
          ))}
        </div>
      )}
    </div>
  )
}
