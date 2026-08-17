import { transmit } from './lora.js';
import { simNodes, randomNode, type SimNode } from './nodes.js';

type ScenarioKind = 'gunshot' | 'chainsaw' | 'fire' | 'wildlife' | 'tamper';

/** Scripted demo scenarios rotated to keep the live map interesting */
const SCENARIOS: ScenarioKind[] = ['gunshot', 'chainsaw', 'fire', 'wildlife', 'tamper'];

const SPECIES = ['Elephant', 'Tiger', 'Sambar Deer', 'Peafowl', 'Gaur'];

let scenarioIndex = 0;

/** Pick an epicenter between two registered nodes (or jitter around one). */
function pickSpots(first: SimNode, second: SimNode | null) {
  const anchor = second
    ? { lat: (first.lat + second.lat) / 2, lng: (first.lng + second.lng) / 2 }
    : { lat: first.lat, lng: first.lng };
  const epicenter = {
    lat: anchor.lat + (Math.random() - 0.5) * 0.03,
    lng: anchor.lng + (Math.random() - 0.5) * 0.03,
  };
  // Each node "hears" the event slightly offset from the epicenter (~1 km)
  const spot = () => ({
    lat: epicenter.lat + (Math.random() - 0.5) * 0.02,
    lng: epicenter.lng + (Math.random() - 0.5) * 0.02,
  });
  return { epicenter, spot };
}

function secondReporter(first: SimNode): SimNode | null {
  const registered = simNodes.filter((n) => n.id !== null);
  if (registered.length < 2) return null;
  return registered.filter((n) => n.id !== first.id)[0] ?? null;
}

/** Camera trigger — captured snapshot attached to confirmed threats (spec #12). */
function snapshotUrl(kind: string): string {
  return `https://picsum.photos/seed/${kind}-${Date.now()}/400/300`;
}

/** Fire the two paired acoustic alerts (mesh corroboration demo). */
async function pairedAlert(
  first: SimNode,
  second: SimNode | null,
  label: string,
  build: (nodeId: string, lat: number, lng: number) => Record<string, unknown>
): Promise<void> {
  const { spot } = pickSpots(first, second);
  const firstSpot = spot();
  first.powerMode = 'critical';
  await transmit(first.id!, 'alert', build(first.id!, firstSpot.lat, firstSpot.lng));

  if (second) {
    // Sound propagation + on-node processing delay for the second reporter
    const delayMs = 2000 + Math.random() * 2500;
    setTimeout(() => {
      const secondSpot = spot();
      second.powerMode = 'suspicious';
      console.log(`[sim] 🔊 Second node confirms: ${label}`);
      void transmit(second.id!, 'alert', build(second.id!, secondSpot.lat, secondSpot.lng));
    }, delayMs);
  }
}

/**
 * Fire the next scripted scenario.
 *
 * Rotates: gunshot / chainsaw / fire / wildlife / tamper.
 * Fire also primes the environmental sensors so the backend's multi-sensor
 * fusion engine raises the fire alert from smoke+temperature+humidity.
 */
export async function runNextScenario(): Promise<void> {
  const kind = SCENARIOS[scenarioIndex % SCENARIOS.length];
  scenarioIndex++;

  const registered = simNodes.filter((n) => n.id !== null);
  if (registered.length === 0) return;

  const first = randomNode();
  const second = secondReporter(first);

  switch (kind) {
    case 'gunshot': {
      console.log('[sim] 🎬 Scenario: Gunshot detected — possible poaching');
      await pairedAlert(first, second, 'Gunshot detected', (nodeId, lat, lng) => ({
        type: 'human',
        soundType: 'gunshot',
        confidence: 0.86 + Math.random() * 0.12,
        location: { lat, lng },
        nodeId,
        imageUrl: snapshotUrl('gunshot'),
        description: 'Acoustic gunshot signature detected by edge AI node',
      }));
      break;
    }

    case 'chainsaw': {
      console.log('[sim] 🎬 Scenario: Chainsaw activity — possible illegal logging');
      await pairedAlert(first, second, 'Chainsaw activity', (nodeId, lat, lng) => ({
        type: 'human',
        soundType: 'chainsaw',
        confidence: 0.82 + Math.random() * 0.14,
        location: { lat, lng },
        nodeId,
        imageUrl: snapshotUrl('chainsaw'),
        description: 'Sustained chainsaw harmonic signature classified on-node',
      }));
      break;
    }

    case 'fire': {
      console.log('[sim] 🎬 Scenario: Fire — environmental sensors + acoustic crackle');
      // Prime the multi-sensor fusion engine: smoke spike + heat + dry air
      first.powerMode = 'critical';
      await transmit(first.id!, 'sensor', {
        nodeId: first.id, type: 'smoke', value: 52 + Math.round(Math.random() * 10), unit: '%',
        timestamp: new Date().toISOString(),
      });
      await transmit(first.id!, 'sensor', {
        nodeId: first.id, type: 'temperature', value: 43 + Math.round(Math.random() * 4), unit: 'C',
        timestamp: new Date().toISOString(),
      });
      await transmit(first.id!, 'sensor', {
        nodeId: first.id, type: 'humidity', value: 22 + Math.round(Math.random() * 10), unit: '%',
        timestamp: new Date().toISOString(),
      });
      // Then the acoustic confirmation arrives shortly after
      setTimeout(() => {
        void pairedAlert(first, second, 'Fire crackle signature', (nodeId, lat, lng) => ({
          type: 'fire',
          soundType: 'fire_crackle',
          confidence: 0.78 + Math.random() * 0.15,
          location: { lat, lng },
          nodeId,
          imageUrl: snapshotUrl('fire'),
          description: 'Broadband crackle acoustic pattern consistent with vegetation fire',
        }));
      }, 1500);
      break;
    }

    case 'wildlife': {
      const species = SPECIES[Math.floor(Math.random() * SPECIES.length)];
      console.log(`[sim] 🎬 Scenario: Wildlife activity — ${species} call`);
      const { spot } = pickSpots(first, second);
      const firstSpot = spot();
      await transmit(first.id!, 'alert', {
        type: 'animal',
        soundType: 'animal_call',
        species,
        confidence: 0.74 + Math.random() * 0.16,
        location: firstSpot,
        nodeId: first.id,
        description: `${species} vocalisation classified by edge AI`,
      });
      // Sometimes human activity overlaps → backend raises a conflict warning
      if (second && Math.random() < 0.6) {
        const delayMs = 3500 + Math.random() * 2500;
        setTimeout(() => {
          const secondSpot = spot();
          console.log('[sim] 👤 Human voices detected near wildlife activity');
          void transmit(second.id!, 'alert', {
            type: 'human',
            soundType: 'unknown',
            confidence: 0.68 + Math.random() * 0.15,
            location: secondSpot,
            nodeId: second.id,
            description: 'Human voices detected near recent wildlife activity',
          });
        }, delayMs);
      }
      break;
    }

    case 'tamper': {
      console.log('[sim] 🎬 Scenario: Node tampering — motion/orientation change');
      first.powerMode = 'critical';
      await transmit(first.id!, 'alert', {
        type: 'human',
        soundType: 'tamper',
        confidence: 0.9 + Math.random() * 0.08,
        location: { lat: first.lat, lng: first.lng },
        nodeId: first.id,
        description: `Node enclosure moved — accelerometer/orientation trigger on ${first.name}`,
      });
      break;
    }
  }
}
