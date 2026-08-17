import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4000').transform(Number),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/junglesathi'),
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  MQTT_BROKER_URL: z.string().default('mqtt://localhost:1883'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ML_SERVICE_URL: z.string().default('http://localhost:8000'),
});

export const env = envSchema.parse(process.env);
