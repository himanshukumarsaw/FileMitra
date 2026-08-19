import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ChatKnowledge } from '../models/ChatKnowledge.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/junglesathi';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  await ChatKnowledge.deleteMany({});

  const knowledge = await ChatKnowledge.create([
    // === PROJECT ===
    {
      category: 'project',
      question: 'What is JungleSathi?',
      answer: 'JungleSathi Forest Guard is an IoT-enabled wildlife protection platform for forest departments. It combines LoRa sensor networks, AI-powered alerts (gunshots, chainsaws, fence breaches), and ranger dispatch tools into one live dashboard.',
      keywords: ['junglesathi', 'what is', 'about', 'project', 'platform', 'forest guard', 'introduce', 'introduction', 'overview'],
      active: true,
      priority: 100,
    },
    {
      category: 'project',
      question: 'What problem does it solve?',
      answer: 'Protected forests suffer from poaching, illegal logging, and fire because there is no real-time visibility. JungleSathi gives rangers live alerts, sensor coverage, and dispatch tools so they can respond in minutes instead of hours.',
      keywords: ['problem', 'solve', 'why', 'purpose', 'use case', 'need', 'challenge', 'issue', 'help'],
      active: true,
      priority: 95,
    },
    {
      category: 'project',
      question: 'Is this a hackathon project?',
      answer: 'Yes, JungleSathi was built as a hackathon-ready full-stack prototype. It demonstrates IoT integration, real-time alerting, employee/admin auth, and a production-style dashboard.',
      keywords: ['hackathon', 'project', 'prototype', 'demo', 'competition', 'built', 'made', 'developed'],
      active: true,
      priority: 80,
    },
    {
      category: 'project',
      question: 'Can I see a demo?',
      answer: 'Yes. The live demo runs on http://localhost:5173. Employee login: FD-HR-0001 / Forest@2026!Secure. Admin login: FD-ADMIN-001 / Admin@2026!Secure.',
      keywords: ['demo', 'live', 'see', 'try', 'test', 'preview', 'show', 'access'],
      active: true,
      priority: 90,
    },
    {
      category: 'project',
      question: 'Who is this for?',
      answer: 'JungleSathi is built for forest departments, wildlife sanctuaries, conservation NGOs, and reserve managers who need to monitor protected areas and respond to threats quickly.',
      keywords: ['who', 'for', 'target', 'audience', 'customer', 'user', 'beneficiary', 'designed'],
      active: true,
      priority: 75,
    },
    {
      category: 'project',
      question: 'What are the key features?',
      answer: 'Key features include: real-time alerts for gunshots/chainsaws/fire, LoRa sensor network, ranger dispatch, live map, analytics dashboard, employee/admin auth, audit logs, and multi-site management.',
      keywords: ['feature', 'key', 'main', 'highlight', 'capability', 'functionality', 'what can'],
      active: true,
      priority: 85,
    },

    // === SERVICES ===
    {
      category: 'services',
      question: 'What services do you offer?',
      answer: 'We offer 6 services: Protected Area Monitoring, Sensor Network Deployment, Ranger Training & Support, Emergency Response Alerts, Multi-Site Management, and Consultancy & Audits. Contact us for details.',
      keywords: ['services', 'offerings', 'packages', 'plans', 'buy', 'purchase', 'provide', 'available'],
      active: true,
      priority: 100,
    },
    {
      category: 'services',
      question: 'Tell me about monitoring service',
      answer: 'Protected Area Monitoring provides 24×7 wildlife surveillance for sanctuaries, reserves and community forests. It includes live monitoring, mobile + web dashboard, and monthly reports.',
      keywords: ['monitoring', 'surveillance', 'watch', 'protected area', 'camera', 'tracking'],
      active: true,
      priority: 80,
    },
    {
      category: 'services',
      question: 'Tell me about sensor deployment',
      answer: 'Sensor Network Deployment covers end-to-end LoRa node installation, configuration and maintenance. Up to 50 sensor nodes with gateway setup and 1 year maintenance included.',
      keywords: ['sensor', 'deployment', 'install', 'hardware', 'lora node', 'device', 'network setup'],
      active: true,
      priority: 80,
    },
    {
      category: 'services',
      question: 'Tell me about ranger training',
      answer: 'Ranger Training & Support includes a 5-day on-ground training program, certification, and 6 months of ongoing technical support for patrol teams.',
      keywords: ['training', 'ranger', 'learn', 'support', 'workshop', 'patrol', 'team', 'staff'],
      active: true,
      priority: 75,
    },
    {
      category: 'services',
      question: 'Tell me about emergency alerts',
      answer: 'Emergency Response Alerts provide instant escalation to forest department, police and medical teams. Features include SMS + call alerts, SOS routing, and 24×7 escalation support.',
      keywords: ['emergency', 'alert', 'sos', 'response', 'urgent', 'critical', 'escalation'],
      active: true,
      priority: 75,
    },
    {
      category: 'services',
      question: 'Tell me about multi-site management',
      answer: 'Multi-Site Management offers a centralized dashboard for monitoring multiple protected areas. Features include unlimited sites, role-based access, and central analytics.',
      keywords: ['multi', 'multiple', 'site', 'management', 'centralized', 'dashboard', 'many'],
      active: true,
      priority: 70,
    },
    {
      category: 'services',
      question: 'Tell me about consultancy',
      answer: 'Consultancy & Audits provide wildlife corridor assessment, security audits and policy guidance. Includes site assessment, security audit report, and policy recommendation.',
      keywords: ['consultancy', 'audit', 'assessment', 'policy', 'advice', 'expert', 'guidance'],
      active: true,
      priority: 70,
    },
    {
      category: 'services',
      question: 'Which service is most popular?',
      answer: 'Sensor Network Deployment is our most popular package. It covers up to 50 LoRa sensor nodes with gateway setup and one year of maintenance.',
      keywords: ['popular', 'best', 'recommended', 'top', 'favorite', 'most', 'demand'],
      active: true,
      priority: 65,
    },

    // === PRICING ===
    {
      category: 'pricing',
      question: 'How much does it cost?',
      answer: 'Contact us for a custom quote based on your requirements. Pricing varies by service and scale. Email: himanshukumarsaw23@gmail.com or call +91 9113701427.',
      keywords: ['price', 'cost', 'pricing', 'rate', 'cheap', 'expensive', 'budget', 'afford', 'charge', 'fee', 'how much', 'rate', 'paisa', 'rupay', 'rupee', '₹'],
      active: true,
      priority: 100,
    },
    {
      category: 'pricing',
      question: 'Is there a free trial?',
      answer: 'We offer demo access for evaluation. Contact us at himanshukumarsaw23@gmail.com to schedule a demo or discuss trial options for your organization.',
      keywords: ['free', 'trial', 'demo', 'test', 'evaluate', 'pilot', 'sample'],
      active: true,
      priority: 60,
    },
    {
      category: 'pricing',
      question: 'What payment methods do you accept?',
      answer: 'We accept bank transfers, UPI, and major credit/debit cards. Invoices are issued on request. Contact us for payment details.',
      keywords: ['payment', 'pay', 'method', 'card', 'upi', 'bank', 'transfer', 'cash', 'transaction'],
      active: true,
      priority: 60,
    },

    // === TECHNOLOGY ===
    {
      category: 'tech',
      question: 'What technology stack is used?',
      answer: 'Frontend: React + Vite + TailwindCSS v4. Backend: Express + Mongoose + Socket.IO. IoT: MQTT broker (aedes) + LoRa gateway. Database: MongoDB. Auth: JWT + OTP + bcrypt.',
      keywords: ['tech', 'stack', 'technology', 'framework', 'react', 'node', 'mongodb', 'vite', 'built with', 'developed using'],
      active: true,
      priority: 90,
    },
    {
      category: 'tech',
      question: 'How does the sensor network work?',
      answer: 'LoRa nodes are solar-powered and transmit telemetry over long range without cell coverage. A local MQTT gateway receives data and pushes it to the backend. On-device models flag acoustic events like gunshots and chainsaws in real time.',
      keywords: ['sensor', 'lora', 'network', 'mqtt', 'gateway', 'node', 'device', 'hardware', 'how it work', 'function'],
      active: true,
      priority: 90,
    },
    {
      category: 'tech',
      question: 'Does it work without internet?',
      answer: 'Yes, the sensor network uses LoRa which works without cellular internet. Field nodes communicate over LoRa to a local gateway, which forwards data to the backend when connectivity is available.',
      keywords: ['offline', 'internet', 'connectivity', 'remote', 'no signal', 'without', 'work'],
      active: true,
      priority: 80,
    },
    {
      category: 'tech',
      question: 'What AI is used?',
      answer: 'The system uses on-device acoustic and vision models to detect gunshots, chainsaws, fence breaches, and fire. Alerts are scored and explained with confidence breakdowns.',
      keywords: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'model', 'detection', 'smart', 'intelligent'],
      active: true,
      priority: 75,
    },
    {
      category: 'tech',
      question: 'Is it secure?',
      answer: 'Yes. Authentication uses JWT + OTP + bcrypt. All passwords are hashed. Role-based access controls ensure employees and admins see only authorized data.',
      keywords: ['secure', 'security', 'safe', 'privacy', 'encryption', 'password', 'protected', 'hack'],
      active: true,
      priority: 70,
    },
    {
      category: 'tech',
      question: 'What database is used?',
      answer: 'MongoDB is used as the primary database for storing alerts, nodes, employees, audit logs, and user accounts. It provides flexible schema design for evolving data needs.',
      keywords: ['database', 'db', 'data', 'store', 'mongodb', 'mongo', 'nosql'],
      active: true,
      priority: 65,
    },

    // === DEMO ===
    {
      category: 'demo',
      question: 'How do I login as employee?',
      answer: 'Use Employee ID: FD-HR-0001 and Password: Forest@2026!Secure. The system verifies the employee ID against our master list, sends an OTP, then creates the account on first login.',
      keywords: ['login', 'employee', 'demo', 'credentials', 'signin', 'sign in', 'employee login', 'worker'],
      active: true,
      priority: 100,
    },
    {
      category: 'demo',
      question: 'How do I login as admin?',
      answer: 'Use Admin ID: FD-ADMIN-001 and Password: Admin@2026!Secure. Admins can manage employees, review registration requests, view audit logs, and oversee all alerts and nodes.',
      keywords: ['admin', 'login', 'credentials', 'demo', 'administrator', 'super admin', 'manager'],
      active: true,
      priority: 100,
    },
    {
      category: 'demo',
      question: 'How do I reset password?',
      answer: 'Click "Forgot password" on the login page. Enter your employee ID, answer the security question, verify OTP, and set a new password.',
      keywords: ['reset', 'forgot', 'password', 'change', 'recover', 'new password', 'update password'],
      active: true,
      priority: 80,
    },
    {
      category: 'demo',
      question: 'How do I register?',
      answer: 'Registration is invite-only. Forest department employees are pre-registered in our system. Contact your admin to get an employee ID and registration link.',
      keywords: ['register', 'signup', 'sign up', 'create account', 'new account', 'join', 'enroll'],
      active: true,
      priority: 75,
    },

    // === CONTACT ===
    {
      category: 'contact',
      question: 'How do I contact you?',
      answer: 'Email: himanshukumarsaw23@gmail.com. Phone: +91 9113701427. You can also use the enquiry form on this website and we will respond within 24 hours.',
      keywords: ['contact', 'email', 'phone', 'reach', 'talk', 'call', 'enquiry', 'support', 'help', 'connect'],
      active: true,
      priority: 100,
    },
    {
      category: 'contact',
      question: 'Where are you based?',
      answer: 'We are based in New Delhi, India, but we work with forest departments and conservation NGOs across the country. Remote consultancy and deployment support are available.',
      keywords: ['location', 'based', 'office', 'address', 'where', 'city', 'country', 'headquarter'],
      active: true,
      priority: 70,
    },
    {
      category: 'contact',
      question: 'What are your working hours?',
      answer: 'Our support team is available Monday to Saturday, 9 AM to 7 PM IST. For urgent matters, you can call +91 9113701427.',
      keywords: ['hours', 'time', 'open', 'close', 'available', 'working', 'schedule', 'timing'],
      active: true,
      priority: 60,
    },

    // === FEATURES ===
    {
      category: 'project',
      question: 'What types of alerts can it detect?',
      answer: 'The system can detect: human presence, gunshots, chainsaws, vehicle movement, fire, fence breaches, and animal activity. Each alert includes audio/video evidence and AI explanation.',
      keywords: ['alert', 'detect', 'type', 'kind', 'category', 'what can', 'identify', 'recognize'],
      active: true,
      priority: 85,
    },
    {
      category: 'project',
      question: 'How accurate is the detection?',
      answer: 'Detection accuracy depends on the model and sensor placement. Each alert includes a confidence score and explanation so rangers can prioritize responses.',
      keywords: ['accuracy', 'accurate', 'precision', 'reliable', 'confidence', 'false', 'correct'],
      active: true,
      priority: 70,
    },
    {
      category: 'project',
      question: 'Can I track multiple locations?',
      answer: 'Yes, the Multi-Site Management service lets you monitor unlimited protected areas from a single dashboard with role-based access control.',
      keywords: ['multiple', 'many', 'track', 'location', 'site', 'area', 'place', 'region'],
      active: true,
      priority: 70,
    },
    {
      category: 'project',
      question: 'Is there a mobile app?',
      answer: 'The dashboard is mobile-responsive and works on smartphones and tablets. Rangers can receive alerts and view the map from any browser.',
      keywords: ['mobile', 'app', 'phone', 'android', 'ios', 'smartphone', 'tablet'],
      active: true,
      priority: 65,
    },
    {
      category: 'project',
      question: 'How is data stored?',
      answer: 'All data is stored securely in MongoDB. Sensor data, alerts, and audit logs are retained for compliance and analysis. You can export reports from the dashboard.',
      keywords: ['data', 'store', 'save', 'retention', 'backup', 'database', 'history'],
      active: true,
      priority: 65,
    },

    // === SUPPORT ===
    {
      category: 'contact',
      question: 'How can I get support?',
      answer: 'You can reach our support team via email (himanshukumarsaw23@gmail.com), phone (+91 9113701427), or the chatbot. For technical issues, use the dashboard help section.',
      keywords: ['support', 'help', 'assist', 'issue', 'problem', 'troubleshoot', 'fix', 'bug'],
      active: true,
      priority: 90,
    },
    {
      category: 'contact',
      question: 'Do you provide installation support?',
      answer: 'Yes, Sensor Network Deployment includes installation, configuration, and 1 year of maintenance. Our team handles end-to-end deployment.',
      keywords: ['install', 'setup', 'deploy', 'configuration', 'implementation', 'onboard'],
      active: true,
      priority: 70,
    },
    {
      category: 'services',
      question: 'Do you offer training?',
      answer: 'Yes, the Ranger Training & Support package includes a 5-day on-ground training program, certification, and 6 months of ongoing technical support.',
      keywords: ['training', 'learn', 'ranger', 'support', 'workshop', 'course', 'education'],
      active: true,
      priority: 75,
    },

    // === HINDI ===
    {
      category: 'project',
      question: 'JungleSathi kya hai?',
      answer: 'JungleSathi Forest Guard ek IoT-enabled wildlife protection platform hai forest departments ke liye. Yeh LoRa sensor networks, AI-powered alerts, aur ranger dispatch tools combine karta hai ek live dashboard mein.',
      keywords: ['junglesathi', 'kya hai', 'project', 'platform', 'forest guard', 'kya', 'batao', 'bata', 'kripya'],
      active: true,
      priority: 100,
    },
    {
      category: 'services',
      question: 'Aapki services kya kya hain?',
      answer: 'Hum 6 services offer karte hain: Protected Area Monitoring, Sensor Network Deployment, Ranger Training & Support, Emergency Response Alerts, Multi-Site Management, aur Consultancy & Audits.',
      keywords: ['services', 'seva', 'offer', 'provide', 'available', 'kya', 'pakda', 'list'],
      active: true,
      priority: 95,
    },
    {
      category: 'contact',
      question: 'Aapse kaise sampark karein?',
      answer: 'Email: himanshukumarsaw23@gmail.com. Phone: +91 9113701427. Aap website ke enquiry form ka bhi use kar sakte hain.',
      keywords: ['contact', 'sampark', 'email', 'phone', 'reach', 'call', 'number', 'madad', 'sahayata'],
      active: true,
      priority: 100,
    },
    {
      category: 'tech',
      question: 'Yeh technology kaise kaam karta hai?',
      answer: 'LoRa nodes solar-powered hote hain aur bina cellular coverage ke long range mein data transmit karte hain. MQTT gateway data receive karke backend mein push karta hai.',
      keywords: ['technology', 'tech', 'kaise', 'kaam', 'work', 'function', 'system', 'tarik'],
      active: true,
      priority: 80,
    },
    {
      category: 'demo',
      question: 'Employee kaise login kare?',
      answer: 'Employee ID: FD-HR-0001 aur Password: Forest@2026!Secure use karein. System employee ID verify karega, OTP bhejega, aur first login par account create karega.',
      keywords: ['login', 'employee', 'signin', 'sign in', 'kaise', 'kare', 'enter', 'access'],
      active: true,
      priority: 90,
    },
    {
      category: 'demo',
      question: 'Admin kaise login kare?',
      answer: 'Admin ID: FD-ADMIN-001 aur Password: Admin@2026!Secure use karein. Admins employees manage kar sakte hain, registrations review kar sakte hain, aur audit logs dekh sakte hain.',
      keywords: ['admin', 'login', 'administrator', 'kaise', 'kare', 'enter', 'access'],
      active: true,
      priority: 90,
    },
  ]);

  console.log(`Seeded ${knowledge.length} knowledge items`);
  await mongoose.disconnect();
  console.log('Done');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
