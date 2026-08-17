/// <reference types="vite/client" />

declare module 'leaflet.heat' {
  import type L from 'leaflet';
  const heatLayer: (
    latlngs: Array<[number, number, number]>,
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
      minOpacity?: number;
      gradient?: Record<number, string>;
    }
  ) => L.Layer;
  export default heatLayer;
}

declare module 'leaflet/dist/images/marker-icon-2x.png' {
  const src: string;
  export default src;
}

declare module 'leaflet/dist/images/marker-icon.png' {
  const src: string;
  export default src;
}

declare module 'leaflet/dist/images/marker-shadow.png' {
  const src: string;
  export default src;
}
