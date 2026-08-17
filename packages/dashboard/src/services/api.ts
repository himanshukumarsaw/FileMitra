/**
 * API client — talks to the JungleSathi backend through the Vite proxy (/api).
 * Includes normalizers that map Mongoose documents to the shared types.
 */

import type { Alert, MonitoringNode, AnalyticsSummary, Dispatch, FireRiskZone } from '../../../../shared/types'

const API_BASE = '/api'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new ApiError(`API ${res.status}`, res.status)
  return (await res.json()) as T
}

// ---------------------------------------------------------------------------
// Normalizers — backend (Mongoose) shape -> shared types
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeAlert(raw: any): Alert {
  const nodeId =
    typeof raw.nodeId === 'object' && raw.nodeId !== null
      ? String(raw.nodeId._id ?? raw.nodeId.id ?? '')
      : String(raw.nodeId ?? '')

  return {
    id: String(raw._id ?? raw.id),
    type: raw.type,
    severity: raw.severity,
    confidence: raw.confidence,
    location: { type: 'Point', coordinates: raw.location?.coordinates ?? [0, 0] },
    imageUrl: raw.imageUrl,
    audioUrl: raw.audioUrl,
    explanation: raw.explanation ?? { summary: raw.description ?? '', factors: [], confidenceBreakdown: { visual: 0, audio: 0, motion: 0, contextual: 0 } },
    nodeId,
    timestamp: raw.timestamp,
    status: raw.status,
    species: raw.species,
    description: raw.description,
    soundType: raw.soundType,
    incidentId: raw.incidentId,
    verificationStatus: raw.verificationStatus,
    confirmingNodes: raw.confirmingNodes ?? [],
    visualLabels: raw.visualLabels ?? [],
    feedback: raw.feedback,
    acknowledgedAt: raw.acknowledgedAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeNode(raw: any): MonitoringNode {
  return {
    id: String(raw._id ?? raw.id),
    name: raw.name,
    location: { type: 'Point', coordinates: raw.location?.coordinates ?? [0, 0] },
    batteryLevel: raw.batteryLevel ?? 100,
    solarCharging: raw.solarCharging ?? false,
    status: raw.status,
    lastSeen: raw.lastSeen,
    signalStrength: raw.signalStrength ?? -70,
    firmwareVersion: raw.firmwareVersion ?? '1.0.0',
    zone: raw.zone ?? 'Unknown',
    hardwareModel: raw.hardwareModel ?? 'ESP32-CAM',
    powerMode: raw.powerMode,
    solarInputW: raw.solarInputW,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeDispatch(raw: any): Dispatch {
  return {
    id: String(raw._id ?? raw.id),
    alertId: String(raw.alertId),
    incidentId: raw.incidentId,
    alertType: raw.alertType,
    severity: raw.severity,
    soundType: raw.soundType,
    team: raw.team,
    rangerPhone: raw.rangerPhone ?? '',
    zone: raw.zone ?? 'Unknown',
    status: raw.status,
    etaMinutes: raw.etaMinutes ?? 0,
    coordinates: raw.coordinates ?? [0, 0],
    timeline: (raw.timeline ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => ({ at: t.at, label: t.label })
    ),
    createdAt: raw.createdAt,
  }
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function fetchAlerts(limit = 200): Promise<Alert[]> {
  const data = await apiFetch<{ alerts: unknown[] }>(`/alerts?limit=${limit}`)
  return data.alerts.map(normalizeAlert)
}

export async function fetchNodes(): Promise<MonitoringNode[]> {
  const data = await apiFetch<unknown[]>('/nodes')
  return data.map(normalizeNode)
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>('/analytics/summary')
  return {
    totalAlerts: raw.totalAlerts,
    alertsToday: raw.alertsToday,
    activeNodes: raw.activeNodes,
    totalNodes: raw.totalNodes,
    speciesDetected: raw.speciesCount,
    systemUptime: raw.uptimePercentage,
    alertsBySeverity: raw.severityBreakdown ?? {},
    alertsByType: raw.typeBreakdown ?? {},
  }
}

export async function fetchDispatches(): Promise<Dispatch[]> {
  const data = await apiFetch<{ dispatches: unknown[] }>('/dispatches')
  return data.dispatches.map(normalizeDispatch)
}

export async function fetchFireRisk(): Promise<{ zones: FireRiskZone[]; generatedAt: string }> {
  return apiFetch('/analytics/fire-risk')
}

export interface ResponseStats {
  totalFeedback: number
  falseAlarms: number
  genuine: number
  falseAlarmRate: number
  avgResponseSeconds: number | null
  acknowledgedCount: number
}

export async function fetchResponseStats(): Promise<ResponseStats> {
  return apiFetch('/alerts/response-stats')
}

/** Officer acknowledges an alert (starts the response clock). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function acknowledgeAlert(id: string): Promise<Alert> {
  const raw = await apiFetch<any>(`/alerts/${id}/acknowledge`, { method: 'POST', body: '{}' })
  return normalizeAlert(raw)
}

/** Human-in-the-loop: officer labels the alert genuine or a false alarm. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function alertFeedback(id: string, feedback: 'genuine' | 'false_alarm'): Promise<Alert> {
  const raw = await apiFetch<any>(`/alerts/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  })
  return normalizeAlert(raw)
}

/** Escalate to critical + confirmed and auto-request a team dispatch. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function escalateAlert(id: string): Promise<{ alert: Alert; created: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>(`/alerts/${id}/escalate`, { method: 'POST', body: '{}' })
  return { alert: normalizeAlert(raw.alert), created: raw.created }
}

/** Officer-initiated dispatch for an alert (deduplicated server-side). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createDispatch(alertId: string): Promise<{ dispatch: Dispatch; created: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>('/dispatches', {
    method: 'POST',
    body: JSON.stringify({ alertId }),
  })
  return { dispatch: normalizeDispatch(raw.dispatch), created: raw.created }
}

/** Officer-initiated resolution of an active response. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveDispatch(id: string): Promise<{ dispatch: Dispatch; alreadyResolved: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>(`/dispatches/${id}/resolve`, { method: 'POST', body: '{}' })
  return { dispatch: normalizeDispatch(raw.dispatch), alreadyResolved: raw.alreadyResolved }
}

/** Create (or return) the incident grouping for an alert. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createIncident(alertId: string): Promise<{ alert: Alert; incidentId: string; created: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>(`/alerts/${alertId}/incident`, { method: 'POST', body: '{}' })
  return { alert: normalizeAlert(raw.alert), incidentId: raw.incidentId, created: raw.created }
}

/** Quick liveness probe used for the connection indicator */
export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`)
    return res.ok
  } catch {
    return false
  }
}
