export type NodeStatus = 'online' | 'offline' | 'warning';

export interface MonitoringNode {
  id: string;
  name: string;
  location: import('./alert').GeoLocation;
  batteryLevel: number; // 0-100
  solarCharging: boolean;
  status: NodeStatus;
  lastSeen: string; // ISO date
  signalStrength: number; // RSSI in dBm
  firmwareVersion: string;
  zone: string;
  hardwareModel: string;
}
