/**
 * LoRa payload decoder.
 *
 * Mirrors the shared LoRaPacket envelope (see shared/types/lora.ts).
 * Kept local so the gateway stays independently compilable.
 */

export type LoRaPacketKind = 'alert' | 'heartbeat' | 'sensor';

export interface LoRaPacket {
  nodeId: string;
  seq: number;
  kind: LoRaPacketKind;
  rssi: number;
  /** Base64-encoded JSON payload */
  payload: string;
}

export interface DecodedPacket {
  kind: LoRaPacketKind;
  nodeId: string;
  seq: number;
  rssi: number;
  data: Record<string, unknown>;
}

/** Validate the envelope shape of an incoming uplink. */
export function isLoRaPacket(value: unknown): value is LoRaPacket {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Partial<LoRaPacket>;
  return (
    typeof p.nodeId === 'string' &&
    typeof p.seq === 'number' &&
    typeof p.payload === 'string' &&
    (p.kind === 'alert' || p.kind === 'heartbeat' || p.kind === 'sensor')
  );
}

/** Decode the base64 payload of a LoRa packet into a JSON object. */
export function decodePacket(packet: LoRaPacket): DecodedPacket {
  const json = Buffer.from(packet.payload, 'base64').toString('utf-8');
  return {
    kind: packet.kind,
    nodeId: packet.nodeId,
    seq: packet.seq,
    rssi: typeof packet.rssi === 'number' ? packet.rssi : -70,
    data: JSON.parse(json) as Record<string, unknown>,
  };
}

/** Map a packet kind to the MQTT topic the backend subscribes to. */
export function topicForKind(kind: LoRaPacketKind): string {
  switch (kind) {
    case 'alert':
      return 'filemitra/gateway/alerts';
    case 'sensor':
      return 'filemitra/gateway/sensors';
    case 'heartbeat':
      return 'filemitra/gateway/heartbeat';
  }
}
