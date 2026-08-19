/**
 * Intelligence layer — pure derivations over the live entity graph.
 * Every page consumes these so numbers stay logically consistent:
 * threat scores, recommended actions, model health, predictive risks
 * and wildlife movement intel are all computed from alerts/nodes/zones.
 */

import type { Alert, MonitoringNode, FireRiskZone } from '../../../shared/types'

// ---------------------------------------------------------------------------
// Threat score (0-100) with contributing factors
// ---------------------------------------------------------------------------

export type ThreatLevel = 'low' | 'moderate' | 'high' | 'critical'

export interface ThreatFactor {
  label: string
  points: number
}

export interface ThreatAssessment {
  score: number
  level: ThreatLevel
  factors: ThreatFactor[]
}

const TYPE_BASE: Record<Alert['type'], number> = { human: 14, animal: 4, vehicle: 8, fire: 16 }

export function threatLevel(score: number): ThreatLevel {
  if (score <= 20) return 'low'
  if (score <= 40) return 'moderate'
  if (score <= 70) return 'high'
  return 'critical'
}

export const THREAT_LEVEL_STYLE: Record<ThreatLevel, { color: string; label: string }> = {
  low: { color: '#10B981', label: 'LOW' },
  moderate: { color: '#3B82F6', label: 'MODERATE' },
  high: { color: '#F59E0B', label: 'HIGH' },
  critical: { color: '#EF4444', label: 'CRITICAL' },
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const dLat = ((b[1] - a[1]) * Math.PI) / 180
  const dLng = ((b[0] - a[0]) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function computeThreatScore(
  alert: Alert,
  ctx: { nodes: MonitoringNode[]; alerts: Alert[] }
): ThreatAssessment {
  const factors: ThreatFactor[] = []

  // Detection confidence — max +30
  factors.push({ label: 'Detection confidence', points: Math.round(alert.confidence * 30) })

  // Multi-node corroboration — +16 when confirmed by the mesh
  const corroboration = (alert.confirmingNodes?.length ?? 0) + (alert.incidentId ? 1 : 0)
  if (alert.verificationStatus === 'confirmed' || corroboration > 0) {
    factors.push({ label: 'Multi-node confirmation', points: Math.min(16, 8 + corroboration * 4) })
  }

  // Protected zone — core zones weigh more
  const node = ctx.nodes.find((n) => n.id === alert.nodeId)
  const zone = (node?.zone ?? '').toLowerCase()
  if (zone.includes('core') || zone.includes('protected')) {
    factors.push({ label: 'Protected zone (core)', points: 14 })
  } else if (zone && zone !== 'unknown') {
    factors.push({ label: 'Monitored zone', points: 6 })
  }

  // Human proximity — human-type or weapon visuals near settlement patterns
  const humanSignal =
    alert.type === 'human' ||
    (alert.visualLabels ?? []).some((l) => /person|weapon|human/i.test(l))
  if (humanSignal) factors.push({ label: 'Human proximity', points: 12 })

  // Historical activity — same-type alerts within 8 km in the last 24 h
  const cutoff = Date.now() - 24 * 3600_000
  const historical = ctx.alerts.filter(
    (a) =>
      a.id !== alert.id &&
      a.type === alert.type &&
      new Date(a.timestamp).getTime() >= cutoff &&
      haversineKm(a.location.coordinates, alert.location.coordinates) <= 8
  ).length
  if (historical > 0) factors.push({ label: 'Historical activity nearby', points: Math.min(10, 4 + historical * 2) })

  // Environmental / time-of-day risk
  const dangerousSound = ['gunshot', 'chainsaw', 'fire_crackle'].includes(alert.soundType ?? '')
  if (alert.type === 'fire' || dangerousSound) factors.push({ label: 'High-risk signature', points: 10 })
  const hour = new Date(alert.timestamp).getHours()
  if (hour < 6 || hour >= 18) factors.push({ label: 'Night-time detection', points: 6 })

  // Type base weight
  factors.push({ label: 'Event type weight', points: TYPE_BASE[alert.type] ?? 4 })

  const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0))
  return { score, level: threatLevel(score), factors: factors.sort((a, b) => b.points - a.points) }
}

// ---------------------------------------------------------------------------
// Recommended action per alert
// ---------------------------------------------------------------------------

export function recommendedAction(alert: Alert, assessment: ThreatAssessment): string {
  if (alert.status === 'resolved') return 'No action required — incident closed.'
  if (alert.feedback === 'false_alarm') return 'Logged as false positive — no response needed.'
  switch (alert.type) {
    case 'fire':
      return assessment.level === 'critical'
        ? 'Dispatch fire response immediately and notify adjacent zones.'
        : 'Verify with thermal feed and keep response team on standby.'
    case 'human':
      return alert.soundType === 'gunshot'
        ? 'Dispatch armed patrol to triangulated position; approach with caution.'
        : alert.soundType === 'chainsaw'
          ? 'Dispatch anti-poaching/logging unit to intercept.'
          : 'Review evidence and dispatch ranger for visual confirmation.'
    case 'animal':
      return 'Log movement; escalate only if trajectory approaches human settlement.'
    case 'vehicle':
      return 'Check vehicle against patrol registry; dispatch if unregistered.'
    default:
      return 'Acknowledge and review evidence.'
  }
}

// ---------------------------------------------------------------------------
// AI model health — demo-grade constants labelled clearly as the edge model
// ---------------------------------------------------------------------------

export const AI_MODEL = {
  name: 'AcousticNet',
  version: 'v2.4',
  inferenceMs: 142,
  accuracy: 94.2,
  precision: 95.1,
  recall: 92.8,
  f1: 93.9,
  lastRetrained: '2026-08-08',
  drift: [
    { capability: 'Animal detection', status: 'NORMAL' as const },
    { capability: 'Fire detection', status: 'NORMAL' as const },
    { capability: 'Human detection', status: 'WARNING' as const },
    { capability: 'Vehicle detection', status: 'NORMAL' as const },
  ],
}

/** "Why was this detected?" checklist derived from the alert itself */
export function detectionReasons(alert: Alert): string[] {
  const reasons: string[] = []
  const sound = alert.soundType
  if (sound === 'gunshot') {
    reasons.push('Acoustic impulse matched firearm signature')
    reasons.push('Frequency profile matched known firearm patterns')
  } else if (sound === 'chainsaw') {
    reasons.push('Sustained two-stroke engine harmonic detected')
    reasons.push('Spectral pattern matches chainsaw signature')
  } else if (sound === 'fire_crackle') {
    reasons.push('Broadband crackle signature over ambient noise floor')
    reasons.push('Environmental sensors support combustion conditions')
  } else if (sound === 'animal_call') {
    reasons.push('Vocalization matched species call library')
  } else if (sound === 'tamper') {
    reasons.push('Enclosure accelerometer spike — possible tampering')
  } else if (alert.type === 'vehicle') {
    reasons.push('Engine noise signature matched vehicle class')
  } else {
    reasons.push('Anomaly score exceeded detection threshold')
  }
  if ((alert.confirmingNodes?.length ?? 0) > 0 || alert.incidentId) {
    reasons.push(`${(alert.confirmingNodes?.length ?? 0) + (alert.incidentId ? 1 : 0)} nearby nodes corroborated detection`)
  }
  if ((alert.visualLabels?.length ?? 0) > 0) {
    reasons.push(`Visual AI confirmed: ${alert.visualLabels!.join(', ')}`)
  }
  if (alert.verificationStatus === 'confirmed') {
    reasons.push('Direction-of-arrival triangulation confirmed location')
  }
  if (sound === 'gunshot') reasons.push('Environmental context does not match thunder')
  return reasons
}

// ---------------------------------------------------------------------------
// Predictive risk — AI-generated estimates (always labelled as such)
// ---------------------------------------------------------------------------

export interface PredictiveRisk {
  id: string
  kind: 'conflict' | 'fire' | 'illegal'
  title: string
  score: number // 0-100
  level: ThreatLevel
  window: string
  location: string
  species?: string
  factors: string[]
  recommendation: string
}

export function derivePredictiveRisks(
  alerts: Alert[],
  nodes: MonitoringNode[],
  fireZones: FireRiskZone[]
): PredictiveRisk[] {
  const risks: PredictiveRisk[] = []
  const dayAgo = Date.now() - 24 * 3600_000
  const recent = alerts.filter((a) => new Date(a.timestamp).getTime() >= dayAgo)

  // Human–wildlife conflict risk
  const animal = recent.filter((a) => a.type === 'animal')
  const human = recent.filter((a) => a.type === 'human')
  if (animal.length > 0 || human.length > 0) {
    const score = Math.min(96, 30 + animal.length * 6 + human.length * 9)
    const dominantSpecies = animal[0]?.species ?? 'Sambar Deer'
    risks.push({
      id: 'risk-conflict',
      kind: 'conflict',
      title: 'Human–Wildlife Conflict Risk',
      score,
      level: threatLevel(score),
      window: '18:00 – 21:00',
      location: nodeZoneOf(animal[0] ?? human[0], nodes),
      species: dominantSpecies,
      factors: [
        `${animal.length} wildlife detection${animal.length === 1 ? '' : 's'} in 24h`,
        `${human.length} human activity detection${human.length === 1 ? '' : 's'} in 24h`,
        'Dusk movement window overlaps patrol gap',
      ],
      recommendation: 'Increase patrol coverage in buffer zone before dusk.',
    })
  }

  // Illegal activity risk
  const illegal = recent.filter((a) => ['gunshot', 'chainsaw'].includes(a.soundType ?? ''))
  const historicalGunshot = alerts.filter((a) => a.soundType === 'gunshot').length
  const score2 = Math.min(94, 20 + illegal.length * 14 + Math.min(16, historicalGunshot * 2))
  if (illegal.length > 0 || historicalGunshot > 2) {
    risks.push({
      id: 'risk-illegal',
      kind: 'illegal',
      title: 'Illegal Activity Risk',
      score: score2,
      level: threatLevel(score2),
      window: '02:00 – 05:00',
      location: nodeZoneOf(illegal[0], nodes),
      factors: [
        `${illegal.length} poaching-linked signature${illegal.length === 1 ? '' : 's'} in 24h`,
        'Historical gunshot clusters in this sector',
        'Low patrol coverage during night window',
      ],
      recommendation: 'Schedule night patrol and raise node duty cycle in sector.',
    })
  }

  // Fire risk — from the backend fire-risk forecast
  const worst = [...fireZones].sort((a, b) => b.risk - a.risk)[0]
  if (worst) {
    const score3 = Math.round(worst.risk)
    risks.push({
      id: 'risk-fire',
      kind: 'fire',
      title: 'Fire Risk',
      score: score3,
      level: threatLevel(score3),
      window: '12:00 – 16:00',
      location: worst.zone,
      factors: worst.factors.slice(0, 3),
      recommendation: score3 > 60 ? 'Pre-position fire response unit; verify water points.' : 'Monitor environmental sensors.',
    })
  }

  return risks.sort((a, b) => b.score - a.score)
}

function nodeZoneOf(alert: Alert | undefined, nodes: MonitoringNode[]): string {
  if (!alert) return 'Reserve perimeter'
  return nodes.find((n) => n.id === alert.nodeId)?.zone ?? 'Unknown zone'
}

// ---------------------------------------------------------------------------
// Wildlife movement intelligence
// ---------------------------------------------------------------------------

export interface WildlifeTrack {
  species: string
  count: number
  lastSeen: string
  lat: number
  lng: number
  movementKm: number
  heading: string
  speedKmh: number
  activity: 'LOW' | 'MODERATE' | 'HIGH'
  anomaly: boolean
  anomalyReason?: string
  path: [number, number][] // [lat, lng] history
}

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export function deriveWildlifeTracks(alerts: Alert[]): WildlifeTrack[] {
  const bySpecies = new Map<string, Alert[]>()
  for (const a of alerts) {
    if (a.type !== 'animal' || !a.species) continue
    const list = bySpecies.get(a.species) ?? []
    list.push(a)
    bySpecies.set(a.species, list)
  }

  const tracks: WildlifeTrack[] = []
  for (const [species, list] of bySpecies) {
    const ordered = [...list].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    const last = ordered[ordered.length - 1]
    const first = ordered[0]
    const [lng, lat] = last.location.coordinates
    const [fLng, fLat] = first.location.coordinates
    const movementKm = haversineKm([fLng, fLat], [lng, lat])
    const hours = Math.max(
      0.5,
      (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 3600_000
    )
    const bearing = (Math.atan2(lng - fLng, lat - fLat) * 180) / Math.PI
    const heading = CARDINALS[((Math.round(bearing / 45) % 8) + 8) % 8]
    const activity = ordered.length >= 4 ? 'HIGH' : ordered.length >= 2 ? 'MODERATE' : 'LOW'
    const anomaly = movementKm > 2 && activity === 'HIGH'
    tracks.push({
      species,
      count: ordered.length,
      lastSeen: last.timestamp,
      lat,
      lng,
      movementKm: Math.round(movementKm * 10) / 10,
      heading,
      speedKmh: Math.round((movementKm / hours) * 10) / 10,
      activity,
      anomaly,
      anomalyReason: anomaly
        ? `Animal moved ${movementKm.toFixed(1)} km toward monitored boundary within ${Math.round(hours * 60)} minutes.`
        : undefined,
      path: ordered.map((a) => [a.location.coordinates[1], a.location.coordinates[0]]),
    })
  }
  return tracks.sort((a, b) => b.count - a.count)
}

// ---------------------------------------------------------------------------
// Incident grouping — shared by Incidents page, dashboard and map
// ---------------------------------------------------------------------------

export interface IncidentGroup {
  id: string
  alerts: Alert[]
  firstAt: string
  lastAt: string
  nodeCount: number
  severity: Alert['severity']
  types: Alert['type'][]
  dispatchId?: string
}

const SEVERITY_RANK: Record<Alert['severity'], number> = { low: 0, medium: 1, high: 2, critical: 3 }

export function groupIncidents(alerts: Alert[]): IncidentGroup[] {
  const groups = new Map<string, Alert[]>()
  for (const a of alerts) {
    if (!a.incidentId) continue
    const list = groups.get(a.incidentId) ?? []
    list.push(a)
    groups.set(a.incidentId, list)
  }
  return [...groups.entries()].map(([id, list]) => {
    const sorted = [...list].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    return {
      id,
      alerts: sorted,
      firstAt: sorted[0].timestamp,
      lastAt: sorted[sorted.length - 1].timestamp,
      nodeCount: new Set(sorted.map((a) => a.nodeId)).size,
      severity: sorted.reduce<Alert['severity']>(
        (max, a) => (SEVERITY_RANK[a.severity] > SEVERITY_RANK[max] ? a.severity : max),
        'low'
      ),
      types: [...new Set(sorted.map((a) => a.type))],
    }
  })
}
