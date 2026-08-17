/**
 * LoRa mesh packet types shared between nodes (mobile/firmware-sim),
 * the gateway, and any tooling that inspects the radio layer.
 */

import type { SoundType } from './detection';
import type { NodePowerMode } from './node';

export type LoRaPacketKind = 'alert' | 'heartbeat' | 'sensor';

/** Envelope transmitted over the (simulated) LoRa radio link. */
export interface LoRaPacket {
  /** Originating node id */
  nodeId: string;
  /** Monotonic sequence number per node */
  seq: number;
  kind: LoRaPacketKind;
  /** Simulated received signal strength (dBm) — set by the sender for demo purposes */
  rssi: number;
  /** Base64-encoded JSON payload (LoRa carries binary, so we keep it byte-safe) */
  payload: string;
}

/** Decoded alert payload forwarded by the gateway to the backend. */
export interface AlertPayload {
  type: 'human' | 'animal' | 'vehicle' | 'fire';
  confidence: number;
  location: { lat: number; lng: number };
  nodeId: string;
  timestamp?: string;
  soundType?: SoundType;
  species?: string;
  description?: string;
  /** Evidence uploaded out-of-band (REST) before the alert packet is sent */
  audioUrl?: string;
  imageUrl?: string;
}

/** Decoded heartbeat payload. */
export interface HeartbeatPayload {
  nodeId: string;
  batteryLevel: number;
  signalStrength: number;
  timestamp: string;
  /** Intelligent power management state (spec #19) */
  powerMode?: NodePowerMode;
  /** Solar panel input in watts (spec #20) */
  solarInputW?: number;
}

/** Decoded sensor reading payload. */
export interface SensorPayload {
  nodeId: string;
  type: 'temperature' | 'humidity' | 'sound_level' | 'motion' | 'battery' | 'signal' | 'smoke' | 'thermal' | 'wind';
  value: number;
  unit: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Base64 helpers (work in both browser and Node — no Buffer dependency;
// atob/btoa exist in Node >= 16 and every modern browser)
// ---------------------------------------------------------------------------

export function encodePayload(obj: unknown): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function decodePayload<T = unknown>(payload: string): T {
  const bin = atob(payload);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}
