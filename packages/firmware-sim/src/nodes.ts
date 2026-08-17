import { simEnv } from './config.js';

/** Virtual solar LoRa nodes deployed across the reserve */
export interface SimNode {
  /** Backend-assigned id (set after registration) */
  id: string | null;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  batteryLevel: number;
  solarCharging: boolean;
  /** Intelligent power-management duty cycle */
  powerMode?: 'normal' | 'suspicious' | 'critical';
}

export const simNodes: SimNode[] = [
  { id: null, name: 'Sim Watchtower Alpha', zone: 'Core Zone', lat: 21.58, lng: 79.6, batteryLevel: 94, solarCharging: true },
  { id: null, name: 'Sim River Crossing B3', zone: 'Buffer Zone', lat: 21.42, lng: 79.73, batteryLevel: 87, solarCharging: true },
  { id: null, name: 'Sim Ridge Post E5', zone: 'Boundary Zone', lat: 21.72, lng: 79.48, batteryLevel: 81, solarCharging: true },
];

/** Register all virtual nodes with the backend; retries until it succeeds. */
export async function registerNodes(): Promise<void> {
  for (const node of simNodes) {
    if (node.id) continue;
    try {
      const res = await fetch(`${simEnv.BACKEND_URL}/api/node-ingest/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: node.name,
          location: { lat: node.lat, lng: node.lng },
          hardwareModel: 'Sim-LoRa FM-X400',
          zone: node.zone,
          batteryLevel: node.batteryLevel,
          solarCharging: node.solarCharging,
          firmwareVersion: 'v2.4.1-sim',
        }),
      });
      if (!res.ok) throw new Error(`Backend responded ${res.status}`);
      const created = (await res.json()) as { _id: string };
      node.id = created._id;
      console.log(`[sim] ✅ Registered "${node.name}" → ${node.id}`);
    } catch (err) {
      console.warn(`[sim] Registration failed for "${node.name}": ${(err as Error).message}`);
    }
  }
}

/** True once every virtual node holds a backend id */
export function allRegistered(): boolean {
  return simNodes.every((n) => n.id !== null);
}

/** Pick a random registered node */
export function randomNode(): SimNode {
  const registered = simNodes.filter((n) => n.id !== null);
  return registered[Math.floor(Math.random() * registered.length)];
}
