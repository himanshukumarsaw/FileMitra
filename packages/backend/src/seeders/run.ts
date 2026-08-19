import { runSeed } from './index.js';
runSeed().catch((err: any) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
