import mongoose from 'mongoose';
import { seedEmployees } from './seedEmployees.js';

export async function runSeed(): Promise<void> {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/junglesathi');
  await seedEmployees();
  await mongoose.disconnect();
  console.log('Seeding complete');
}
