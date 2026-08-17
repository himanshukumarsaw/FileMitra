/**
 * Node telemetry derivation (spec #15) — extended hardware diagnostics for the
 * node detail drawer. Pure functions over the shared MonitoringNode so every
 * page stays consistent with the live data layer. Deterministic per node id,
 * ready to be swapped for a real telemetry endpoint without UI changes.
 */

import type { MonitoringNode } from '../../../../shared/types'

export const LATEST_FIRMWARE = 'v2.4.0'

export type NodeWarningKey =
  | 'low-battery'
  | 'weak-signal'
  | 'no-heartbeat'
  | 'microphone-failure'
  | 'storage-full'
  | 'firmware-outdated'

export interface NodeWarning {
  key: NodeWarningKey
  label: string
  detail: string
  severity: 'warning' | 'critical'
}

export interface NodeTelemetry {
  cpuTempC: number
  memoryUsedPct: number
  storageUsedPct: number
  micHealth: 'healthy' | 'degraded' | 'faulty'
  micSnrDb: number
  networkHealth: 'healthy' | 'degraded' | 'down'
  packetLossPct: number
  uplinkMs: number
  uptimeHours: number
}

const LOW_BATTERY_PCT = 30
const WEAK_SIGNAL_DBM = -80
const NO_HEARTBEAT_MS = 10 * 60_000
const STORAGE_FULL_PCT = 90

/** Small deterministic seed from the node id (mulberry32-style mixer) */
function seedOf(id: string): number {
  let h = 1779033703 ^ id.length
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

function frac(seed: number, salt: number): number {
  const t = Math.imul(seed ^ salt, 2654435761)
  return (((t ^ (t >>> 16)) >>> 0) % 1000) / 1000
}

function between(seed: number, salt: number, min: number, max: number): number {
  return min + frac(seed, salt) * (max - min)
}

export function deriveTelemetry(node: MonitoringNode): NodeTelemetry {
  const seed = seedOf(node.id)
  const offline = node.status === 'offline'

  const cpuTempC = offline
    ? 0
    : Math.round(between(seed, 1, 38, 52) + (node.batteryLevel < 25 ? 7 : 0))
  const memoryUsedPct = offline ? 0 : Math.round(between(seed, 2, 28, 64))
  const storageUsedPct = offline ? 0 : Math.round(between(seed, 3, 34, 94))

  const micScore = frac(seed, 4)
  const micHealth: NodeTelemetry['micHealth'] = offline
    ? 'faulty'
    : micScore > 0.9
      ? 'faulty'
      : micScore > 0.76
        ? 'degraded'
        : 'healthy'
  const micSnrDb = offline
    ? 0
    : Math.round(micHealth === 'healthy' ? between(seed, 5, 48, 61) : between(seed, 5, 18, 38))

  const packetLossPct = offline
    ? 100
    : Math.round(between(seed, 6, node.signalStrength < WEAK_SIGNAL_DBM ? 6 : 0.4, node.signalStrength < WEAK_SIGNAL_DBM ? 19 : 5) * 10) / 10
  const networkHealth: NodeTelemetry['networkHealth'] = offline
    ? 'down'
    : node.signalStrength < WEAK_SIGNAL_DBM || packetLossPct > 8
      ? 'degraded'
      : 'healthy'
  const uplinkMs = offline ? 0 : Math.round(between(seed, 7, 320, 1400))

  const ageMs = Date.now() - new Date(node.lastSeen).getTime()
  const uptimeHours = offline ? 0 : Math.round(between(seed, 8, 40, 720)) + Math.floor(ageMs / 3600_000)

  return {
    cpuTempC,
    memoryUsedPct,
    storageUsedPct,
    micHealth,
    micSnrDb,
    networkHealth,
    packetLossPct,
    uplinkMs,
    uptimeHours,
  }
}

export function deriveNodeWarnings(node: MonitoringNode, telemetry: NodeTelemetry): NodeWarning[] {
  const warnings: NodeWarning[] = []
  const ageMs = Date.now() - new Date(node.lastSeen).getTime()

  if (ageMs > NO_HEARTBEAT_MS) {
    warnings.push({
      key: 'no-heartbeat',
      label: 'No heartbeat',
      detail: `Last heartbeat ${Math.max(1, Math.round(ageMs / 60_000))} minutes ago — expected every 15 seconds`,
      severity: 'critical',
    })
  }
  if (node.batteryLevel <= LOW_BATTERY_PCT) {
    warnings.push({
      key: 'low-battery',
      label: 'Low battery',
      detail: `Battery at ${node.batteryLevel}%${node.solarCharging ? ' (solar input insufficient to recover)' : ' and no solar charging available'}`,
      severity: node.batteryLevel <= 15 ? 'critical' : 'warning',
    })
  }
  if (node.signalStrength < WEAK_SIGNAL_DBM && node.status !== 'offline') {
    warnings.push({
      key: 'weak-signal',
      label: 'Weak signal',
      detail: `RSSI ${node.signalStrength} dBm with ${telemetry.packetLossPct}% packet loss — LoRa link marginal`,
      severity: 'warning',
    })
  }
  if (telemetry.micHealth === 'faulty') {
    warnings.push({
      key: 'microphone-failure',
      label: 'Microphone failure',
      detail: 'Self-test failed — acoustic detection unavailable on this node',
      severity: 'critical',
    })
  } else if (telemetry.micHealth === 'degraded') {
    warnings.push({
      key: 'microphone-failure',
      label: 'Microphone degraded',
      detail: `SNR ${telemetry.micSnrDb} dB below nominal — calibration recommended`,
      severity: 'warning',
    })
  }
  if (telemetry.storageUsedPct >= STORAGE_FULL_PCT) {
    warnings.push({
      key: 'storage-full',
      label: 'Storage nearly full',
      detail: `${telemetry.storageUsedPct}% of evidence storage used — oldest clips will be overwritten`,
      severity: 'warning',
    })
  }
  if (node.firmwareVersion !== LATEST_FIRMWARE) {
    warnings.push({
      key: 'firmware-outdated',
      label: 'Firmware outdated',
      detail: `Running ${node.firmwareVersion} — latest stable is ${LATEST_FIRMWARE}`,
      severity: 'warning',
    })
  }
  return warnings
}
