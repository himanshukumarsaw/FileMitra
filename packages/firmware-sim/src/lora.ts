import { simEnv } from './config.js';

export type LoRaKind = 'alert' | 'heartbeat' | 'sensor';

/** Mirrors shared/types/lora.ts LoRaPacket envelope */
export interface LoRaPacket {
  nodeId: string;
  seq: number;
  kind: LoRaKind;
  rssi: number;
  payload: string; // base64 JSON
}

const seqCounters = new Map<string, number>();

/** Simulated radio link quality: -55 (close) to -95 (edge of mesh) */
function simulatedRssi(): number {
  return -(55 + Math.floor(Math.random() * 40));
}

/** Build a LoRa-style packet and transmit it to the gateway uplink. */
export async function transmit(nodeId: string, kind: LoRaKind, data: unknown): Promise<boolean> {
  const seq = (seqCounters.get(nodeId) ?? 0) + 1;
  seqCounters.set(nodeId, seq);

  const packet: LoRaPacket = {
    nodeId,
    seq,
    kind,
    rssi: simulatedRssi(),
    payload: Buffer.from(JSON.stringify(data), 'utf-8').toString('base64'),
  };

  try {
    const res = await fetch(simEnv.GATEWAY_UPLINK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packet),
    });
    if (!res.ok) throw new Error(`Gateway responded ${res.status}`);
    console.log(`[sim] 📤 TX ${kind} from ${nodeId} (seq=${seq}, RSSI=${packet.rssi} dBm)`);
    return true;
  } catch (err) {
    console.warn(`[sim] TX failed for ${nodeId}: ${(err as Error).message}`);
    return false;
  }
}
