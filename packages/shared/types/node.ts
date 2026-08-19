export type NodeStatus = 'online' | 'offline' | 'warning';
/** Intelligent power management: duty cycle scales with threat level */
export type NodePowerMode = 'normal' | 'suspicious' | 'critical';

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
  /** Current power-management duty cycle */
  powerMode?: NodePowerMode;
  /** Instantaneous solar panel input in watts */
  solarInputW?: number;
}
