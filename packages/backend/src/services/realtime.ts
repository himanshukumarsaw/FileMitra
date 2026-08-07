import { Server } from 'socket.io';
import type { IAlert } from '../models/Alert.js';

let io: Server | null = null;

/** Initialise the realtime service with the Socket.IO server instance */
export function initRealtime(ioInstance: Server): void {
  io = ioInstance;
}

function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialised – call initRealtime() first');
  return io;
}

/** Broadcast a newly created alert to all connected clients */
export function emitNewAlert(alert: IAlert): void {
  try {
    getIO().emit('alert:new', alert);
  } catch (err) {
    console.error('[realtime] emitNewAlert failed:', err);
  }
}

/** Broadcast an alert status update */
export function emitAlertUpdated(alert: IAlert): void {
  try {
    getIO().emit('alert:updated', alert);
  } catch (err) {
    console.error('[realtime] emitAlertUpdated failed:', err);
  }
}

/** Broadcast a node status change */
export function emitNodeStatusChanged(
  nodeId: string,
  status: 'online' | 'offline' | 'warning'
): void {
  try {
    getIO().emit('node:status', { nodeId, status });
  } catch (err) {
    console.error('[realtime] emitNodeStatusChanged failed:', err);
  }
}

/** Broadcast a node heartbeat */
export function emitNodeHeartbeat(
  nodeId: string,
  data: { batteryLevel?: number; signalStrength?: number; timestamp: Date }
): void {
  try {
    getIO().emit('node:heartbeat', { nodeId, ...data });
  } catch (err) {
    console.error('[realtime] emitNodeHeartbeat failed:', err);
  }
}
