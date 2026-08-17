import { createServer } from 'net';
import { Aedes, type Client } from 'aedes';
import { gatewayEnv } from './config.js';

/**
 * Embedded MQTT broker (Aedes) so the Forest Guard stack runs without
 * installing Mosquitto. The backend subscribes to filemitra/gateway/*
 * topics on this broker; the gateway publisher connects to it too.
 */
export function startBroker(): Promise<Aedes> {
  return new Promise((resolve, reject) => {
    const aedes = new Aedes();
    const server = createServer((conn) => aedes.handle(conn));
    // aedes v1 requires listen() before serving — it initializes persistence
    // and flips the broker out of its initial `closed` state.

    server.on('error', (err) => {
      reject(err);
    });

    aedes.listen().then(() => {
      server.listen(gatewayEnv.BROKER_PORT, () => {
        console.log(`[gateway] MQTT broker (Aedes) listening on port ${gatewayEnv.BROKER_PORT}`);
        resolve(aedes);
      });
    }).catch(reject);

    aedes.on('client', (client: Client) => {
      console.log(`[gateway] MQTT client connected: ${client.id}`);
    });
  });
}
