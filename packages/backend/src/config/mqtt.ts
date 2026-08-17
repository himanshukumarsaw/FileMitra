import mqtt from 'mqtt';
import { env } from './env.js';

let client: mqtt.MqttClient | null = null;

export function connectMQTT(): void {
  try {
    client = mqtt.connect(env.MQTT_BROKER_URL, {
      clientId: `junglesathi-backend-${Date.now()}`,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      // The embedded Aedes broker speaks MQTT 3.1.1 — mqtt.js defaults to v5
      protocolVersion: 4,
    });

    client.on('connect', () => {
      console.log('[MQTT] Connected to broker');
      client!.subscribe([
        'junglesathi/gateway/alerts',
        'junglesathi/gateway/sensors',
        'junglesathi/gateway/heartbeat',
      ]);
    });

    client.on('message', async (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        // Import dynamically to avoid circular deps
        const { processAlert } = await import('../services/alertProcessor.js');

        if (topic === 'junglesathi/gateway/alerts') {
          const { emitNodePacket } = await import('../services/realtime.js');
          if (typeof payload.nodeId === 'string') emitNodePacket(payload.nodeId, 'alert');
          await processAlert(payload);
        } else if (topic === 'junglesathi/gateway/sensors') {
          const { SensorData } = await import('../models/SensorData.js');
          const { emitNodePacket } = await import('../services/realtime.js');
          if (typeof payload.nodeId === 'string') emitNodePacket(payload.nodeId, 'sensor');
          await SensorData.create(payload);
          // Multi-sensor fire fusion re-evaluates on every environmental reading
          if (typeof payload.nodeId === 'string') {
            const { checkFireFusion } = await import('../services/fireFusion.js');
            void checkFireFusion(payload.nodeId).catch((e) => console.error('[fire-fusion] failed:', e));
          }
        } else if (topic === 'junglesathi/gateway/heartbeat') {
          const { Node } = await import('../models/Node.js');
          const { emitNodeHeartbeat, emitNodePacket } = await import('../services/realtime.js');
          if (typeof payload.nodeId === 'string') emitNodePacket(payload.nodeId, 'heartbeat');
          const update: Record<string, unknown> = {
            lastSeen: new Date(),
            batteryLevel: payload.batteryLevel,
            signalStrength: payload.signalStrength,
            status: 'online',
          };
          // Intelligent power management + solar telemetry (spec #19/#20)
          if (payload.powerMode) update.powerMode = payload.powerMode;
          if (typeof payload.solarInputW === 'number') update.solarInputW = payload.solarInputW;
          const node = await Node.findByIdAndUpdate(payload.nodeId, update, { new: true });
          if (node) {
            emitNodeHeartbeat(node._id.toString(), {
              batteryLevel: node.batteryLevel,
              signalStrength: node.signalStrength,
              timestamp: node.lastSeen,
            });
          }
        }
      } catch (err) {
        console.error('[MQTT] Message processing error:', err);
      }
    });

    client.on('error', (err) => {
      console.warn('[MQTT] Connection error:', err.message);
    });

    client.on('offline', () => {
      console.warn('[MQTT] Broker offline - alerts will only come via REST API');
    });
  } catch (err) {
    console.warn('[MQTT] Failed to connect (non-fatal):', (err as Error).message);
  }
}

export function getMQTTClient(): mqtt.MqttClient | null {
  return client;
}
