import { simEnv } from './config.js';
import { registerNodes, allRegistered, simNodes } from './nodes.js';
import { transmit } from './lora.js';
import { runNextScenario } from './demoMode.js';

/**
 * FileMitra Forest Guard — Firmware Simulator
 *
 * Mimics solar-powered ESP32 LoRa nodes so the whole pipeline can be
 * demoed without hardware: registration, heartbeats, ambient sensor
 * readings, and scripted edge-AI scenarios (gunshot / chainsaw / fire).
 */
async function main(): Promise<void> {
  console.log('🌲 FileMitra Forest Guard — Firmware Simulator starting...');
  console.log(`[sim] Gateway uplink: ${simEnv.GATEWAY_UPLINK}`);
  console.log(`[sim] Backend:        ${simEnv.BACKEND_URL}`);

  // --- Registration (retry until every virtual node has a backend id) ---
  await registerNodes();
  const registrationTimer = setInterval(async () => {
    if (allRegistered()) {
      clearInterval(registrationTimer);
      return;
    }
    await registerNodes();
  }, 10_000);

  // --- Heartbeats (LoRa keep-alive) with power-management telemetry ---
  setInterval(async () => {
    for (const node of simNodes) {
      if (!node.id) continue;
      // Solar trickle + slow discharge for realism
      node.batteryLevel = Math.max(20, Math.min(100, node.batteryLevel + (Math.random() - 0.45)));
      const hour = new Date().getHours();
      const daytime = hour >= 6 && hour <= 18;
      await transmit(node.id, 'heartbeat', {
        nodeId: node.id,
        batteryLevel: Math.round(node.batteryLevel),
        signalStrength: -(55 + Math.floor(Math.random() * 40)),
        // Intelligent power management: duty cycle escalates after alerting
        powerMode: node.powerMode ?? 'normal',
        // Solar charge-controller telemetry
        solarInputW: daytime ? Math.round((2 + Math.random() * 6) * 10) / 10 : 0,
        timestamp: new Date().toISOString(),
      });
      // Power mode relaxes back to normal after one heartbeat
      if (node.powerMode === 'critical') node.powerMode = 'suspicious';
      else if (node.powerMode === 'suspicious') node.powerMode = 'normal';
    }
  }, simEnv.HEARTBEAT_INTERVAL_MS);

  // --- Environmental sensor rotation (temperature/humidity/smoke/wind/sound) ---
  const SENSOR_ROTATION: Array<() => { type: string; value: number; unit: string }> = [
    () => ({ type: 'temperature', value: Math.round((28 + Math.random() * 9) * 10) / 10, unit: 'C' }),
    () => ({ type: 'humidity', value: Math.round(45 + Math.random() * 25), unit: '%' }),
    () => ({ type: 'smoke', value: Math.round(Math.random() * 12), unit: '%' }),
    () => ({ type: 'wind', value: Math.round((4 + Math.random() * 14) * 10) / 10, unit: 'km/h' }),
    () => ({ type: 'sound_level', value: Math.round((30 + Math.random() * 35) * 10) / 10, unit: 'dB' }),
  ];
  let sensorIndex = 0;
  setInterval(async () => {
    const registered = simNodes.filter((n) => n.id);
    const node = registered[Math.floor(Math.random() * registered.length)];
    if (!node?.id) return;
    const reading = SENSOR_ROTATION[sensorIndex % SENSOR_ROTATION.length]();
    sensorIndex++;
    await transmit(node.id, 'sensor', {
      nodeId: node.id,
      ...reading,
      timestamp: new Date().toISOString(),
    });
  }, simEnv.SENSOR_INTERVAL_MS);

  // --- Scripted demo scenarios (opt-in via FG_SCENARIOS=on) ---
  // Off by default: alerts only appear when a node genuinely transmits a
  // detection (e.g. the phone node app). Heartbeats + ambient sensors keep
  // flowing so nodes stay visible on the dashboard.
  if (simEnv.SCENARIOS_ENABLED) {
    setTimeout(() => void runNextScenario(), 8_000);
    setInterval(() => void runNextScenario(), simEnv.SCENARIO_INTERVAL_MS);
  }

  console.log(
    `[sim] Scenarios ${simEnv.SCENARIOS_ENABLED ? `every ${simEnv.SCENARIO_INTERVAL_MS / 1000}s` : 'disabled (FG_SCENARIOS=on to enable)'}, ` +
      `heartbeats every ${simEnv.HEARTBEAT_INTERVAL_MS / 1000}s`
  );
}

main().catch((err) => {
  console.error('[sim] Fatal error:', err);
  process.exit(1);
});
