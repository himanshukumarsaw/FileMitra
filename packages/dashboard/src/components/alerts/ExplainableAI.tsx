/**
 * Alert intelligence drawer (spec #3, #4, #5, #7) — every alert is clickable
 * and opens this panel: full detail grid, threat score, AI reasoning,
 * acoustic evidence and the complete officer action set.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, User, Bug, Car, Flame, Image, Crosshair, ShieldCheck, ShieldAlert,
  Check, ThumbsUp, ThumbsDown, Eye, Siren, ArrowUpCircle, FolderPlus, Brain,
  CircleCheck,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { Alert, AlertSeverity, AlertType } from '../../../../../shared/types'
import {
  acknowledgeAlert, alertFeedback, escalateAlert, createDispatch, createIncident,
} from '@/services/api'
import { useAlerts, useNodes } from '@/hooks/useLiveData'
import { useRole } from '@/providers/RoleProvider'
import { useToast } from '@/components/ui/Toast'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ui/ConfirmDialog'
import { ThreatScoreGauge } from '@/components/alerts/ThreatScoreGauge'
import { AcousticEvidence } from '@/components/alerts/AcousticEvidence'
import { computeThreatScore, recommendedAction, detectionReasons, AI_MODEL } from '@/services/intel'
import { addAudit, pushNotification } from '@/services/activityStore'
import { formatCoords, shortId } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ExplainableAIProps {
  alert: Alert | null
  isOpen: boolean
  onClose: () => void
}

const severityStyles: Record<AlertSeverity, string> = {
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
}

const typeIcons: Record<AlertType, typeof User> = {
  human: User,
  animal: Bug,
  vehicle: Car,
  fire: Flame,
}

const typeLabels: Record<AlertType, string> = {
  human: 'Human',
  animal: 'Animal',
  vehicle: 'Vehicle',
  fire: 'Fire',
}

const barColors: Record<string, string> = {
  visual: '#10B981',
  audio: '#3B82F6',
  motion: '#F59E0B',
  contextual: '#8B5CF6',
}

type Busy = 'ack' | 'genuine' | 'false' | 'dispatch' | 'escalate' | 'incident' | null

export function ExplainableAI({ alert, isOpen, onClose }: ExplainableAIProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { can, roleLabel } = useRole()
  const { push } = useToast()
  const { nodes } = useNodes()
  const { alerts } = useAlerts()
  const [busy, setBusy] = useState<Busy>(null)
  const [confirm, setConfirm] = useState<(ConfirmOptions & { run: () => Promise<void> }) | null>(null)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirm(null)
      if (e.key === 'Escape' && !confirm) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose, confirm])

  const assessment = useMemo(
    () => (alert ? computeThreatScore(alert, { nodes, alerts }) : null),
    [alert, nodes, alerts]
  )

  if (!alert || !assessment) return null

  const TypeIcon = typeIcons[alert.type]
  const breakdown = alert.explanation.confidenceBreakdown
  const factors = alert.explanation.factors
  const node = nodes.find((n) => n.id === alert.nodeId)
  const confirmed = alert.verificationStatus === 'confirmed'
  const reasons = detectionReasons(alert)
  const action = recommendedAction(alert, assessment)

  // Push an updated alert into the shared cache so lists reflect officer actions
  const patchCache = (updated: Alert) => {
    queryClient.setQueryData<Alert[]>(['alerts'], (prev) =>
      prev?.map((a) => (a.id === updated.id ? updated : a))
    )
  }

  const withBusy = async (kind: Busy, fn: () => Promise<void>) => {
    setBusy(kind)
    try {
      await fn()
    } catch {
      push('error', 'Command failed — backend unreachable.')
    } finally {
      setBusy(null)
    }
  }

  const handleAcknowledge = () =>
    withBusy('ack', async () => {
      patchCache(await acknowledgeAlert(alert.id))
      addAudit(roleLabel, 'acknowledged alert', `ALR-${shortId(alert.id)}`)
      push('success', `Alert ALR-${shortId(alert.id)} acknowledged — response clock started.`)
    })

  const handleFeedback = (feedback: 'genuine' | 'false_alarm') =>
    withBusy(feedback === 'genuine' ? 'genuine' : 'false', async () => {
      patchCache(await alertFeedback(alert.id, feedback))
      addAudit(roleLabel, feedback === 'genuine' ? 'marked alert genuine' : 'marked alert false positive', `ALR-${shortId(alert.id)}`)
      push(
        feedback === 'genuine' ? 'success' : 'info',
        feedback === 'genuine'
          ? 'Logged as genuine — feeds the false-alarm suppression engine.'
          : 'Marked false positive — alert dismissed from active queue.'
      )
    })

  const handleDispatch = () =>
    withBusy('dispatch', async () => {
      const { dispatch, created } = await createDispatch(alert.id)
      queryClient.invalidateQueries({ queryKey: ['dispatches'] })
      addAudit(roleLabel, created ? 'dispatched response team' : 'confirmed existing dispatch', `${dispatch.team} → ALR-${shortId(alert.id)}`)
      pushNotification({
        kind: 'response',
        title: `${dispatch.team} ${created ? 'dispatched' : 'already responding'}`,
        body: `Zone ${dispatch.zone} — ETA ${dispatch.etaMinutes} min`,
        severity: 'critical',
        link: '/dispatch',
      })
      push(
        created ? 'success' : 'info',
        created
          ? `${dispatch.team} dispatched — ETA ${dispatch.etaMinutes} min.`
          : 'A team is already responding to this incident.'
      )
    })

  const handleEscalate = () =>
    withBusy('escalate', async () => {
      const { alert: updated, created } = await escalateAlert(alert.id)
      patchCache(updated)
      queryClient.invalidateQueries({ queryKey: ['dispatches'] })
      addAudit(roleLabel, 'escalated alert to CRITICAL', `ALR-${shortId(alert.id)}`)
      pushNotification({
        kind: 'alert',
        title: `Alert escalated to CRITICAL`,
        body: `${updated.type} detection — ${created ? 'response team requested' : 'response already active'}`,
        severity: 'critical',
        link: '/alerts',
      })
      push('warning', 'Escalated to CRITICAL + confirmed — response team requested.')
    })

  const handleCreateIncident = () =>
    withBusy('incident', async () => {
      const { alert: updated, incidentId, created } = await createIncident(alert.id)
      patchCache(updated)
      addAudit(roleLabel, created ? 'created incident' : 'linked alert to existing incident', incidentId)
      push('success', created ? `Incident ${incidentId} created.` : `Already grouped under ${incidentId}.`)
    })

  const askConfirm = (options: ConfirmOptions, run: () => Promise<void>) =>
    setConfirm({ ...options, run })

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${typeLabels[alert.type]} alert detail`}
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-slate-dark shadow-2xl transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
              <TypeIcon size={18} className="text-slate-muted" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-text">
                  {typeLabels[alert.type]} Detection
                </span>
                <span
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                    severityStyles[alert.severity]
                  )}
                >
                  {alert.severity}
                </span>
                {alert.incidentId && (
                  <button
                    onClick={() => navigate('/incidents')}
                    className="flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400 hover:bg-sky-500/20"
                    title="Correlated into one incident — click to view"
                  >
                    <Crosshair size={10} />
                    {alert.incidentId}
                  </button>
                )}
                {alert.verificationStatus && (
                  <span
                    className={cn(
                      'flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                      confirmed
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    )}
                    title={
                      confirmed
                        ? 'Corroborated by a second node or camera — dispatch authorised'
                        : 'Single-node detection — awaiting mesh or camera corroboration'
                    }
                  >
                    {confirmed ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                    {alert.verificationStatus}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-muted">
                ALR-{shortId(alert.id)} · Confidence {Math.round(alert.confidence * 100)}% · Status{' '}
                <span className="capitalize">{alert.status}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-muted transition-colors hover:bg-white/5 hover:text-slate-text"
            aria-label="Close alert detail"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Detail grid */}
          <section className="mb-5 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-3.5 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-muted">Detected</div>
              <div className="mt-0.5 tabular-nums text-slate-text">
                {new Date(alert.timestamp).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-muted">Location</div>
              <div className="mt-0.5 font-mono text-[11px] text-slate-text">
                {formatCoords(alert.location.coordinates)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-muted">Node</div>
              <div className="mt-0.5 text-slate-text">
                {node?.name ?? `Node ${shortId(alert.nodeId)}`}
                {node?.zone ? <span className="text-slate-muted"> · {node.zone}</span> : null}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-muted">AI Classification</div>
              <div className="mt-0.5 capitalize text-slate-text">
                {alert.soundType?.replace('_', ' ') ?? alert.type}
                {alert.species ? <span className="text-slate-muted"> · {alert.species}</span> : null}
              </div>
            </div>
          </section>

          {/* Threat score */}
          <section className="mb-5">
            <ThreatScoreGauge assessment={assessment} />
          </section>

          {/* Recommended action */}
          <section className="mb-5 flex items-start gap-2.5 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3.5 py-3">
            <Siren size={14} className="mt-0.5 shrink-0 text-sky-400" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                Recommended Action
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-text">{action}</p>
            </div>
          </section>

          {/* AI Summary */}
          <section className="mb-5">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-muted">
              AI Summary
            </h4>
            <p className="text-sm leading-relaxed text-slate-text">
              {alert.explanation.summary}
            </p>
          </section>

          {/* Why was this detected? */}
          <section className="mb-5">
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-muted">
              <Brain size={12} />
              Why was this detected?
            </h4>
            <ul className="flex flex-col gap-1.5">
              {reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-xs text-slate-text">
                  <CircleCheck size={13} className="mt-0.5 shrink-0 text-forest-light" />
                  {reason}
                </li>
              ))}
            </ul>
            <p className="mt-2.5 border-t border-white/5 pt-2 text-[10px] text-slate-muted">
              Model: {AI_MODEL.name} {AI_MODEL.version} · Inference latency {AI_MODEL.inferenceMs} ms
            </p>
          </section>

          {/* Verification evidence — mesh corroboration + visual AI labels */}
          {(confirmed || (alert.visualLabels?.length ?? 0) > 0) && (
            <section className="mb-5">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-muted">
                Verification Evidence
              </h4>
              <div className="flex flex-col gap-2">
                {confirmed && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                    <ShieldCheck size={14} className="shrink-0 text-emerald-400" />
                    <span className="text-xs text-slate-text">
                      Corroborated by{' '}
                      <span className="font-semibold text-emerald-400">
                        {alert.confirmingNodes?.length ?? 1} node{(alert.confirmingNodes?.length ?? 1) > 1 ? 's' : ''}
                      </span>{' '}
                      on the mesh — threat confirmed.
                    </span>
                  </div>
                )}
                {(alert.visualLabels?.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-muted">
                      <Eye size={12} />
                      Visual AI identified on captured frame:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {alert.visualLabels!.map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-300"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Acoustic evidence */}
          {alert.soundType && (
            <section className="mb-5">
              <AcousticEvidence alert={alert} />
            </section>
          )}

          {/* Confidence Breakdown */}
          <section className="mb-5">
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
              Confidence Breakdown
            </h4>
            <div className="flex flex-col gap-3">
              {Object.entries(breakdown).map(([key, value]) => (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs capitalize text-slate-text">{key}</span>
                    <span className="text-xs tabular-nums text-slate-muted">
                      {Math.round(value * 100)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${value * 100}%`,
                        backgroundColor: barColors[key] ?? '#10B981',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Contributing Factors */}
          {factors.length > 0 && (
            <section className="mb-5">
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
                Contributing Factors
              </h4>
              <div className="flex flex-col gap-3">
                {factors.map((factor, i) => (
                  <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-text">{factor.name}</span>
                      <span className="text-[10px] tabular-nums text-slate-muted">
                        weight: {Math.round(factor.weight * 100)}%
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-slate-muted">{factor.description}</p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-forest-light transition-all duration-700 ease-out"
                        style={{ width: `${factor.weight * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Evidence */}
          <section>
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
              Visual Evidence
            </h4>
            {alert.imageUrl ? (
              <div className="overflow-hidden rounded-lg border border-white/5">
                <img
                  src={alert.imageUrl}
                  alt="Alert evidence"
                  className="h-48 w-full object-cover"
                  loading="lazy"
                />
                <div className="flex items-center gap-2 bg-white/[0.02] px-3 py-2">
                  <Image size={12} className="text-slate-muted" />
                  <span className="text-xs text-slate-muted">Captured image</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-6">
                <Image size={20} className="text-slate-muted" />
                <span className="text-xs text-slate-muted">No image available</span>
              </div>
            )}
          </section>

          {/* Officer actions */}
          <section className="mt-6 border-t border-white/5 pt-5">
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
              Officer Actions
              <span className="ml-2 font-normal normal-case text-slate-muted/70">({roleLabel})</span>
            </h4>
            {alert.acknowledgedAt && (
              <p className="mb-3 flex items-center gap-1.5 text-xs text-emerald-400">
                <Check size={12} />
                Acknowledged at {new Date(alert.acknowledgedAt).toLocaleTimeString()}
              </p>
            )}
            {alert.feedback && (
              <p className="mb-3 text-xs text-slate-muted">
                Marked{' '}
                <span className={alert.feedback === 'genuine' ? 'font-semibold text-emerald-400' : 'font-semibold text-red-400'}>
                  {alert.feedback === 'genuine' ? 'genuine' : 'false alarm'}
                </span>{' '}
                — feedback feeds the false-alarm suppression engine.
              </p>
            )}
            {!can('alert.acknowledge') ? (
              <p className="text-xs text-slate-muted">
                Read-only role — switch role in Settings to perform command actions.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {!alert.acknowledgedAt && (
                  <button
                    onClick={() => void handleAcknowledge()}
                    disabled={busy !== null}
                    className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-400 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
                  >
                    <Check size={13} />
                    {busy === 'ack' ? 'Acknowledging…' : 'Acknowledge'}
                  </button>
                )}
                {!alert.incidentId && can('alert.dispatch') && (
                  <button
                    onClick={() => void handleCreateIncident()}
                    disabled={busy !== null}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-text transition-colors hover:bg-white/5 disabled:opacity-50"
                  >
                    <FolderPlus size={13} />
                    {busy === 'incident' ? 'Creating…' : 'Create Incident'}
                  </button>
                )}
                {can('alert.dispatch') && alert.status !== 'resolved' && (
                  <button
                    onClick={() => void handleDispatch()}
                    disabled={busy !== null}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    <Siren size={13} />
                    {busy === 'dispatch' ? 'Dispatching…' : 'Dispatch'}
                  </button>
                )}
                {can('alert.escalate') && alert.severity !== 'critical' && (
                  <button
                    onClick={() =>
                      askConfirm(
                        {
                          title: 'Escalate to CRITICAL?',
                          message: 'This marks the alert as confirmed, raises severity to critical and requests an immediate response team.',
                          confirmLabel: 'Escalate',
                          danger: true,
                        },
                        handleEscalate
                      )
                    }
                    disabled={busy !== null}
                    className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-400 transition-colors hover:bg-orange-500/20 disabled:opacity-50"
                  >
                    <ArrowUpCircle size={13} />
                    {busy === 'escalate' ? 'Escalating…' : 'Escalate'}
                  </button>
                )}
                {can('alert.feedback') && !alert.feedback && (
                  <>
                    <button
                      onClick={() => void handleFeedback('genuine')}
                      disabled={busy !== null}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      <ThumbsUp size={13} />
                      {busy === 'genuine' ? 'Saving…' : 'Genuine'}
                    </button>
                    <button
                      onClick={() =>
                        askConfirm(
                          {
                            title: 'Mark as false positive?',
                            message: 'The alert will be dismissed and logged as a false positive for model retraining.',
                            confirmLabel: 'Mark False Positive',
                            danger: true,
                          },
                          () => handleFeedback('false_alarm')
                        )
                      }
                      disabled={busy !== null}
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <ThumbsDown size={13} />
                      {busy === 'false' ? 'Saving…' : 'False Positive'}
                    </button>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Confirmation dialog */}
      <ConfirmDialog
        options={confirm}
        onConfirm={() => {
          const run = confirm?.run
          setConfirm(null)
          if (run) void run()
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
