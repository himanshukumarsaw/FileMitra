import 'dotenv/config';

export const gatewayEnv = {
  /** HTTP port where LoRa uplinks are received (simulated radio RX) */
  RECEIVER_PORT: parseInt(process.env.GATEWAY_PORT || '4001', 10),
  /** MQTT broker port (embedded Aedes broker) */
  BROKER_PORT: parseInt(process.env.MQTT_BROKER_PORT || '1883', 10),
  /** MQTT URL the gateway publishes on (its own embedded broker by default) */
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
};
