import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { gatewayEnv } from './config.js';
import { isLoRaPacket, decodePacket, topicForKind } from './decoder.js';
import { publishPacket } from './mqtt-publisher.js';

let rxCount = 0;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

/**
 * HTTP receiver standing in for the LoRa concentrator / serial HAT.
 * Nodes (mobile app, firmware-sim) POST LoRaPacket envelopes to /lora/uplink;
 * the gateway decodes them and republishes over MQTT, exactly like a real
 * RPi gateway bridging radio to cloud.
 */
export function startReceiver(): void {
  const server = createServer(async (req, res) => {
    // CORS preflight (mobile node pages may call cross-origin)
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, { status: 'ok', service: 'JungleSathi Gateway', packetsReceived: rxCount });
      return;
    }

    if (req.method === 'POST' && req.url === '/lora/uplink') {
      try {
        const body = await readBody(req);
        const packet = JSON.parse(body);

        if (!isLoRaPacket(packet)) {
          sendJson(res, 400, { error: 'Invalid LoRa packet envelope' });
          return;
        }

        const decoded = decodePacket(packet);
        rxCount++;

        // Demo-friendly radio log — what judges see in the gateway console
        console.log(
          `[gateway] 📡 RX ${decoded.kind.toUpperCase()} from ${decoded.nodeId} ` +
            `(seq=${decoded.seq}, RSSI=${decoded.rssi} dBm, SF9/125kHz)`
        );

        // Ensure nodeId is present in the payload for downstream consumers
        const data = { ...decoded.data, nodeId: decoded.data.nodeId ?? decoded.nodeId };

        publishPacket(topicForKind(decoded.kind), data);
        sendJson(res, 200, { ok: true, topic: topicForKind(decoded.kind), seq: decoded.seq });
      } catch (err) {
        sendJson(res, 400, { error: 'Malformed uplink', detail: (err as Error).message });
      }
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  });

  server.listen(gatewayEnv.RECEIVER_PORT, () => {
    console.log(`[gateway] LoRa uplink receiver listening on http://localhost:${gatewayEnv.RECEIVER_PORT}/lora/uplink`);
  });
}
