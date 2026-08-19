export type FireRiskLevel = 'low' | 'moderate' | 'high' | 'extreme';

/** Zone-wise forest fire risk forecast */
export interface FireRiskZone {
  zone: string;
  /** 0-100 composite risk score */
  risk: number;
  level: FireRiskLevel;
  /** Human-readable contributing factors */
  factors: string[];
}
