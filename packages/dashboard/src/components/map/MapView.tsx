import type { ReactNode } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'

// Fix Leaflet default marker icon issue with Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

interface MapViewProps {
  center: [number, number]
  zoom: number
  children?: ReactNode
  className?: string
}

export function MapView({ center, zoom, children, className }: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={cn('h-full w-full', className)}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  )
}
