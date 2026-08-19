import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { MonitoringNode } from '../../../../shared/types'

const statusColors: Record<string, string> = {
  online: '#10B981',
  warning: '#F59E0B',
  offline: '#EF4444',
}

function createNodeIcon(status: string): L.DivIcon {
  const color = statusColors[status] ?? '#94A3B8'
  const pulse = status === 'online' ? 'animation: pulse-ring 2s ease-out infinite;' : ''
  const html = `
    <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:${color};opacity:0.25;
        ${pulse}
      "></div>
      <div style="
        width:18px;height:18px;border-radius:50%;
        background:${color};
        border:2px solid rgba(15,23,42,0.8);
        box-shadow:0 0 8px ${color}80;
      "></div>
    </div>
  `
  return L.divIcon({
    html,
    className: 'node-marker-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

interface NodeMarkerProps {
  node: MonitoringNode
}

export function NodeMarker({ node }: NodeMarkerProps) {
  const [lng, lat] = node.location.coordinates
  const icon = createNodeIcon(node.status)

  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Popup>
        <div style={{ minWidth: 180, fontFamily: 'system-ui', fontSize: 13 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{node.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: statusColors[node.status],
                display: 'inline-block',
              }}
            />
            <span style={{ textTransform: 'capitalize' }}>{node.status}</span>
          </div>
          <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>
            <div>Zone: {node.zone}</div>
            <div>Battery: {node.batteryLevel}%</div>
            <div>Signal: {node.signalStrength} dBm</div>
            <div>Last seen: {relativeTime(node.lastSeen)}</div>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
