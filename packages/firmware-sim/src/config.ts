import 'dotenv/config';

export const simEnv = {
  /** Gateway LoRa uplink endpoint */
  GATEWAY_UPLINK: process.env.GATEWAY_UPLINK || 'http://localhost:4001/lora/uplink',
  /** Backend REST API (used for node self-registration) */
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:4000',
  /** ML acoustic threat detection service */
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  /** Seconds between demo scenario events */
  SCENARIO_INTERVAL_MS: parseInt(process.env.SCENARIO_INTERVAL_MS || '45000', 10),
  /**
   * Auto-fire scripted demo scenarios. Default OFF — alerts are only created
   * when a node actually transmits a detection. Set FG_SCENARIOS=on to
   * re-enable the rotating demo (gunshot/chainsaw/fire/wildlife/tamper).
   */
  SCENARIOS_ENABLED: (process.env.FG_SCENARIOS ?? 'off') === 'on',
  /** Seconds between heartbeats */
  HEARTBEAT_INTERVAL_MS: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '15000', 10),
  /** Seconds between ambient sensor readings */
  SENSOR_INTERVAL_MS: parseInt(process.env.SENSOR_INTERVAL_MS || '30000', 10),
};
