/**
 * JungleSathi — Mock Data Service
 * Generates rich, deterministic mock data for the wildlife monitoring dashboard demo.
 */

import type {
  MonitoringNode,
  Alert,
  AlertType,
  AlertSeverity,
  AlertStatus,
  AlertExplanation,
  SensorReading,
  AnalyticsSummary,
} from '../../../../shared/types';

// ---------------------------------------------------------------------------
// Deterministic seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);

/** Random float in [min, max) */
function rand(min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Random integer in [min, max] */
function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

/** Pick a random element from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Weighted pick — weights array must match items length */
function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Random date within a range, with optional hour-weighting */
function randomDate(start: Date, end: Date, preferNight = false): Date {
  const diff = end.getTime() - start.getTime();
  const d = new Date(start.getTime() + rng() * diff);
  if (preferNight) {
    // Bias toward 20:00–05:00
    const hour = d.getHours();
    if (hour >= 5 && hour < 20 && rng() < 0.6) {
      d.setHours(randInt(20, 28) % 24); // wrap 24-28 → 0-4
      d.setMinutes(randInt(0, 59));
    }
  }
  return d;
}

/** Random date biased toward dawn/dusk (5-8, 17-20) */
function randomDateDawnDusk(start: Date, end: Date): Date {
  const d = randomDate(start, end);
  if (rng() < 0.65) {
    const isDawn = rng() < 0.5;
    d.setHours(isDawn ? randInt(5, 8) : randInt(17, 20));
    d.setMinutes(randInt(0, 59));
  }
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_DEFS: Array<{
  name: string;
  zone: string;
  lat: number;
  lng: number;
  status: 'online' | 'warning' | 'offline';
  battery: number;
  solar: boolean;
  signal: number;
  model: string;
}> = [
  { name: 'Watchtower Alpha', zone: 'Core Zone', lat: 21.58, lng: 79.60, status: 'online', battery: 95, solar: true, signal: -52, model: 'FM-X400' },
  { name: 'River Crossing B3', zone: 'Buffer Zone', lat: 21.42, lng: 79.73, status: 'online', battery: 88, solar: true, signal: -61, model: 'FM-X400' },
  { name: 'Canopy Sensor C1', zone: 'Core Zone', lat: 21.65, lng: 79.55, status: 'online', battery: 78, solar: false, signal: -67, model: 'FM-C200' },
  { name: 'Trail Monitor D2', zone: 'Tourist Zone', lat: 21.38, lng: 79.82, status: 'online', battery: 92, solar: true, signal: -55, model: 'FM-T100' },
  { name: 'Ridge Post E5', zone: 'Boundary Zone', lat: 21.72, lng: 79.48, status: 'online', battery: 84, solar: true, signal: -70, model: 'FM-X400' },
  { name: 'Waterhole F7', zone: 'Core Zone', lat: 21.55, lng: 79.65, status: 'online', battery: 71, solar: false, signal: -74, model: 'FM-C200' },
  { name: 'Grassland Relay G4', zone: 'Buffer Zone', lat: 21.48, lng: 79.78, status: 'online', battery: 90, solar: true, signal: -58, model: 'FM-R300' },
  { name: 'Bamboo Grove H1', zone: 'Tourist Zone', lat: 21.35, lng: 79.88, status: 'warning', battery: 63, solar: false, signal: -83, model: 'FM-C200' },
  { name: 'Cliff Edge J6', zone: 'Boundary Zone', lat: 21.78, lng: 79.42, status: 'warning', battery: 60, solar: false, signal: -87, model: 'FM-X400' },
  { name: 'Dam Perimeter K2', zone: 'Boundary Zone', lat: 21.82, lng: 79.38, status: 'offline', battery: 68, solar: true, signal: -90, model: 'FM-R300' },
];

const SPECIES = ['tiger', 'elephant', 'leopard', 'deer', 'wild boar', 'peacock', 'nilgai'] as const;
const SPECIES_WEIGHTS = [8, 15, 7, 25, 18, 12, 15];

const ALERT_TYPES: AlertType[] = ['human', 'animal', 'vehicle'];
const ALERT_TYPE_WEIGHTS = [20, 60, 20];

const SEVERITIES: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
const SEVERITY_WEIGHTS = [50, 25, 15, 10];

const ALERT_STATUSES: AlertStatus[] = ['new', 'acknowledged', 'resolved'];
const STATUS_WEIGHTS = [55, 30, 15];

// ---------------------------------------------------------------------------
// generateMockNodes
// ---------------------------------------------------------------------------

export function generateMockNodes(): MonitoringNode[] {
  const now = new Date();
  return NODE_DEFS.map((def, i) => ({
    id: `node-${String(i + 1).padStart(3, '0')}`,
    name: def.name,
    location: {
      type: 'Point' as const,
      coordinates: [def.lng, def.lat] as [number, number],
    },
    batteryLevel: def.battery + randInt(-3, 3),
    solarCharging: def.solar,
    status: def.status,
    lastSeen: isoDate(
      def.status === 'offline'
        ? new Date(now.getTime() - randInt(6, 48) * 3600_000)
        : new Date(now.getTime() - randInt(0, 15) * 60_000),
    ),
    signalStrength: def.signal + randInt(-3, 3),
    firmwareVersion: `v2.${randInt(1, 4)}.${randInt(0, 9)}`,
    zone: def.zone,
    hardwareModel: def.model,
  }));
}

// ---------------------------------------------------------------------------
// Alert explanation generators
// ---------------------------------------------------------------------------

function humanExplanation(confidence: number): AlertExplanation {
  const factors = [
    { name: 'Visual Detection', description: `Human silhouette confidence ${(confidence * 100).toFixed(0)}%`, weight: 0.35 },
    { name: 'Motion Pattern', description: 'Bipedal locomotion pattern detected in restricted zone', weight: 0.25 },
    { name: 'Acoustic Signature', description: 'Footstep and conversation audio signature identified', weight: 0.2 },
    { name: 'Temporal Context', description: 'Detection during restricted hours increases threat level', weight: 0.2 },
  ];
  return {
    summary: 'Human presence detected within monitored perimeter. Movement pattern consistent with unauthorized entry.',
    factors,
    confidenceBreakdown: {
      visual: clamp01(confidence + rand(-0.08, 0.05)),
      audio: clamp01(confidence + rand(-0.15, 0.05)),
      motion: clamp01(confidence + rand(-0.05, 0.1)),
      contextual: clamp01(confidence + rand(-0.1, 0.08)),
    },
  };
}

function animalExplanation(species: string, confidence: number): AlertExplanation {
  const descriptions: Record<string, string> = {
    tiger: 'Large feline identified via stripe pattern analysis. Apex predator presence logged.',
    elephant: 'Elephant herd movement detected. Acoustic signature matches low-frequency rumbling.',
    leopard: 'Spotted feline silhouette detected. Nocturnal hunting behavior consistent.',
    deer: 'Ungulate movement pattern classified. Grazing behavior observed near sensor.',
    'wild boar': 'Suid family movement detected. Rooting behavior identified near ground level.',
    peacock: 'Large avian species identified. Distinctive plumage silhouette and call pattern matched.',
    nilgai: 'Antelope species detected via body shape classification. Herd movement pattern observed.',
  };
  const factors = [
    { name: 'Species Classification', description: `${species} identified with ${(confidence * 100).toFixed(0)}% confidence`, weight: 0.4 },
    { name: 'Behavioral Pattern', description: descriptions[species] ?? 'Animal behavior pattern classified.', weight: 0.25 },
    { name: 'Acoustic Confirmation', description: 'Species-specific vocalization detected within range', weight: 0.2 },
    { name: 'Ecological Context', description: 'Detection location within known wildlife corridor', weight: 0.15 },
  ];
  return {
    summary: descriptions[species] ?? `Animal detected: ${species} with high confidence.`,
    factors,
    confidenceBreakdown: {
      visual: clamp01(confidence + rand(-0.06, 0.06)),
      audio: clamp01(confidence + rand(-0.12, 0.08)),
      motion: clamp01(confidence + rand(-0.04, 0.1)),
      contextual: clamp01(confidence + rand(-0.08, 0.12)),
    },
  };
}

function vehicleExplanation(confidence: number): AlertExplanation {
  const factors = [
    { name: 'Visual Detection', description: `Vehicle silhouette identified with ${(confidence * 100).toFixed(0)}% confidence`, weight: 0.3 },
    { name: 'Acoustic Signature', description: 'Engine noise pattern classified as motorized vehicle', weight: 0.3 },
    { name: 'Speed Analysis', description: 'Vehicle speed estimated via frame-to-frame tracking', weight: 0.2 },
    { name: 'Zone Violation', description: 'Vehicle detected in restricted forest corridor — no authorized access logged', weight: 0.2 },
  ];
  return {
    summary: 'Unauthorized vehicle detected within restricted forest zone. Engine signature and movement pattern logged.',
    factors,
    confidenceBreakdown: {
      visual: clamp01(confidence + rand(-0.07, 0.06)),
      audio: clamp01(confidence + rand(-0.05, 0.1)),
      motion: clamp01(confidence + rand(-0.1, 0.08)),
      contextual: clamp01(confidence + rand(-0.08, 0.12)),
    },
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ---------------------------------------------------------------------------
// generateMockAlerts
// ---------------------------------------------------------------------------

export function generateMockAlerts(nodes: MonitoringNode[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600_000);
  const count = 55;

  for (let i = 0; i < count; i++) {
    const type = weightedPick(ALERT_TYPES, ALERT_TYPE_WEIGHTS);
    const severity = weightedPick(SEVERITIES, SEVERITY_WEIGHTS);
    const status = weightedPick(ALERT_STATUSES, STATUS_WEIGHTS);
    const confidence = clamp01(rand(0.6, 0.98));
    const node = pick(nodes);
    const id = `alert-${String(i + 1).padStart(4, '0')}`;

    // Timestamp: humans/vehicles at night, animals at dawn/dusk
    let ts: Date;
    if (type === 'animal') {
      ts = randomDateDawnDusk(thirtyDaysAgo, now);
    } else {
      ts = randomDate(thirtyDaysAgo, now, true);
    }

    const species = type === 'animal' ? weightedPick([...SPECIES], SPECIES_WEIGHTS) : undefined;

    let explanation: AlertExplanation;
    if (type === 'human') explanation = humanExplanation(confidence);
    else if (type === 'animal') explanation = animalExplanation(species!, confidence);
    else explanation = vehicleExplanation(confidence);

    // Slight random offset from node location
    const lat = node.location.coordinates[1] + rand(-0.03, 0.03);
    const lng = node.location.coordinates[0] + rand(-0.03, 0.03);

    const descriptions: Record<AlertType, string[]> = {
      human: [
        'Unauthorized person detected near patrol boundary',
        'Human movement in core zone during restricted hours',
        'Possible poacher activity — immediate review recommended',
        'Trespasser detected along forest perimeter',
      ],
      animal: [
        `Wildlife sighting: ${species} detected near ${node.name}`,
        `${species} movement logged in ${node.zone}`,
        `Animal activity: ${species} crossing monitored trail`,
        `${species} presence confirmed by multi-sensor fusion`,
      ],
      vehicle: [
        'Unidentified vehicle on restricted forest road',
        'Vehicle entry detected without permit authorization',
        'Motorized transport logged in buffer zone at night',
        'Possible logging vehicle — acoustic signature flagged',
      ],
      fire: [
        'Acoustic crackle signature consistent with forest fire',
        'Sustained broadband combustion noise detected — possible fire',
        'Possible forest fire — acoustic analysis flagged for dispatch',
      ],
    };

    alerts.push({
      id,
      type,
      severity,
      confidence: Math.round(confidence * 100) / 100,
      location: { type: 'Point', coordinates: [lng, lat] },
      imageUrl: `https://picsum.photos/seed/${id}/400/300`,
      explanation,
      nodeId: node.id,
      timestamp: isoDate(ts),
      status,
      species,
      description: pick(descriptions[type]),
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// generateMockSensorData
// ---------------------------------------------------------------------------

type SensorType = SensorReading['type'];

const SENSOR_CONFIG: Record<SensorType, { min: number; max: number; unit: string }> = {
  temperature: { min: 20, max: 40, unit: '°C' },
  humidity: { min: 40, max: 90, unit: '%' },
  sound_level: { min: 30, max: 95, unit: 'dB' },
  motion: { min: 0, max: 1, unit: '' },
  battery: { min: 60, max: 100, unit: '%' },
  signal: { min: -90, max: -50, unit: 'dBm' },
  smoke: { min: 0, max: 15, unit: '%' },
  thermal: { min: 22, max: 45, unit: '°C' },
  wind: { min: 0, max: 30, unit: 'km/h' },
};

const SENSOR_TYPES: SensorType[] = ['temperature', 'humidity', 'sound_level', 'motion', 'battery', 'signal'];

export function generateMockSensorData(nodes: MonitoringNode[]): SensorReading[] {
  const readings: SensorReading[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600_000);
  const readingsPerNode = 200;

  for (const node of nodes) {
    for (let i = 0; i < readingsPerNode; i++) {
      const type = SENSOR_TYPES[i % SENSOR_TYPES.length];
      const cfg = SENSOR_CONFIG[type];
      const ts = new Date(
        thirtyDaysAgo.getTime() + (i / readingsPerNode) * (now.getTime() - thirtyDaysAgo.getTime()),
      );

      // Add diurnal variation for temperature
      let value = rand(cfg.min, cfg.max);
      if (type === 'temperature') {
        const hour = ts.getHours();
        value += Math.sin(((hour - 6) / 24) * Math.PI * 2) * 4; // warmer midday
      }
      if (type === 'sound_level') {
        // Quieter at night, louder during day
        const hour = ts.getHours();
        value += hour >= 6 && hour <= 18 ? 8 : -5;
      }

      readings.push({
        id: `sr-${node.id}-${i}`,
        nodeId: node.id,
        type,
        value: Math.round(value * 100) / 100,
        unit: cfg.unit,
        timestamp: isoDate(ts),
      });
    }
  }

  return readings;
}

// ---------------------------------------------------------------------------
// generateMockAnalyticsSummary
// ---------------------------------------------------------------------------

export function generateMockAnalyticsSummary(alerts: Alert[], nodes: MonitoringNode[]): AnalyticsSummary {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const alertsToday = alerts.filter((a) => new Date(a.timestamp) >= todayStart).length;
  const activeNodes = nodes.filter((n) => n.status !== 'offline').length;
  const speciesSet = new Set(alerts.filter((a) => a.species).map((a) => a.species));

  const alertsBySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const alertsByType: Record<string, number> = { human: 0, animal: 0, vehicle: 0 };
  for (const a of alerts) {
    alertsBySeverity[a.severity] = (alertsBySeverity[a.severity] ?? 0) + 1;
    alertsByType[a.type] = (alertsByType[a.type] ?? 0) + 1;
  }

  const uptimeNodes = nodes.filter((n) => n.status !== 'offline').length;
  const systemUptime = Math.round((uptimeNodes / nodes.length) * 100);

  return {
    totalAlerts: alerts.length,
    alertsToday,
    activeNodes,
    totalNodes: nodes.length,
    speciesDetected: speciesSet.size,
    systemUptime,
    alertsBySeverity,
    alertsByType,
  };
}

// ---------------------------------------------------------------------------
// generateMockHeatmapData
// ---------------------------------------------------------------------------

export function generateMockHeatmapData(alerts: Alert[]): Array<[number, number, number]> {
  return alerts.map((a) => {
    const [lng, lat] = a.location.coordinates;
    const intensity =
      a.severity === 'critical' ? 1.0 : a.severity === 'high' ? 0.75 : a.severity === 'medium' ? 0.5 : 0.3;
    return [lat, lng, intensity] as [number, number, number];
  });
}

// ---------------------------------------------------------------------------
// generateMockTrendData
// ---------------------------------------------------------------------------

export function generateMockTrendData(
  alerts: Alert[],
): Array<{ date: string; count: number; human: number; animal: number; vehicle: number; fire: number }> {
  const map = new Map<string, { count: number; human: number; animal: number; vehicle: number; fire: number }>();

  for (const a of alerts) {
    const date = a.timestamp.slice(0, 10);
    const entry = map.get(date) ?? { count: 0, human: 0, animal: 0, vehicle: 0, fire: 0 };
    entry.count++;
    entry[a.type]++;
    map.set(date, entry);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));
}

// ---------------------------------------------------------------------------
// generateMockSpeciesData
// ---------------------------------------------------------------------------

export function generateMockSpeciesData(
  alerts: Alert[],
): Array<{ species: string; count: number; confidence: number }> {
  const map = new Map<string, { count: number; totalConf: number }>();

  for (const a of alerts) {
    if (!a.species) continue;
    const entry = map.get(a.species) ?? { count: 0, totalConf: 0 };
    entry.count++;
    entry.totalConf += a.confidence;
    map.set(a.species, entry);
  }

  return Array.from(map.entries())
    .map(([species, v]) => ({
      species,
      count: v.count,
      confidence: Math.round((v.totalConf / v.count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// getRecentAlerts
// ---------------------------------------------------------------------------

export function getRecentAlerts(alerts: Alert[], limit = 10): Alert[] {
  return [...alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Pre-generated default datasets
// ---------------------------------------------------------------------------

export const mockNodes = generateMockNodes();
export const mockAlerts = generateMockAlerts(mockNodes);
export const mockSensorData = generateMockSensorData(mockNodes);
export const mockAnalytics = generateMockAnalyticsSummary(mockAlerts, mockNodes);
export const mockHeatmap = generateMockHeatmapData(mockAlerts);
export const mockTrends = generateMockTrendData(mockAlerts);
export const mockSpecies = generateMockSpeciesData(mockAlerts);
