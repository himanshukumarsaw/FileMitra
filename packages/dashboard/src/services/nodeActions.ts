/**
 * Node command service (spec #15, #27) — device management commands for the
 * node detail drawer. No backend device-command API exists yet, so this is a
 * clean mock service layer: realistic latencies, consistent node ids and
 * timestamps, ready to be swapped for real endpoints without UI changes.
 */

import type { MonitoringNode } from '../../../shared/types'
import { LATEST_FIRMWARE } from './nodeTelemetry'

export type NodeCommand = 'restart' | 'calibrate' | 'firmware'

export interface CommandResult {
  ok: boolean
  message: string
  /** Simulated firmware version applied by an update command */
  firmwareVersion?: string
}

export interface NodeLogLine {
  at: string // ISO
  level: 'info' | 'warn' | 'error'
  text: string
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Restart a node: command queued over LoRa downlink, node reboots and
 * re-joins the mesh. The node keeps its id and coordinates.
 */
export async function restartNode(node: MonitoringNode): Promise<CommandResult> {
  await delay(1400)
  // Offline nodes cannot receive a downlink command
  if (node.status === 'offline') {
    return {
      ok: false,
      message: 'Restart failed — node is offline and cannot receive the downlink command',
    }
  }
  return {
    ok: true,
    message: `Restart command queued — "${node.name}" will reboot and re-join the mesh within ~2 min`,
  }
}

/** Calibrate the MEMS microphone array against the ambient noise floor. */
export async function calibrateMicrophone(node: MonitoringNode): Promise<CommandResult> {
  await delay(1800)
  if (node.status === 'offline') {
    return {
      ok: false,
      message: 'Calibration failed — node is offline and unreachable',
    }
  }
  return {
    ok: true,
    message: `Microphone calibrated — noise floor re-baselined for "${node.name}"`,
  }
}

/** Push the latest stable firmware over LoRa multicast + retry window. */
export async function updateFirmware(node: MonitoringNode): Promise<CommandResult> {
  await delay(2400)
  if (node.status === 'offline') {
    return {
      ok: false,
      message: 'Update failed — node is offline; the OTA window will retry when it reconnects',
    }
  }
  if (node.firmwareVersion === LATEST_FIRMWARE) {
    return {
      ok: true,
      message: `"${node.name}" already runs the latest firmware (${LATEST_FIRMWARE})`,
      firmwareVersion: LATEST_FIRMWARE,
    }
  }
  return {
    ok: true,
    message: `Firmware ${LATEST_FIRMWARE} staged — "${node.name}" will install on next charge window and reboot`,
    firmwareVersion: LATEST_FIRMWARE,
  }
}

/**
 * Recent device log — deterministic mix of boot, telemetry and LoRa lines.
 * Shown in the drawer's [VIEW LOGS] panel.
 */
export async function fetchNodeLogs(node: MonitoringNode, limit = 24): Promise<NodeLogLine[]> {
  await delay(500)
  const now = Date.now()
  const lines: NodeLogLine[] = [
    { at: new Date(now - 40_000).toISOString(), level: 'info', text: 'LoRa TX heartbeat (SF9/125kHz) — gateway ACK' },
    { at: new Date(now - 55_000).toISOString(), level: 'info', text: `RSSI ${node.signalStrength} dBm · SNR +7.5 dB` },
    { at: new Date(now - 90_000).toISOString(), level: 'info', text: 'Acoustic window processed on-edge — no trigger' },
    { at: new Date(now - 150_000).toISOString(), level: node.batteryLevel <= 30 ? 'warn' : 'info', text: `Battery ${node.batteryLevel}% · solar ${node.solarCharging ? `${(node.solarInputW ?? 1.4).toFixed(1)} W input` : 'inactive'}` },
    { at: new Date(now - 210_000).toISOString(), level: 'info', text: 'Microphone self-test OK — noise floor 34 dB' },
    { at: new Date(now - 260_000).toISOString(), level: 'info', text: 'Duty cycle nominal — listening 400 ms / 15 s' },
    { at: new Date(now - 320_000).toISOString(), level: 'info', text: 'LoRa TX sensor packet (seq confirmed)' },
    { at: new Date(now - 400_000).toISOString(), level: node.status === 'offline' ? 'error' : 'info', text: node.status === 'offline' ? 'Gateway unreachable — buffering packets locally' : 'RTC synchronized from gateway beacon' },
    { at: new Date(now - 520_000).toISOString(), level: 'info', text: `Firmware ${node.firmwareVersion} running · watchdog OK` },
    { at: new Date(now - 700_000).toISOString(), level: 'info', text: 'Boot complete — joined mesh, session keys renewed' },
  ]
  if (node.status === 'offline') {
    lines.unshift({ at: new Date(now - 10_000).toISOString(), level: 'error', text: 'TX timeout ×3 — entering offline buffer mode' })
  }
  return lines.slice(0, limit)
}
