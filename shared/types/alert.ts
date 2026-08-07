export type AlertType = 'human' | 'animal' | 'vehicle';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'new' | 'acknowledged' | 'resolved' | 'dismissed';

export interface GeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface AlertExplanation {
  summary: string;
  factors: ExplanationFactor[];
  confidenceBreakdown: ConfidenceBreakdown;
}

export interface ExplanationFactor {
  name: string;
  description: string;
  weight: number; // 0-1
}

export interface ConfidenceBreakdown {
  visual: number;
  audio: number;
  motion: number;
  contextual: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  confidence: number; // 0-1
  location: GeoLocation;
  imageUrl?: string;
  audioUrl?: string;
  explanation: AlertExplanation;
  nodeId: string;
  timestamp: string; // ISO date
  status: AlertStatus;
  species?: string;
  description?: string;
}
