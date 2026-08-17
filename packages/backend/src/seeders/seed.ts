import 'dotenv/config';
import mongoose from 'mongoose';
import { Alert } from '../models/Alert.js';
import { Node } from '../models/Node.js';
import { SensorData } from '../models/SensorData.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ── Node definitions ─────────────────────────────────────────────────────────

const NODE_DEFS = [
  { name: 'Watchtower Alpha',    zone: 'Core Zone',     lat: 11.670, lng: 76.630, battery: 92, solar: true,  signal: -55, status: 'online'  as const, fw: '1.2.3' },
  { name: 'River Crossing B3',   zone: 'Buffer Zone',   lat: 11.720, lng: 76.520, battery: 78, solar: true,  signal: -68, status: 'online'  as const, fw: '1.2.1' },
  { name: 'Canopy Sensor C1',    zone: 'Core Zone',     lat: 11.685, lng: 76.670, battery: 45, solar: false, signal: -79, status: 'warning' as const, fw: '1.1.0' },
  { name: 'Trail Monitor D2',    zone: 'Tourist Zone',  lat: 11.650, lng: 76.580, battery: 88, solar: true,  signal: -52, status: 'online'  as const, fw: '1.2.3' },
  { name: 'Waterhole E5',        zone: 'Core Zone',     lat: 11.710, lng: 76.690, battery: 63, solar: true,  signal: -71, status: 'online'  as const, fw: '1.2.0' },
  { name: 'Ridge Point F1',      zone: 'Boundary Zone', lat: 11.780, lng: 76.450, battery: 22, solar: false, signal: -88, status: 'warning' as const, fw: '1.0.5' },
  { name: 'Valley Post G4',      zone: 'Buffer Zone',   lat: 11.640, lng: 76.550, battery: 95, solar: true,  signal: -48, status: 'online'  as const, fw: '1.2.3' },
  { name: 'Boundary H2',         zone: 'Boundary Zone', lat: 11.810, lng: 76.720, battery: 15, solar: false, signal: -92, status: 'offline' as const, fw: '1.0.2' },
  { name: 'Clearing J3',         zone: 'Tourist Zone',  lat: 11.660, lng: 76.600, battery: 81, solar: true,  signal: -60, status: 'online'  as const, fw: '1.2.2' },
  { name: 'Elephant Path K1',    zone: 'Core Zone',     lat: 11.735, lng: 76.660, battery: 70, solar: true,  signal: -65, status: 'online'  as const, fw: '1.2.3' },
];

// ── User definitions ─────────────────────────────────────────────────────────

const USER_DEFS = [
  { email: 'admin@junglesathi.in',         role: 'admin'  as const, name: 'Admin User' },
  { email: 'officer.sharma@forest.gov',  role: 'officer' as const, name: 'Rajesh Sharma' },
  { email: 'officer.priya@forest.gov',   role: 'officer' as const, name: 'Priya Menon' },
  { email: 'viewer.anil@forest.gov',     role: 'viewer' as const, name: 'Anil Kumar' },
  { email: 'viewer.neha@forest.gov',     role: 'viewer' as const, name: 'Neha Patel' },
];
const DEFAULT_PASSWORD = 'junglesathi123';

// ── Alert generation ─────────────────────────────────────────────────────────

const SPECIES = ['tiger', 'elephant', 'leopard', 'deer', 'wild boar', 'peacock'];

const HUMAN_DESCRIPTIONS = [
  'Human figure detected moving through undergrowth',
  'Person observed near restricted area perimeter',
  'Unidentified individual carrying object',
  'Human presence at water source',
  'Multiple human figures detected on trail',
];

const ANIMAL_DESCRIPTIONS: Record<string, string[]> = {
  tiger:       ['Adult tiger crossing trail', 'Tiger resting near waterhole', 'Tiger with cub detected'],
  elephant:    ['Herd of elephants at clearing', 'Lone bull elephant on path', 'Elephants bathing at river'],
  leopard:     ['Leopard on tree branch', 'Leopard stalking prey', 'Leopard crossing road'],
  deer:        ['Spotted deer grazing', 'Deer herd at waterhole', 'Sambar deer on trail'],
  'wild boar': ['Wild boar group foraging', 'Boar crossing sensor path', 'Wild boar near boundary'],
  peacock:     ['Peacock displaying feathers', 'Peafowl group in clearing', 'Peacock calling at dawn'],
};

const VEHICLE_DESCRIPTIONS = [
  'Vehicle headlights detected on forest road',
  'Unidentified vehicle near boundary',
  'Motorcycle on restricted access road',
  'Jeep-type vehicle entering buffer zone',
  'Logging vehicle detected in core zone',
];

function generateAlertExplanation(type: string, species?: string, severity?: string) {
  const factors: Array<{ name: string; description: string; weight: number }> = [];
  if (type === 'human') {
    factors.push({ name: 'type', description: 'Human presence in monitored zone', weight: 30 });
    factors.push({ name: 'time', description: 'Detection during restricted hours', weight: 25 });
  } else if (type === 'animal') {
    factors.push({ name: 'species', description: `${species ?? 'Unknown'} detection`, weight: 20 });
    if (species && ['tiger', 'elephant', 'leopard'].includes(species)) {
      factors.push({ name: 'conservation', description: 'Endangered species — heightened monitoring', weight: 35 });
    }
  } else {
    factors.push({ name: 'vehicle', description: 'Vehicle movement in restricted zone', weight: 40 });
  }
  factors.push({ name: 'confidence', description: 'Model confidence score', weight: 15 });

  const summary = `${severity ?? 'medium'} severity ${type} alert — ${factors.map(f => f.description).join('; ')}`;
  return {
    summary,
    factors,
    confidenceBreakdown: {
      visual: rand(0.6, 0.95),
      audio: rand(0.3, 0.85),
      motion: rand(0.5, 0.9),
      contextual: rand(0.4, 0.88),
    },
  };
}

function generateAlerts(nodes: mongoose.Types.ObjectId[], count: number) {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const alerts = [];

  for (let i = 0; i < count; i++) {
    const nodeId = pick(nodes);
    const nodeIdx = nodes.indexOf(nodeId);
    const nodeDef = NODE_DEFS[nodeIdx];

    // Weighted type: 60% animal, 20% human, 20% vehicle
    const type = weightedPick(['animal', 'human', 'vehicle'], [60, 20, 20]);

    // Weighted severity
    const severity = weightedPick(['low', 'medium', 'high', 'critical'], [50, 25, 15, 10]);

    const confidence = Math.round(rand(0.60, 0.98) * 100) / 100;

    // Timestamp: night hours (20-05) more likely for human/vehicle; dawn/dusk for animals
    const daysAgo = rand(0, thirtyDaysMs);
    const ts = new Date(now - daysAgo);
    if (type === 'human' || type === 'vehicle') {
      ts.setHours(randInt(20, 28) % 24, randInt(0, 59));  // bias night
    } else {
      ts.setHours(pick([5, 6, 7, 17, 18, 19]), randInt(0, 59)); // dawn/dusk
    }

    const species = type === 'animal' ? pick(SPECIES) : undefined;
    const description =
      type === 'human'   ? pick(HUMAN_DESCRIPTIONS) :
      type === 'vehicle' ? pick(VEHICLE_DESCRIPTIONS) :
      species            ? pick(ANIMAL_DESCRIPTIONS[species] ?? ANIMAL_DESCRIPTIONS.deer) :
                           'Animal detection';

    const lat = nodeDef.lat + rand(-0.008, 0.008);
    const lng = nodeDef.lng + rand(-0.008, 0.008);

    const explanation = generateAlertExplanation(type, species, severity);

    const statusWeights = [60, 20, 15, 5]; // new, ack, resolved, dismissed
    const status = weightedPick(['new', 'acknowledged', 'resolved', 'dismissed'], statusWeights);

    alerts.push({
      type,
      severity,
      confidence,
      location: { type: 'Point' as const, coordinates: [lng, lat] },
      imageUrl: `https://picsum.photos/seed/${i}/400/300`,
      audioUrl: Math.random() < 0.3 ? `https://picsum.photos/seed/audio${i}/200/50` : undefined,
      explanation,
      nodeId,
      timestamp: ts,
      species,
      description,
      status,
    });
  }
  return alerts;
}

// ── Sensor data generation ───────────────────────────────────────────────────

const SENSOR_TYPES: Array<{ type: string; unit: string; min: number; max: number }> = [
  { type: 'temperature', unit: '°C',   min: 18,  max: 42 },
  { type: 'humidity',    unit: '%',    min: 40,  max: 98 },
  { type: 'sound_level', unit: 'dB',   min: 20,  max: 85 },
  { type: 'motion',      unit: 'g',    min: 0,   max: 2.5 },
  { type: 'battery',     unit: '%',    min: 5,   max: 100 },
  { type: 'signal',      unit: 'dBm',  min: -100, max: -30 },
];

function generateSensorData(nodes: mongoose.Types.ObjectId[], readingsPerNode: number) {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const interval = thirtyDaysMs / readingsPerNode;
  const readings = [];

  for (let n = 0; n < nodes.length; n++) {
    for (let i = 0; i < readingsPerNode; i++) {
      const sensorDef = pick(SENSOR_TYPES);
      const ts = new Date(now - thirtyDaysMs + i * interval + rand(-interval / 2, interval / 2));
      readings.push({
        nodeId: nodes[n],
        type: sensorDef.type,
        value: Math.round(rand(sensorDef.min, sensorDef.max) * 10) / 10,
        unit: sensorDef.unit,
        timestamp: ts,
      });
    }
  }
  return readings;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ Connected. Clearing existing data...');

  await Alert.deleteMany({});
  await Node.deleteMany({});
  await SensorData.deleteMany({});
  await User.deleteMany({});
  console.log('🗑  Collections cleared.');

  // ── Nodes ─────────────────────────────────────────────────────────────────
  console.log('📡 Creating nodes...');
  const createdNodes = await Node.insertMany(
    NODE_DEFS.map((n) => ({
      name: n.name,
      location: { type: 'Point' as const, coordinates: [n.lng, n.lat] },
      batteryLevel: n.battery,
      solarCharging: n.solar,
      signalStrength: n.signal,
      status: n.status,
      lastSeen: new Date(Date.now() - randInt(0, 3600_000)),
      firmwareVersion: n.fw,
      zone: n.zone,
      hardwareModel: pick(['ESP32-CAM', 'ESP32-S3', 'RPI-Zero-W', 'Arduino-Portenta']),
    }))
  );
  const nodeIds = createdNodes.map((n) => n._id as mongoose.Types.ObjectId);
  console.log(`   → ${createdNodes.length} nodes created`);

  // ── Users ─────────────────────────────────────────────────────────────────
  console.log('👤 Creating users...');
  const createdUsers = await User.insertMany(
    USER_DEFS.map((u) => ({ ...u, password: DEFAULT_PASSWORD }))
  );
  console.log(`   → ${createdUsers.length} users created (password: ${DEFAULT_PASSWORD})`);

  // ── Alerts ────────────────────────────────────────────────────────────────
  console.log('🚨 Generating alerts...');
  const ALERT_COUNT = 520;
  const alertDocs = generateAlerts(nodeIds, ALERT_COUNT);
  await Alert.insertMany(alertDocs);
  console.log(`   → ${ALERT_COUNT} alerts created`);

  // ── Sensor data ───────────────────────────────────────────────────────────
  console.log('📊 Generating sensor readings...');
  const READINGS_PER_NODE = 200;
  const sensorDocs = generateSensorData(nodeIds, READINGS_PER_NODE);
  await SensorData.insertMany(sensorDocs);
  console.log(`   → ${sensorDocs.length} sensor readings created`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('');
  console.log('════════════════════════════════════════════════');
  console.log(`  Seeded ${createdNodes.length} nodes, ${createdUsers.length} users, ${ALERT_COUNT} alerts, ${sensorDocs.length} sensor readings`);
  console.log('════════════════════════════════════════════════');

  await mongoose.disconnect();
  console.log('👋 Disconnected.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
