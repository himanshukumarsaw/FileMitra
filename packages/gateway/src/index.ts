import { startBroker } from './broker.js';
import { startReceiver } from './receiver.js';
import { connectPublisher } from './mqtt-publisher.js';
import { gatewayEnv } from './config.js';

/**
 * FileMitra Forest Guard — Gateway
 *
 * Central bridge between the LoRa mesh and the cloud:
 *  1. Runs an embedded MQTT broker (no Mosquitto install required)
 *  2. Receives LoRa uplinks over HTTP (simulated concentrator)
 *  3. Decodes packets and publishes them to filemitra/gateway/* topics,
 *     which the backend consumes exactly like a production deployment.
 */
async function main(): Promise<void> {
  console.log('🌲 FileMitra Forest Guard — Gateway starting...');

  await startBroker();
  connectPublisher();
  startReceiver();

  console.log(`[gateway] Ready — broker :${gatewayEnv.BROKER_PORT}, receiver :${gatewayEnv.RECEIVER_PORT}`);
}

main().catch((err) => {
  console.error('[gateway] Fatal startup error:', err);
  process.exit(1);
});
