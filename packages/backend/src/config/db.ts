import mongoose from 'mongoose';
import { env } from './env.js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Connects to MongoDB with retry logic (exponential backoff).
 * Logs connection events and throws after exhausting retries.
 */
export async function connectDB(): Promise<void> {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(env.MONGODB_URI);
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
      });

      return;
    } catch (error) {
      attempt++;
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.error(
        `MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`,
        error instanceof Error ? error.message : error
      );

      if (attempt >= MAX_RETRIES) {
        throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts`);
      }

      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
