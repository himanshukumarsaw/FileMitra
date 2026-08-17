/**
 * LoRa transport for the mobile node.
 *
 * Builds LoRa-style packets (base64 payload envelope) and uplinks them to
 * the gateway receiver — the same radio bridge a physical SX1276 node would
 * use. Falls back between candidate gateway addresses so the phone works
 * whether the gateway runs on this machine or another host on the LAN.
 */

import { encodePayload, type AlertPayload, type HeartbeatPayload, type LoRaPacket } from '../../../../shared/types';

const seqCounters = new Map<string, number>();

/** Candidate gateway uplink endpoints, tried in order */
function gatewayCandidates(): string[] {
  const host = window.location.hostname || 'localhost';
  // Same-origin proxy first — the HTTPS phone page cannot fetch plain http://
  // endpoints (mixed-content is hard-blocked by browsers).
  return ['/lora/uplink', `http://${host}:4001/lora/uplink`];
}

function nextSeq(nodeId: string): number {
  const seq = (seqCounters.get(nodeId) ?? 0) + 1;
  seqCounters.set(nodeId, seq);
  return seq;
}

/** Simulated radio link quality for demo display */
export function simulatedRssi(): number {
  return -(55 + Math.floor(Math.random() * 40));
}

function buildPacket(nodeId: string, kind: LoRaPacket['kind'], payload: unknown): LoRaPacket {
  return {
    nodeId,
    seq: nextSeq(nodeId),
    kind,
    rssi: simulatedRssi(),
    payload: encodePayload(payload),
  };
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Self-register this phone as a node with the backend; returns its id. */
export async function registerNode(params: {
  name: string;
  lat: number;
  lng: number;
  batteryLevel?: number;
}): Promise<{ id: string; name: string }> {
  const res = await postJson('/api/node-ingest/register', {
    name: params.name,
    location: { lat: params.lat, lng: params.lng },
    hardwareModel: 'Mobile-Node (smartphone)',
    zone: 'Mobile Patrol',
    batteryLevel: params.batteryLevel ?? 100,
    firmwareVersion: 'v1.0.0-web',
  });
  if (!res.ok) throw new Error(`Registration failed (${res.status})`);
  const node = (await res.json()) as { _id: string; name: string };
  return { id: node._id, name: node.name };
}

/** Send a heartbeat over the LoRa mesh (via gateway). */
export async function sendHeartbeat(nodeId: string, batteryLevel: number): Promise<boolean> {
  const payload: HeartbeatPayload = {
    nodeId,
    batteryLevel,
    signalStrength: simulatedRssi(),
    timestamp: new Date().toISOString(),
  };
  return uplink(buildPacket(nodeId, 'heartbeat', payload));
}

/** Transmit an Edge AI detection as a LoRa alert packet (via gateway). */
export async function sendAlert(alert: AlertPayload): Promise<boolean> {
  const ok = await uplink(buildPacket(alert.nodeId, 'alert', alert));
  if (!ok) {
    // Offline mode (spec #18): store locally, keep monitoring, sync later
    queueOfflineAlert(alert);
  } else {
    void flushOfflineQueue();
  }
  return ok;
}

// ---------------------------------------------------------------------------
// Offline store-and-forward — alerts recorded while the gateway/internet is
// down are queued in localStorage and synchronised when the link returns.
// ---------------------------------------------------------------------------

const OFFLINE_QUEUE_KEY = 'forest-guard-offline-queue';
const MAX_QUEUED = 25;

function queueOfflineAlert(alert: AlertPayload): void {
  try {
    const queue = readOfflineQueue();
    queue.push(alert);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUED)));
  } catch {
    // storage full/unavailable — drop silently
  }
}

function readOfflineQueue(): AlertPayload[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as AlertPayload[]) : [];
  } catch {
    return [];
  }
}

/** Number of alerts waiting for connectivity (for the node UI). */
export function offlineQueueSize(): number {
  return readOfflineQueue().length;
}

/** Re-transmit queued alerts; returns how many were synchronised. */
export async function flushOfflineQueue(): Promise<number> {
  const queue = readOfflineQueue();
  if (queue.length === 0) return 0;
  let synced = 0;
  const remaining: AlertPayload[] = [];
  for (const alert of queue) {
    const ok = await uplink(buildPacket(alert.nodeId, 'alert', alert));
    if (ok) synced++;
    else remaining.push(alert);
  }
  try {
    if (remaining.length === 0) localStorage.removeItem(OFFLINE_QUEUE_KEY);
    else localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  } catch {
    // ignore storage errors
  }
  return synced;
}

/** Try each gateway candidate until one accepts the packet. */
async function uplink(packet: LoRaPacket): Promise<boolean> {
  for (const url of gatewayCandidates()) {
    try {
      const res = await postJson(url, packet);
      if (res.ok) return true;
    } catch {
      // try next candidate
    }
  }
  return false;
}
