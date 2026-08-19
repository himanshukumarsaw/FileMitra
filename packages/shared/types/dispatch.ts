import type { AlertSeverity, AlertType } from './alert';

export type DispatchStatus = 'dispatched' | 'enroute' | 'onscene' | 'resolved';

export interface DispatchTimelineEntry {
  at: string; // ISO date
  label: string;
}

/** Automated ranger response generated for critical/high alerts */
export interface Dispatch {
  id: string;
  alertId: string;
  /** Alerts correlated into the same incident share this id */
  incidentId?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  soundType?: string;
  team: string;
  rangerPhone: string;
  zone: string;
  status: DispatchStatus;
  etaMinutes: number;
  /** [longitude, latitude] of the incident */
  coordinates: [number, number];
  timeline: DispatchTimelineEntry[];
  createdAt: string;
}
