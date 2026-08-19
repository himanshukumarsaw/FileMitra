import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { HomeNews } from '../models/HomeNews.js';
import { HomeService } from '../models/HomeService.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/junglesathi';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  await HomeNews.deleteMany({});
  await HomeService.deleteMany({});

  const news = await HomeNews.create([
    {
      tag: 'Wildlife',
      title: 'Elephant herd spotted near Buffer Zone-3 boundary',
      time: '12 min ago',
      icon: 'Footprints',
      active: true,
    },
    {
      tag: 'Alert',
      title: 'Gunshot detected by Node Watchtower Alpha',
      time: '34 min ago',
      icon: 'Siren',
      active: true,
    },
    {
      tag: 'Environment',
      title: 'Dry spell continues — fire risk raised to HIGH',
      time: '1 hr ago',
      icon: 'Flame',
      active: true,
    },
    {
      tag: 'Patrol',
      title: 'Ranger team Alpha cleared Sector 7 trail',
      time: '2 hrs ago',
      icon: 'Binoculars',
      active: true,
    },
  ]);

  const services = await HomeService.create([
    {
      icon: 'Shield',
      title: 'Protected Area Monitoring',
      description: '24×7 wildlife surveillance for sanctuaries, reserves and community forests.',
      price: '₹19,999/yr',
      popular: false,
      features: ['24×7 live monitoring', 'Mobile + web dashboard', 'Monthly report'],
      active: true,
    },
    {
      icon: 'Wifi',
      title: 'Sensor Network Deployment',
      description: 'End-to-end LoRa node installation, configuration and maintenance.',
      price: '₹24,999/yr',
      popular: true,
      features: ['Up to 50 sensor nodes', 'LoRa gateway setup', '1 year maintenance'],
      active: true,
    },
    {
      icon: 'Users',
      title: 'Ranger Training & Support',
      description: 'Hands-on training for patrol teams plus ongoing technical support.',
      price: '₹14,999/yr',
      popular: false,
      features: ['5-day on-ground training', 'Certification', '6 months support'],
      active: true,
    },
    {
      icon: 'BellRing',
      title: 'Emergency Response Alerts',
      description: 'Instant escalation to forest department, police and medical teams.',
      price: '₹7,999/yr',
      popular: false,
      features: ['SMS + call alerts', 'SOS routing', '24×7 escalation'],
      active: true,
    },
    {
      icon: 'Globe2',
      title: 'Multi-Site Management',
      description: 'Centralised dashboard for monitoring multiple protected areas.',
      price: '₹34,999/yr',
      popular: false,
      features: ['Unlimited sites', 'Role-based access', 'Central analytics'],
      active: true,
    },
    {
      icon: 'CreditCard',
      title: 'Consultancy & Audits',
      description: 'Wildlife corridor assessment, security audits and policy guidance.',
      price: '₹29,999/project',
      popular: false,
      features: ['Site assessment', 'Security audit report', 'Policy recommendation'],
      active: true,
    },
  ]);

  console.log(`Seeded ${news.length} news items`);
  console.log(`Seeded ${services.length} services`);
  await mongoose.disconnect();
  console.log('Done');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
