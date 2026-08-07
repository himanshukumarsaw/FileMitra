export type DetectionType = 'human' | 'animal' | 'vehicle' | 'unknown';
export type SoundType = 'chainsaw' | 'engine' | 'gunshot' | 'animal_call' | 'ambient' | 'unknown';

export interface Detection {
  id: string;
  type: DetectionType;
  confidence: number; // 0-1
  species?: string;
  soundType?: SoundType;
  nodeId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SensorReading {
  id: string;
  nodeId: string;
  type: 'temperature' | 'humidity' | 'sound_level' | 'motion' | 'battery' | 'signal';
  value: number;
  unit: string;
  timestamp: string;
}

export interface AnalyticsSummary {
  totalAlerts: number;
  alertsToday: number;
  activeNodes: number;
  totalNodes: number;
  speciesDetected: number;
  systemUptime: number; // percentage
  alertsBySeverity: Record<string, number>;
  alertsByType: Record<string, number>;
}
