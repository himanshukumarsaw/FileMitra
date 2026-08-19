/**
 * Map command center (spec #6, #10) — GIS-style layers, filters, a 24-hour
 * replay slider with LIVE indicator and multi-node triangulation overlays.
 */

import { useState, useCallback, useMemo, useEffect, useRef, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Circle, CircleMarker, Polygon, Polyline, Popup, useMap } from 'react-leaflet'
import {
  Layers, Filter, Radio, AlertTriangle, MapPin, Activity, ChevronRight,
  Crosshair, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/format'
import { MapView } from '@/components/map/MapView'
import { NodeMarker } from '@/components/map/NodeMarker'
import { HeatmapLayer } from '@/components/map/HeatmapLayer'
import { generateMockHeatmapData } from '@/services/mockData'
import { useAlerts, useNodes, useDispatches, useFireRisk } from '@/hooks/useLiveData'
import { useSocketEvent } from '@/hooks/useSocket'
import type { Alert, AlertSeverity, AlertType, MonitoringNode, NodeStatus } from '../../../shared/types'

const CENTER: [number, number] = [21.55, 79.65]
const ZOOM = 11
const DETECTION_RADIUS_M = 3000
const SLIDER_STEPS = 96 // 24h in 15-minute increments

// ---------------------------------------------------------------------------
// Layer + filter definitions
// ---------------------------------------------------------------------------

const LAYER_DEFS = [
  { key: 'nodes', label: 'Nodes', color: '#10B981' },
  { key: 'alerts', label: 'Alerts', color: '#EF4444' },
  { key: 'incidents', label: 'Incidents', color: '#38BDF8' },
  { key: 'heatmap', label: 'Heatmap', color: '#F59E0B' },
  { key: 'fireRisk', label: 'Fire Risk', color: '#FB923C' },
  { key: 'humanActivity', label: 'Human Activity', color: '#F43F5E' },
  { key: 'wildlife', label: 'Wildlife Activity', color: '#84CC16' },
  { key: 'teams', label: 'Response Teams', color: '#A78BFA' },
  { key: 'zones', label: 'Protected Zones', color: '#2DD4BF' },
  { key: 'detectionRadius', label: 'Detection Radius', color: '#64748B' },
  { key: 'triangulation', label: 'Triangulation', color: '#38BDF8' },
] as const

type LayerKey = (typeof LAYER_DEFS)[number]['key']

const DEFAULT_LAYERS: Record<LayerKey, boolean> = {
  nodes: true,
  alerts: true,
  incidents: true,
  heatmap: true,
  fireRisk: false,
  humanActivity: false,
  wildlife: false,
  teams: true,
  zones: false,
  detectionRadius: false,
  triangulation: true,
}

type TimeWindow = '1h' | '6h' | '24h' | 'all'
const WINDOW_MS: Record<TimeWindow, number> = {
  '1h': 3600_000,
  '6h': 6 * 3600_000,
  '24h': 24 * 3600_000,
  all: Infinity,
}

const FIRE_RISK_COLORS: Record<string, string> = {
  low: '#10B981',
  moderate: '#F59E0B',
  high: '#F97316',
  extreme: '#EF4444',
}

/** Cosmetic ripple shown on the map when a LoRa packet reaches the gateway */
interface PacketRipple {
  key: number
  lat: number
  lng: number
  color: string
}

const PACKET_COLORS: Record<string, string> = {
  alert: '#EF4444',
  heartbeat: '#10B981',
  sensor: '#3B82F6',
}

/** Incident epicenter with the nodes that corroborated it */
interface IncidentCluster {
  incidentId: string
  lat: number
  lng: number
  nodeIds: string[]
  label: string
  timestamp: string
}

function FlyToNode({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  map.flyTo([lat, lng], 14, { duration: 0.8 })
  return null
}

const statusColorMap: Record<string, string> = {
  online: '#10B981',
  warning: '#F59E0B',
  offline: '#EF4444',
}

/** Deterministic hexagon around a zone centroid — the protected zone outline */
function hexagon(lat: number, lng: number, radiusKm: number): [number, number][] {
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6
    return [lat + dLat * Math.sin(a), lng + dLng * Math.cos(a)] as [number, number]
  })
}

// ---------------------------------------------------------------------------
// Map page
// ---------------------------------------------------------------------------

export function MapPage() {
  const { nodes } = useNodes()
  const { alerts } = useAlerts()
  const { dispatches } = useDispatches()
  const { zones: fireZones } = useFireRisk()

  const [layers, setLayers] = useState<Record<LayerKey, boolean>>(DEFAULT_LAYERS)
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<AlertType | 'all'>('all')
  const [nodeStatusFilter, setNodeStatusFilter] = useState<NodeStatus | 'all'>('all')
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('all')
  const [slider, setSlider] = useState(SLIDER_STEPS) // 96 == now (LIVE)
  const [ripples, setRipples] = useState<PacketRipple[]>([])
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; key: number } | null>(null)

  // "Locate on Map" deep link: /map?focus=<nodeId> flies to that node once
  const [searchParams] = useSearchParams()
  const consumedFocus = useRef<string | null>(null)
  useEffect(() => {
    const focusId = searchParams.get('focus')
    if (!focusId || consumedFocus.current === focusId || nodes.length === 0) return
    const target = nodes.find((n) => n.id === focusId)
    if (target) {
      consumedFocus.current = focusId
      const [lng, lat] = target.location.coordinates
      setFlyTarget({ lat, lng, key: Date.now() })
    }
  }, [searchParams, nodes])

  const isLive = slider === SLIDER_STEPS
  const hoursBack = (SLIDER_STEPS - slider) / 4 // hours behind "now"

  // -- Time-window edges ------------------------------------------------------
  const cutoff = useMemo(() => Date.now() - hoursBack * 3600_000, [hoursBack])
  const floor = timeWindow === 'all' ? -Infinity : cutoff - WINDOW_MS[timeWindow]

  // -- Alert visibility: filters + time slider --------------------------------
  const visibleAlerts = useMemo(
    () =>
      alerts.filter((a) => {
        const t = new Date(a.timestamp).getTime()
        if (t > cutoff || t < floor) return false
        if (severityFilter !== 'all' && a.severity !== severityFilter) return false
        if (typeFilter !== 'all' && a.type !== typeFilter) return false
        return true
      }),
    [alerts, cutoff, floor, severityFilter, typeFilter]
  )

  const visibleNodes = useMemo(
    () => nodes.filter((n) => nodeStatusFilter === 'all' || n.status === nodeStatusFilter),
    [nodes, nodeStatusFilter]
  )

  const heatmapPoints = useMemo(() => generateMockHeatmapData(visibleAlerts), [visibleAlerts])

  const recentAlerts = useMemo(
    () =>
      [...visibleAlerts]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8),
    [visibleAlerts]
  )

  // -- Incident epicenters: group corroborated alerts -------------------------
  const incidents = useMemo<IncidentCluster[]>(() => {
    const groups = new Map<string, Alert[]>()
    for (const alert of visibleAlerts) {
      if (!alert.incidentId) continue
      const list = groups.get(alert.incidentId) ?? []
      list.push(alert)
      groups.set(alert.incidentId, list)
    }
    return [...groups.entries()]
      .filter(([, list]) => list.length >= 2)
      .map(([incidentId, list]) => ({
        incidentId,
        lat: list.reduce((s, a) => s + a.location.coordinates[1], 0) / list.length,
        lng: list.reduce((s, a) => s + a.location.coordinates[0], 0) / list.length,
        nodeIds: [
          ...new Set([
            ...list.flatMap((a) => a.confirmingNodes ?? []),
            ...list.map((a) => a.nodeId),
          ]),
        ],
        label: list[0].soundType ?? list[0].type,
        timestamp: list.reduce((max, a) => (a.timestamp > max ? a.timestamp : max), list[0].timestamp),
      }))
  }, [visibleAlerts])

  // -- Protected zone outlines derived from node placement --------------------
  const zonePolygons = useMemo(() => {
    const byZone = new Map<string, MonitoringNode[]>()
    for (const n of nodes) {
      const list = byZone.get(n.zone) ?? []
      list.push(n)
      byZone.set(n.zone, list)
    }
    return [...byZone.entries()].map(([zone, members]) => {
      const lat = members.reduce((s, m) => s + m.location.coordinates[1], 0) / members.length
      const lng = members.reduce((s, m) => s + m.location.coordinates[0], 0) / members.length
      const spread = Math.max(
        1.2,
        ...members.map((m) => {
          const dy = (m.location.coordinates[1] - lat) * 111
          const dx = (m.location.coordinates[0] - lng) * 111 * Math.cos((lat * Math.PI) / 180)
          return Math.sqrt(dx * dx + dy * dy)
        })
      )
      return { zone, lat, lng, polygon: hexagon(lat, lng, spread + 1.2), count: members.length }
    })
  }, [nodes])

  // -- Fire risk overlays anchored at zone centroids ---------------------------
  const zoneCentroid = useCallback(
    (zone: string) => zonePolygons.find((z) => z.zone === zone) ?? null,
    [zonePolygons]
  )

  const activeTeams = useMemo(
    () => dispatches.filter((d) => d.status !== 'resolved'),
    [dispatches]
  )

  // -- LoRa packet ripples: animate radio traffic arriving at the gateway -----
  const nodesRef = useRef(nodes)
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  const onPacket = useCallback((payload: { nodeId: string; kind: string }) => {
    const node = nodesRef.current.find((n) => n.id === payload.nodeId)
    if (!node) return
    const [lng, lat] = node.location.coordinates
    const color = PACKET_COLORS[payload.kind] ?? '#94A3B8'
    setRipples((prev) => [...prev.slice(-14), { key: Date.now() + Math.random(), lat, lng, color }])
  }, [])
  useSocketEvent('node:packet', onPacket)

  useEffect(() => {
    if (ripples.length === 0) return
    const timer = setTimeout(() => setRipples((prev) => prev.slice(1)), 1600)
    return () => clearTimeout(timer)
  }, [ripples])

  const flyTo = useCallback((lat: number, lng: number) => {
    setFlyTarget({ lat, lng, key: Date.now() })
  }, [])

  const onlineCount = visibleNodes.filter((n) => n.status === 'online').length
  const warningCount = visibleNodes.filter((n) => n.status === 'warning').length
  const offlineCount = visibleNodes.filter((n) => n.status === 'offline').length

  const sliderLabel = isLive
    ? 'LIVE'
    : new Date(cutoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Ripple fade animation for LoRa packet circles */}
      <style>{`
        .lora-ripple { animation: lora-ripple-fade 1.6s ease-out forwards; }
        @keyframes lora-ripple-fade {
          from { fill-opacity: 0.4; opacity: 0.9; }
          to { fill-opacity: 0; opacity: 0; }
        }
        .live-dot { animation: live-dot-pulse 1.6s ease-in-out infinite; }
        @keyframes live-dot-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>

      {/* Sidebar Panel — hidden below xl */}
      <div className="hidden xl:flex w-[300px] shrink-0 flex-col border-r border-slate-700/50 bg-slate-dark">
        {/* Nodes list */}
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-slate-700/50 bg-slate-dark px-4 py-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-muted">
              <Radio className="h-3.5 w-3.5" />
              Nodes ({visibleNodes.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-700/30">
            {visibleNodes.map((node) => {
              const [lng, lat] = node.location.coordinates
              return (
                <button
                  key={node.id}
                  onClick={() => flyTo(lat, lng)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-surface/60"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: statusColorMap[node.status] }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-text">{node.name}</div>
                    <div className="text-xs text-slate-muted">{node.zone}</div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-muted" />
                </button>
              )
            })}
            {visibleNodes.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-slate-muted">
                No nodes match the status filter.
              </div>
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="max-h-[260px] overflow-y-auto border-t border-slate-700/50">
          <div className="sticky top-0 z-10 border-b border-slate-700/50 bg-slate-dark px-4 py-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-muted">
              <AlertTriangle className="h-3.5 w-3.5" />
              Recent Alerts
            </h3>
          </div>
          <div className="divide-y divide-slate-700/30">
            {recentAlerts.map((alert) => {
              const [lng, lat] = alert.location.coordinates
              return (
                <button
                  key={alert.id}
                  onClick={() => flyTo(lat, lng)}
                  className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-slate-surface/60"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        alert.severity === 'critical'
                          ? 'bg-danger'
                          : alert.severity === 'high'
                            ? 'bg-amber'
                            : 'bg-slate-muted'
                      )}
                    />
                    <span className="truncate text-xs font-medium text-slate-text">
                      {alert.type === 'animal' ? (alert.species ?? 'Animal') : alert.type}
                    </span>
                    <span className="ml-auto text-[10px] text-slate-muted">
                      {relativeTime(alert.timestamp)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-muted">{alert.description}</p>
                </button>
              )
            })}
            {recentAlerts.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-slate-muted">
                No alerts in the selected time range.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="relative flex-1">
        <MapView center={CENTER} zoom={ZOOM}>
          {flyTarget && <FlyToNode key={flyTarget.key} lat={flyTarget.lat} lng={flyTarget.lng} />}

          {/* Protected zones */}
          {layers.zones &&
            zonePolygons.map((z) => (
              <Polygon
                key={z.zone}
                positions={z.polygon}
                pathOptions={{
                  color: '#2DD4BF',
                  fillColor: '#2DD4BF',
                  fillOpacity: 0.05,
                  weight: 1.5,
                  dashArray: '4 6',
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'system-ui', fontSize: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{z.zone}</div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>
                      Protected zone · {z.count} monitoring node{z.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </Popup>
              </Polygon>
            ))}

          {/* Detection radius per active node */}
          {layers.detectionRadius &&
            visibleNodes
              .filter((n) => n.status !== 'offline')
              .map((n) => {
                const [lng, lat] = n.location.coordinates
                return (
                  <Circle
                    key={`radius-${n.id}`}
                    center={[lat, lng]}
                    radius={DETECTION_RADIUS_M}
                    pathOptions={{
                      color: '#64748B',
                      fillColor: '#64748B',
                      fillOpacity: 0.03,
                      weight: 1,
                      dashArray: '2 6',
                    }}
                  />
                )
              })}

          {/* Fire risk zones */}
          {layers.fireRisk &&
            fireZones.map((fz) => {
              const centroid = zoneCentroid(fz.zone)
              if (!centroid) return null
              const color = FIRE_RISK_COLORS[fz.level] ?? '#F59E0B'
              return (
                <Circle
                  key={`fire-${fz.zone}`}
                  center={[centroid.lat, centroid.lng]}
                  radius={2600}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 1.5 }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'system-ui', fontSize: 12, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        Fire Risk — {fz.zone}
                      </div>
                      <div style={{ color: color, fontWeight: 600, fontSize: 12 }}>
                        {fz.risk}/100 · {fz.level.toUpperCase()}
                      </div>
                      <ul style={{ color: '#64748b', fontSize: 11, margin: '6px 0 0', paddingLeft: 14 }}>
                        {fz.factors.slice(0, 3).map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  </Popup>
                </Circle>
              )
            })}

          {/* Triangulation overlays — corroborating nodes + lines to epicenter */}
          {layers.triangulation &&
            incidents.map((incident) => {
              const corroborating = incident.nodeIds
                .map((id) => nodes.find((n) => n.id === id))
                .filter((n): n is MonitoringNode => Boolean(n))
              return (
                <Fragment key={`tri-${incident.incidentId}`}>
                  {corroborating.map((n) => {
                    const [lng, lat] = n.location.coordinates
                    return (
                      <Fragment key={`tri-${incident.incidentId}-${n.id}`}>
                        <Circle
                          center={[lat, lng]}
                          radius={2500}
                          pathOptions={{
                            color: '#38BDF8',
                            fillColor: '#38BDF8',
                            fillOpacity: 0.05,
                            weight: 1,
                            dashArray: '6 6',
                          }}
                        />
                        <Polyline
                          positions={[
                            [lat, lng],
                            [incident.lat, incident.lng],
                          ]}
                          pathOptions={{ color: '#38BDF8', weight: 1, opacity: 0.5, dashArray: '4 8' }}
                        />
                      </Fragment>
                    )
                  })}
                </Fragment>
              )
            })}

          {layers.nodes && visibleNodes.map((node) => <NodeMarker key={node.id} node={node} />)}

          {layers.heatmap && <HeatmapLayer points={heatmapPoints} />}

          {/* Alert markers */}
          {layers.alerts &&
            visibleAlerts.map((alert) => {
              const [lng, lat] = alert.location.coordinates
              const color =
                alert.severity === 'critical' ? '#EF4444' : alert.severity === 'high' ? '#F97316' : '#F59E0B'
              return (
                <CircleMarker
                  key={alert.id}
                  center={[lat, lng]}
                  radius={4}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 1 }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'system-ui', fontSize: 12, minWidth: 150 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4, textTransform: 'capitalize' }}>
                        {alert.type} Alert
                      </div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>{alert.description}</div>
                      <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 4 }}>
                        {relativeTime(alert.timestamp)}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}

          {/* Human activity markers */}
          {layers.humanActivity &&
            visibleAlerts
              .filter((a) => a.type === 'human' || a.type === 'vehicle')
              .map((a) => {
                const [lng, lat] = a.location.coordinates
                return (
                  <CircleMarker
                    key={`human-${a.id}`}
                    center={[lat, lng]}
                    radius={6}
                    pathOptions={{ color: '#F43F5E', fillColor: '#F43F5E', fillOpacity: 0.45, weight: 2 }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'system-ui', fontSize: 12 }}>
                        <strong>Human activity</strong>
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                          {a.soundType ?? a.type} · {relativeTime(a.timestamp)}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}

          {/* Wildlife activity markers */}
          {layers.wildlife &&
            visibleAlerts
              .filter((a) => a.type === 'animal')
              .map((a) => {
                const [lng, lat] = a.location.coordinates
                return (
                  <CircleMarker
                    key={`wild-${a.id}`}
                    center={[lat, lng]}
                    radius={6}
                    pathOptions={{ color: '#84CC16', fillColor: '#84CC16', fillOpacity: 0.45, weight: 2 }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'system-ui', fontSize: 12 }}>
                        <strong>{a.species ?? 'Wildlife'}</strong>
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                          {relativeTime(a.timestamp)}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}

          {/* Response team markers */}
          {layers.teams &&
            activeTeams.map((d) => {
              const [lng, lat] = d.coordinates
              return (
                <CircleMarker
                  key={`team-${d.id}`}
                  center={[lat, lng]}
                  radius={8}
                  pathOptions={{ color: '#A78BFA', fillColor: '#A78BFA', fillOpacity: 0.7, weight: 2 }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'system-ui', fontSize: 12, minWidth: 150 }}>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.team}</div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>
                        Status: <span style={{ textTransform: 'capitalize' }}>{d.status}</span>
                        {d.status !== 'onscene' && d.etaMinutes > 0 && ` · ETA ${d.etaMinutes} min`}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}

          {/* Incident epicenters — triangulated from multiple nodes */}
          {layers.incidents &&
            incidents.map((incident) => {
              const corroborating = incident.nodeIds
                .map((id) => nodes.find((n) => n.id === id))
                .filter((n): n is MonitoringNode => Boolean(n))
              const accuracy = Math.max(60, Math.round(255 / Math.max(1, corroborating.length) / 5) * 5)
              return (
                <Fragment key={incident.incidentId}>
                  <Circle
                    center={[incident.lat, incident.lng]}
                    radius={1500}
                    pathOptions={{
                      color: '#38BDF8',
                      fillColor: '#38BDF8',
                      fillOpacity: 0.08,
                      weight: 1.5,
                      dashArray: '6 6',
                    }}
                  />
                  <CircleMarker
                    center={[incident.lat, incident.lng]}
                    radius={9}
                    pathOptions={{ color: '#38BDF8', fillColor: '#38BDF8', fillOpacity: 0.85, weight: 2 }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'system-ui', fontSize: 12, minWidth: 190 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                          ⨂ Incident {incident.incidentId}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>
                          {corroborating.length} nodes heard a{' '}
                          <strong style={{ textTransform: 'capitalize' }}>{incident.label}</strong> —
                          epicenter triangulated from the mesh.
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 6 }}>
                          Estimated location: {incident.lat.toFixed(4)}° N, {incident.lng.toFixed(4)}° E
                          <br />
                          Estimated accuracy: ±{accuracy} m
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                </Fragment>
              )
            })}

          {/* Live LoRa packet ripples */}
          {isLive &&
            ripples.map((ripple) => (
              <Circle
                key={ripple.key}
                center={[ripple.lat, ripple.lng]}
                radius={550}
                pathOptions={{
                  color: ripple.color,
                  fillColor: ripple.color,
                  fillOpacity: 0.3,
                  weight: 1.5,
                  className: 'lora-ripple',
                }}
              />
            ))}
        </MapView>

        {/* LIVE / REPLAY indicator — top center */}
        <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2">
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold backdrop-blur-md',
              isLive
                ? 'border-red-500/40 bg-slate-dark/90 text-red-400'
                : 'border-amber-500/40 bg-slate-dark/90 text-amber-400'
            )}
          >
            <span
              className={cn('h-2 w-2 rounded-full', isLive ? 'live-dot bg-red-500' : 'bg-amber-400')}
            />
            {isLive ? 'LIVE' : `REPLAY · ${sliderLabel}`}
          </div>
        </div>

        {/* Controls Overlay — top-right */}
        <div className="absolute right-4 top-4 z-[1000] flex max-h-[calc(100%-8rem)] flex-col gap-2 overflow-y-auto">
          {/* Layer toggles */}
          <div className="flex flex-col gap-1 rounded-lg border border-slate-700/60 bg-slate-dark/90 p-2 backdrop-blur-md">
            <div className="flex items-center gap-1.5 px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-muted">
              <Layers className="h-3 w-3" />
              Layers
            </div>
            {LAYER_DEFS.map((def) => (
              <LayerToggle
                key={def.key}
                active={layers[def.key]}
                onClick={() => setLayers((prev) => ({ ...prev, [def.key]: !prev[def.key] }))}
                label={def.label}
                color={def.color}
              />
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2.5 rounded-lg border border-slate-700/60 bg-slate-dark/90 p-2 backdrop-blur-md">
            <div className="flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-muted">
              <Filter className="h-3 w-3" />
              Filters
            </div>
            <FilterRow
              label="Severity"
              value={severityFilter}
              options={[
                ['all', 'All'],
                ['low', 'Low'],
                ['medium', 'Med'],
                ['high', 'High'],
                ['critical', 'Crit'],
              ]}
              onChange={(v) => setSeverityFilter(v as AlertSeverity | 'all')}
            />
            <FilterRow
              label="Event"
              value={typeFilter}
              options={[
                ['all', 'All'],
                ['human', 'Human'],
                ['animal', 'Wildlife'],
                ['vehicle', 'Vehicle'],
                ['fire', 'Fire'],
              ]}
              onChange={(v) => setTypeFilter(v as AlertType | 'all')}
            />
            <FilterRow
              label="Nodes"
              value={nodeStatusFilter}
              options={[
                ['all', 'All'],
                ['online', 'Online'],
                ['warning', 'Warn'],
                ['offline', 'Offline'],
              ]}
              onChange={(v) => setNodeStatusFilter(v as NodeStatus | 'all')}
            />
            <FilterRow
              label="Window"
              value={timeWindow}
              options={[
                ['all', 'All'],
                ['24h', '24h'],
                ['6h', '6h'],
                ['1h', '1h'],
              ]}
              onChange={(v) => setTimeWindow(v as TimeWindow)}
            />
          </div>

          {/* Legend */}
          <div className="rounded-lg border border-slate-700/60 bg-slate-dark/90 p-2 backdrop-blur-md">
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-muted">
              Node Status
            </div>
            <div className="flex flex-col gap-1">
              <LegendItem color="#10B981" label={`Online (${onlineCount})`} />
              <LegendItem color="#F59E0B" label={`Warning (${warningCount})`} />
              <LegendItem color="#EF4444" label={`Offline (${offlineCount})`} />
            </div>
          </div>
        </div>

        {/* Time slider — bottom center */}
        <div className="absolute bottom-4 left-1/2 z-[1000] w-[min(560px,calc(100%-2rem))] -translate-x-1/2 rounded-lg border border-slate-700/60 bg-slate-dark/90 px-4 py-2.5 backdrop-blur-md">
          <div className="mb-1 flex items-center justify-between text-[10px] text-slate-muted">
            <span>Past 24 hours</span>
            <span className="font-semibold tabular-nums text-slate-text">{sliderLabel}</span>
            <button
              onClick={() => setSlider(SLIDER_STEPS)}
              disabled={isLive}
              className={cn(
                'rounded border px-2 py-0.5 text-[10px] font-bold uppercase transition-colors',
                isLive
                  ? 'cursor-default border-red-500/40 text-red-400'
                  : 'border-forest-light/40 text-forest-light hover:bg-forest-light/10'
              )}
            >
              Live
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={SLIDER_STEPS}
            value={slider}
            onChange={(e) => setSlider(Number(e.target.value))}
            aria-label="Replay time slider — past 24 hours"
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-[9px] tabular-nums text-slate-muted">
            <span>-24h</span>
            <span>-18h</span>
            <span>-12h</span>
            <span>-6h</span>
            <span>now</span>
          </div>
        </div>

        {/* Map info bottom-left */}
        <div className="absolute bottom-4 left-4 z-[1000] hidden flex-col gap-1.5 rounded-lg border border-slate-700/60 bg-slate-dark/90 px-3 py-2 backdrop-blur-md lg:flex">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-forest-light" />
            <span className="text-xs font-medium text-slate-text">Bandipur Tiger Reserve</span>
            <span className="text-xs text-slate-muted">•</span>
            <Activity className="h-3.5 w-3.5 text-forest-light" />
            <span className="text-xs text-slate-muted">{visibleNodes.length} nodes shown</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-slate-muted">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              {visibleAlerts.length} alerts
            </span>
            {incidents.length > 0 && (
              <span className="flex items-center gap-1 text-sky-400">
                <Crosshair className="h-3 w-3" />
                {incidents.length} triangulated
              </span>
            )}
            {activeTeams.length > 0 && (
              <span className="flex items-center gap-1 text-violet-400">
                <Users className="h-3 w-3" />
                {activeTeams.length} teams
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function LayerToggle({ active, onClick, label, color }: {
  active: boolean; onClick: () => void; label: string; color: string
}) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={active}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors',
        active ? 'text-slate-text hover:bg-white/5' : 'text-slate-muted opacity-50 hover:opacity-80'
      )}
    >
      <span
        className="h-2.5 w-2.5 rounded-sm"
        style={{ background: active ? color : '#475569' }}
      />
      {label}
    </button>
  )
}

function FilterRow({ label, value, options, onChange }: {
  label: string
  value: string
  options: [string, string][]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1 px-2">
      <span className="text-[9px] uppercase tracking-wider text-slate-muted">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map(([v, l]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              'rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors',
              value === v
                ? 'border-forest-light/50 bg-forest-light/10 text-forest-light'
                : 'border-white/10 text-slate-muted hover:bg-white/5 hover:text-slate-text'
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 px-2 text-xs text-slate-muted">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </div>
  )
}
