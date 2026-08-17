import mqtt from 'mqtt';
import { gatewayEnv } from './config.js';

let client: mqtt.MqttClient | null = null;
let connected = false;

/** Store-and-forward queue used while the broker is unreachable. */
const queue: Array<{ topic: string; message: string }> = [];
const MAX_QUEUE = 100;

/** Connect the gateway publisher to the MQTT broker (embedded by default). */
export function connectPublisher(): void {
  client = mqtt.connect(gatewayEnv.MQTT_BROKER_URL, {
    clientId: `junglesathi-gateway-${Date.now()}`,
    reconnectPeriod: 3000,
    connectTimeout: 5000,
    // The embedded Aedes broker speaks MQTT 3.1.1 — mqtt.js defaults to v5
    protocolVersion: 4,
  });

  client.on('connect', () => {
    connected = true;
    console.log('[gateway] Publisher connected to MQTT broker');

    // Drain store-and-forward queue
    while (queue.length > 0) {
      const item = queue.shift()!;
      client!.publish(item.topic, item.message);
      console.log(`[gateway] Forwarded queued message → ${item.topic}`);
    }
  });

  client.on('offline', () => {
    connected = false;
    console.warn('[gateway] Publisher offline — buffering messages');
  });

  client.on('error', (err) => {
    console.warn('[gateway] Publisher error:', err.message);
  });
}

/**
 * Publish a decoded packet payload to the broker.
 * Buffers to the store-and-forward queue when disconnected.
 */
export function publishPacket(topic: string, data: unknown): void {
  const message = JSON.stringify(data);

  if (connected && client) {
    client.publish(topic, message);
    return;
  }

  if (queue.length >= MAX_QUEUE) {
    queue.shift(); // drop oldest — LoRa mesh tolerates loss, keeps memory bounded
    console.warn('[gateway] Store-and-forward queue full — dropped oldest packet');
  }
  queue.push({ topic, message });
}
