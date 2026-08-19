import { z } from 'zod';

const envSchema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.string().default('4000').transform(Number),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/junglesathi'),
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  MQTT_BROKER_URL: z.string().default('mqtt://localhost:1883'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ML_SERVICE_URL: z.string().default('http://localhost:8000'),
  ML_CONFIDENCE_THRESHOLD: z.string().default('0.85').transform(Number),
  FREEAI_API_KEY: z.string().default(''),
  FREEAI_API_BASE_URL: z.string().default('https://api.free.ai/v1'),
  AI_MODEL: z.string().default('qwen25-vl'),
  AI_FALLBACK_ENABLED: z.string().default('true'),
});

export const env = envSchema.parse(process.env);
