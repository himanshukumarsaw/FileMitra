import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

interface HeatmapLayerProps {
  points: Array<[number, number, number]>
}

export function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) return

    const heat = (L as unknown as Record<string, unknown> & {
      heatLayer: (
        latlngs: Array<[number, number, number]>,
        options?: Record<string, unknown>
      ) => L.Layer
    }).heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: {
        0.0: '#10B981',
        0.4: '#84CC16',
        0.6: '#F59E0B',
        0.8: '#F97316',
        1.0: '#EF4444',
      },
    })

    heat.addTo(map)
    return () => {
      map.removeLayer(heat)
    }
  }, [map, points])

  return null
}
