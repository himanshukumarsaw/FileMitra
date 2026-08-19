import type { SoundType } from './detection';

export type AlertType = 'human' | 'animal' | 'vehicle' | 'fire';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'new' | 'acknowledged' | 'resolved' | 'dismissed';
/** False-alarm suppression: a single-node detection is suspicious until corroborated */
export type VerificationStatus = 'suspicious' | 'confirmed';
/** Human-in-the-loop officer feedback */
export type AlertFeedback = 'genuine' | 'false_alarm';

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
  soundType?: SoundType;
  /** Alerts correlated into one incident (multi-node triangulation) share this id */
  incidentId?: string;
  /** Threat-confidence engine: suspicious until a second node / camera corroborates */
  verificationStatus?: VerificationStatus;
  /** Node ids that corroborated this incident */
  confirmingNodes?: string[];
  /** Objects identified by visual AI on the captured frame */
  visualLabels?: string[];
  /** Human-in-the-loop officer feedback */
  feedback?: AlertFeedback;
  /** ISO date when an officer acknowledged the alert */
  acknowledgedAt?: string;
}
