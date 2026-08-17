/**
 * Rule-based alert severity classifier.
 *
 * Inputs: raw detection data (type, confidence, timestamp, location, species)
 * Output: severity level, numeric score, and human-readable reasoning.
 */

export interface DetectionInput {
  type: 'human' | 'animal' | 'vehicle' | 'fire';
  confidence: number;
  timestamp: Date;
  location: { lat: number; lng: number };
  species?: string;
  zone?: string;
  soundType?:
    | 'chainsaw'
    | 'engine'
    | 'gunshot'
    | 'vehicle'
    | 'animal_call'
    | 'fire_crackle'
    | 'ambient'
    | 'tamper'
    | 'unknown';
}

export interface ClassificationResult {
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  reasoning: string[];
}

const ENDANGERED_SPECIES = new Set([
  'tiger',
  'leopard',
  'elephant',
  'rhino',
  'pangolin',
]);

const RESTRICTED_ZONES = new Set(['Core Zone', 'Boundary Zone']);

function isNightTime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 20 || hour < 5;
}

export function classifyAlert(input: DetectionInput): ClassificationResult {
  let score = 0;
  const reasoning: string[] = [];

  // --- Sound-based rules (highest priority) ---
  if (input.soundType === 'chainsaw') {
    score += 60;
    reasoning.push('Chainsaw sound detected — possible illegal logging');
  } else if (input.soundType === 'gunshot') {
    score += 60;
    reasoning.push('Gunshot sound detected — possible poaching activity');
  } else if (input.soundType === 'fire_crackle') {
    score += 50;
    reasoning.push('Fire crackle acoustic signature detected');
  } else if (input.soundType === 'tamper') {
    score += 55;
    reasoning.push('Node tampering detected — sudden motion / orientation change');
  }

  // --- Time-of-day factor ---
  const night = isNightTime(input.timestamp);
  if (night) {
    score += 15;
    reasoning.push('Detection occurred during night hours (20:00–05:00)');
  }

  // --- Detection type rules ---
  if (input.type === 'fire') {
    score += 55;
    reasoning.push('Possible forest fire — acoustic crackle signature detected');

    if (night) {
      score += 10;
      reasoning.push('Fire signature at night — delayed visibility, elevated risk');
    }
  } else if (input.type === 'human') {
    score += 20;
    reasoning.push('Human presence detected');

    if (night) {
      score += 10;
      reasoning.push('Human detected at night — elevated risk');
    }

    if (input.zone && RESTRICTED_ZONES.has(input.zone)) {
      score += 20;
      reasoning.push(`Human in restricted zone: ${input.zone}`);
    }

    if (input.confidence > 0.8 && input.zone && RESTRICTED_ZONES.has(input.zone)) {
      score += 15;
      reasoning.push('High-confidence human detection in restricted zone');
    }
  } else if (input.type === 'vehicle') {
    score += 10;
    reasoning.push('Vehicle detected');

    if (night) {
      score += 15;
      reasoning.push('Vehicle at night in forest area — suspicious');
    }
  } else if (input.type === 'animal') {
    if (input.species && ENDANGERED_SPECIES.has(input.species.toLowerCase())) {
      score += 15;
      reasoning.push(`Endangered species detected: ${input.species}`);
    } else {
      score += 2;
      reasoning.push('Routine animal detection');
    }
  }

  // --- Confidence factor ---
  if (input.confidence > 0.9) {
    score += 5;
    reasoning.push('Very high detection confidence (>0.9)');
  }

  // Clamp score to 0-100
  score = Math.min(100, Math.max(0, score));

  // Map score → severity
  let severity: ClassificationResult['severity'];
  if (score >= 70) severity = 'critical';
  else if (score >= 45) severity = 'high';
  else if (score >= 20) severity = 'medium';
  else severity = 'low';

  return { severity, score, reasoning };
}
