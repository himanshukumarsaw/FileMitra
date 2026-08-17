/**
 * Node detail drawer (spec #15) — full hardware diagnostics, warning states
 * and management commands for a single monitoring node. Slides in from the
 * right over the Nodes page; every action is wired to the node command
 * service and recorded in the audit log.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  X, Battery, Sun, Signal, Thermometer, MemoryStick, HardDrive, Mic2,
  Network, Clock, MapPin, Cpu, RotateCw, SlidersHorizontal, Download,
  ScrollText, LocateFixed, AlertTriangle, Loader2, CheckCircle2, XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { relativeTime, formatCoords } from '@/lib/format'
import type { MonitoringNode } from '../../../../../shared/types'
import {
  deriveTelemetry,
  deriveNodeWarnings,
  LATEST_FIRMWARE,
} from '@/services/nodeTelemetry'
import {
  restartNode,
  calibrateMicrophone,
  updateFirmware,
  fetchNodeLogs,
  type NodeLogLine,
} from '@/services/nodeActions'
import { useAlerts } from '@/hooks/useLiveData'
import { useRole } from '@/providers/RoleProvider'
import { useToast } from '@/components/ui/Toast'
import { ConfirmDialog, type ConfirmOptions } from '@/components/ui/ConfirmDialog'
import { addAudit, pushNotification } from '@/services/activityStore'

const STATUS_META: Record<MonitoringNode['status'], { label: string; classes: string; dot: string }> = {
  online: { label: 'Online', classes: 'bg-forest-light/10 text-forest-light', dot: 'bg-forest-light' },
  warning: { label: 'Warning', classes: 'bg-amber/10 text-amber', dot: 'bg-amber' },
  offline: { label: 'Offline', classes: 'bg-danger/10 text-danger', dot: 'bg-danger' },
}

const LEVEL_TONE: Record<NodeLogLine['level'], string> = {
  info: 'text-slate-muted',
  warn: 'text-amber',
  error: 'text-danger',
}

interface NodeDetailDrawerProps {
  node: MonitoringNode | null
  onClose: () => void
}

export function NodeDetailDrawer({ node, onClose }: NodeDetailDrawerProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { alerts } = useAlerts()
  const { can, roleLabel } = useRole()
  const { push } = useToast()

  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<(ConfirmOptions & { run: () => void }) | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<NodeLogLine[] | null>(null)

  // Reset transient state whenever a different node is opened
  useEffect(() => {
    setBusy(null)
    setShowLogs(false)
    setLogs(null)
  }, [node?.id])

  useEffect(() => {
    if (!node) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [node, onClose])

  const telemetry = useMemo(() => (node ? deriveTelemetry(node) : null), [node])
  const warnings = useMemo(
    () => (node && telemetry ? deriveNodeWarnings(node, telemetry) : []),
    [node, telemetry]
  )

  const alertCount = useMemo(() => {
    if (!node) return 0
    const weekAgo = Date.now() - 7 * 24 * 3600_000
    return alerts.filter(
      (a) =>
        a.nodeId === node.id ||
        (a.confirmingNodes ?? []).includes(node.id)
    ).filter((a) => new Date(a.timestamp).getTime() >= weekAgo).length
  }, [alerts, node])

  if (!node || !telemetry) return null

  const status = STATUS_META[node.status]
  const manageAllowed = can('node.manage')

  const patchNode = (patch: Partial<MonitoringNode>) => {
    queryClient.setQueryData<MonitoringNode[]>(['nodes'], (prev) =>
      prev?.map((n) => (n.id === node.id ? { ...n, ...patch } : n))
    )
  }

  const runCommand = async (
    key: string,
    action: () => Promise<{ ok: boolean; message: string; firmwareVersion?: string }>,
    auditVerb: string
  ) => {
    setBusy(key)
    try {
      const result = await action()
      push(result.ok ? 'success' : 'error', result.message)
      addAudit(roleLabel, `${auditVerb} on node "${node.name}"`, node.id)
      if (result.ok && result.firmwareVersion) {
        patchNode({ firmwareVersion: result.firmwareVersion })
      }
      if (!result.ok) {
        pushNotification({
          kind: 'node',
          title: `Node command failed — ${node.name}`,
          body: result.message,
          severity: 'warning',
          link: '/nodes',
        })
      }
    } finally {
      setBusy(null)
    }
  }

  const handleRestart = () =>
    setConfirm({
      title: 'Restart node?',
      message: `"${node.name}" will reboot and be unreachable for ~2 minutes while it re-joins the LoRa mesh.`,
      confirmLabel: 'Restart node',
      danger: true,
      run: () => void runCommand('restart', () => restartNode(node), 'Sent restart command'),
    })

  const handleCalibrate = () =>
    void runCommand('calibrate', () => calibrateMicrophone(node), 'Calibrated microphone')

  const handleFirmware = () =>
    setConfirm({
      title: 'Update firmware?',
      message:
        node.firmwareVersion === LATEST_FIRMWARE
          ? `"${node.name}" already runs ${LATEST_FIRMWARE}. Re-run the integrity check?`
          : `Stages firmware ${LATEST_FIRMWARE} (currently ${node.firmwareVersion}). The node installs it on its next charge window and reboots.`,
      confirmLabel: 'Update firmware',
      run: () => void runCommand('firmware', () => updateFirmware(node), 'Updated firmware'),
    })

  const toggleLogs = () => {
    const next = !showLogs
    setShowLogs(next)
    if (next && !logs) {
      setLogs(null)
      void fetchNodeLogs(node).then(setLogs)
    }
  }

  const locateOnMap = () => navigate(`/map?focus=${encodeURIComponent(node.id)}`)

  return (
    <>
      <div
        className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Node details: ${node.name}`}
        className="fixed inset-y-0 right-0 z-[1001] flex w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-slate-dark shadow-2xl shadow-black/60"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/5 bg-slate-dark/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-text">{node.name}</h2>
              <p className="mt-0.5 text-xs text-slate-muted">
                {node.zone} · {node.hardwareModel} · FW {node.firmwareVersion}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium', status.classes)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                {status.label}
              </span>
              <button
                onClick={onClose}
                aria-label="Close node details"
                className="rounded-lg p-1.5 text-slate-muted transition-colors hover:bg-white/5 hover:text-slate-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          {/* Warnings */}
          {warnings.length > 0 ? (
            <div className="flex flex-col gap-2" role="list" aria-label="Node warnings">
              {warnings.map((w, i) => (
                <div
                  key={`${w.key}-${i}`}
                  role="listitem"
                  className={cn(
                    'flex items-start gap-2.5 rounded-lg border px-3 py-2.5',
                    w.severity === 'critical'
                      ? 'border-danger/30 bg-danger/10'
                      : 'border-amber/25 bg-amber/10'
                  )}
                >
                  <AlertTriangle
                    className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', w.severity === 'critical' ? 'text-danger' : 'text-amber')}
                  />
                  <div>
                    <p className={cn('text-xs font-semibold', w.severity === 'critical' ? 'text-danger' : 'text-amber')}>
                      {w.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-muted">{w.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-forest-light/20 bg-forest-light/5 px-3 py-2.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-forest-light" />
              <p className="text-xs text-slate-text">All subsystems nominal — no active warnings</p>
            </div>
          )}

          {/* Telemetry grid */}
          <section aria-label="Hardware telemetry">
            <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
              Hardware Telemetry
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <TelemetryTile
                icon={<Battery className="h-3.5 w-3.5" />}
                label="Battery"
                value={`${node.batteryLevel}%`}
                tone={node.batteryLevel <= 30 ? 'text-danger' : node.batteryLevel <= 60 ? 'text-amber' : 'text-slate-text'}
              />
              <TelemetryTile
                icon={<Sun className="h-3.5 w-3.5" />}
                label="Solar"
                value={node.solarCharging ? `Charging · ${(node.solarInputW ?? 1.4).toFixed(1)} W` : 'Inactive'}
                tone={node.solarCharging ? 'text-forest-light' : 'text-slate-muted'}
              />
              <TelemetryTile
                icon={<Signal className="h-3.5 w-3.5" />}
                label="Signal"
                value={`${node.signalStrength} dBm`}
                tone={node.signalStrength < -80 ? 'text-amber' : 'text-slate-text'}
              />
              <TelemetryTile
                icon={<Thermometer className="h-3.5 w-3.5" />}
                label="CPU Temp"
                value={node.status === 'offline' ? '—' : `${telemetry.cpuTempC} °C`}
                tone={telemetry.cpuTempC > 60 ? 'text-amber' : 'text-slate-text'}
              />
              <TelemetryTile
                icon={<MemoryStick className="h-3.5 w-3.5" />}
                label="Memory"
                value={node.status === 'offline' ? '—' : `${telemetry.memoryUsedPct}% used`}
              />
              <TelemetryTile
                icon={<HardDrive className="h-3.5 w-3.5" />}
                label="Storage"
                value={node.status === 'offline' ? '—' : `${telemetry.storageUsedPct}% used`}
                tone={telemetry.storageUsedPct >= 90 ? 'text-amber' : 'text-slate-text'}
              />
              <TelemetryTile
                icon={<Mic2 className="h-3.5 w-3.5" />}
                label="Microphone"
                value={
                  node.status === 'offline'
                    ? 'Unreachable'
                    : telemetry.micHealth === 'healthy'
                      ? `Healthy · ${telemetry.micSnrDb} dB SNR`
                      : telemetry.micHealth === 'degraded'
                        ? 'Degraded'
                        : 'Faulty'
                }
                tone={
                  telemetry.micHealth === 'healthy'
                    ? 'text-forest-light'
                    : telemetry.micHealth === 'degraded'
                      ? 'text-amber'
                      : 'text-danger'
                }
              />
              <TelemetryTile
                icon={<Network className="h-3.5 w-3.5" />}
                label="Network"
                value={
                  node.status === 'offline'
                    ? 'Down'
                    : `${telemetry.networkHealth} · ${telemetry.packetLossPct}% loss`
                }
                tone={
                  telemetry.networkHealth === 'healthy'
                    ? 'text-forest-light'
                    : telemetry.networkHealth === 'degraded'
                      ? 'text-amber'
                      : 'text-danger'
                }
              />
              <TelemetryTile
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Last Heartbeat"
                value={relativeTime(node.lastSeen)}
                tone={node.status === 'offline' ? 'text-danger' : 'text-slate-text'}
              />
              <TelemetryTile
                icon={<Cpu className="h-3.5 w-3.5" />}
                label="Uptime"
                value={node.status === 'offline' ? '—' : `${telemetry.uptimeHours} h`}
              />
              <div className="col-span-2 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-muted" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-muted">Coordinates</p>
                  <p className="font-mono text-xs text-slate-text">{formatCoords(node.location.coordinates)}</p>
                </div>
                <span className="ml-auto text-[11px] text-slate-muted">{alertCount} alerts · 7d</span>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section aria-label="Node management actions">
            <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
              Management
            </h3>
            {!manageAllowed && (
              <p className="mb-2 flex items-center gap-1.5 text-[11px] text-slate-muted">
                <XCircle className="h-3 w-3" />
                {roleLabel} role has no node management permission — actions are read-only.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                icon={<RotateCw className="h-3.5 w-3.5" />}
                label="Restart Node"
                busy={busy === 'restart'}
                disabled={!manageAllowed}
                onClick={handleRestart}
              />
              <ActionButton
                icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
                label="Calibrate Microphone"
                busy={busy === 'calibrate'}
                disabled={!manageAllowed}
                onClick={handleCalibrate}
              />
              <ActionButton
                icon={<Download className="h-3.5 w-3.5" />}
                label="Update Firmware"
                busy={busy === 'firmware'}
                disabled={!manageAllowed}
                onClick={handleFirmware}
              />
              <ActionButton
                icon={<ScrollText className="h-3.5 w-3.5" />}
                label={showLogs ? 'Hide Logs' : 'View Logs'}
                onClick={toggleLogs}
              />
              <button
                onClick={locateOnMap}
                className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-forest-light/15 px-3 py-2.5 text-xs font-semibold text-forest-light transition-colors hover:bg-forest-light/25"
              >
                <LocateFixed className="h-3.5 w-3.5" />
                Locate on Map
              </button>
            </div>
          </section>

          {/* Device log */}
          {showLogs && (
            <section aria-label="Device log">
              <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                Device Log
              </h3>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-white/5 bg-black/30 p-3 font-mono text-[11px]">
                {logs === null ? (
                  <p className="flex items-center gap-2 py-4 text-slate-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Fetching logs from node…
                  </p>
                ) : (
                  logs.map((line, i) => (
                    <div key={i} className="flex gap-2 py-0.5">
                      <span className="shrink-0 tabular-nums text-slate-muted/60">
                        {new Date(line.at).toLocaleTimeString()}
                      </span>
                      <span className={LEVEL_TONE[line.level]}>{line.text}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      </aside>

      <ConfirmDialog
        options={confirm}
        onConfirm={() => {
          const run = confirm?.run
          setConfirm(null)
          run?.()
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}

function TelemetryTile({
  icon,
  label,
  value,
  tone = 'text-slate-text',
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-slate-muted">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('mt-1 truncate text-xs font-medium', tone)} title={value}>
        {value}
      </p>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
  busy = false,
  disabled = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  busy?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-xs font-medium text-slate-text transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  )
}
