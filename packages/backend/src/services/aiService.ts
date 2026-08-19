import { env } from '../config/env.js';

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export interface AIChatRequest {
  message: string;
  imageBase64?: string;
  history?: AIChatMessage[];
}

export interface AIChatResponse {
  reply: string;
  model: string;
  tokensUsed?: number;
}

// Comprehensive FileMitra Domain Knowledge Prompt
const SYSTEM_PROMPT = `You are "FileMitra AI" (also known as JungleBhai), the expert AI assistant for "FileMitra" — a full-stack, AI-powered wildlife monitoring and anti-poaching system.

System Context & Architecture:
- Frontend: React + Vite + TypeScript, Tailwind CSS, shadcn/ui, Zustand state, React Query, and React-Leaflet maps with poaching risk heatmaps.
- Backend: Express 5 + TypeScript, MongoDB (Mongoose), Socket.IO for real-time alert broadcasts, Mosquitto MQTT for IoT telemetry.
- Edge Hardware: ESP32-S3 microcontroller nodes with PIR motion sensors, OV2640 camera, I2S microphone (audio events), solar charging management, and SX1276 LoRa transceivers.
- LoRa Gateway & Sim: Raspberry Pi LoRa gateway forwarding packets via MQTT, plus a TypeScript firmware simulator for hardware-free demos.
- ML & Vision Pipeline: Edge TFLite INT8 models on ESP32, paired with a Python FastAPI microservice using MobileNetV2 (person, animal, vehicle detection), YAMNet (chainsaw, gunshot, engine sound classification), and SHAP-based Explainable AI (XAI).
- Alert Pipeline: Tiered risk scoring (Low, Amber, Critical) driven by spatial-temporal factors, time-of-day, and multi-sensor confidence.

Guidelines:
- Language: Automatically match the user's language (fluent English or Hindi).
- Responses: Technical, precise, authoritative, yet accessible for forest officers and operators.
- Support & Business: For specific operational inquiries, demo credentials, or escalations, direct users to support@filemitra.org.
- Vision/Camera Trap: When analyzing images, evaluate species, human intrusions, vehicle presence, or anomaly patterns in forest contexts.

Knowledge Base:
- Common threats: Poaching (gunshots, chainsaw sounds), illegal logging, human encroachment, forest fires, animal distress signals
- Risk assessment factors: Time of day (2-5 AM is highest risk), weather conditions (dry season = higher fire risk), proximity to human settlements
- Prevention strategies: Increase patrol frequency in high-risk zones during peak hours, maintain 100% node coverage in critical areas, calibrate AI thresholds seasonally
- Maintenance guidance: Sensor nodes require battery checks every 2 weeks, camera calibration every 3 months, audio classification model retraining every 6 months
- Wildlife patterns: Elephant movement increases near water sources during summer, tiger activity peaks at dawn/dusk, deer migration follows seasonal patterns`;

function formatBase64DataUrl(base64: string): string {
  if (base64.startsWith('data:image/')) {
    return base64;
  }
  return `data:image/jpeg;base64,${base64}`;
}

function sanitizeReply(reply: string, model: string): string {
  const lower = reply.toLowerCase();
  
  // Handle image input errors gracefully
  if (
    lower.includes('cannot read') || 
    lower.includes('does not support image input') || 
    lower.startsWith('error:') ||
    lower.includes('no image provided') ||
    lower.includes('unsupported format')
  ) {
    return `I received your message and image, but I'm unable to process the image data right now. Please try rephrasing your question as text or sending a different image format (JPEG/PNG).`;
  }
  
  return reply;
}

function buildMessages(req: AIChatRequest, supportsVision: boolean): AIChatMessage[] {
  const messages: AIChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Attach recent conversation history (last 10 turns)
  if (req.history && req.history.length > 0) {
    messages.push(...req.history.slice(-10));
  }

  // Handle multimodal / vision payload
  if (req.imageBase64 && supportsVision) {
    const dataUrl = formatBase64DataUrl(req.imageBase64);
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: req.message || 'Analyze this camera trap image for wildlife species, human activity, or forest threats.',
        },
        {
          type: 'image_url',
          image_url: { url: dataUrl },
        },
      ],
    });
  } else if (req.imageBase64 && !supportsVision) {
    messages.push({
      role: 'user',
      content: `${req.message}\n\n[System Note: Image received, but vision analysis is disabled on current provider. Answering based on text and image description.]`,
    });
  } else {
    messages.push({ role: 'user', content: req.message });
  }

  return messages;
}

export async function chatWithAI(req: AIChatRequest): Promise<AIChatResponse> {
  const useBlockRun = !env.FREEAI_API_KEY;
  const baseURL = useBlockRun ? 'https://blockrun.ai/api/v1' : env.FREEAI_API_BASE_URL;
  const apiKey = useBlockRun ? 'not-needed' : env.FREEAI_API_KEY;
  const model = useBlockRun ? 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning' : env.AI_MODEL;
  const url = `${baseURL}/chat/completions`;

  const supportsVision = !useBlockRun;
  const messages = buildMessages(req, supportsVision);

  const body = {
    model,
    messages,
    max_tokens: 2048,
    temperature: 0.7,
    top_p: 0.95,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: { message: { content: string } }[];
      usage?: { total_tokens?: number };
    };

    const reply = data.choices?.[0]?.message?.content?.trim() || '';
    if (!reply) {
      throw new Error('Empty response from AI model');
    }

    return {
      reply: sanitizeReply(reply, model),
      model,
      tokensUsed: data.usage?.total_tokens,
    };
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === 'AbortError') {
      throw new Error('AI request timed out');
    }
    throw err;
  }
}
