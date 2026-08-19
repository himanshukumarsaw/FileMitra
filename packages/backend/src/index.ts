import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { connectMQTT } from './config/mqtt.js';
import authRoutes from './routes/auth.js';
import employeeAuthRoutes from './routes/employeeAuth.js';
import adminRoutes from './routes/admin.js';
import alertRoutes from './routes/alerts.js';
import nodeRoutes from './routes/nodes.js';
import sensorDataRoutes from './routes/sensorData.js';
import analyticsRoutes from './routes/analytics.js';
import nodeIngestRoutes from './routes/nodeIngest.js';
import dispatchRoutes from './routes/dispatches.js';
import homeRoutes from './routes/home.js';
import chatRoutes from './routes/chat.js';
import acousticRoutes from './routes/acoustic.js';
import { errorHandler } from './middleware/error.js';
import { initRealtime } from './services/realtime.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://192.168.137.1:5173', 'http://10.244.73.18:5173'],
    methods: ['GET', 'POST'],
  },
});

// Initialise realtime service with Socket.IO
initRealtime(io);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000', 'http://192.168.137.1:5173', 'http://10.244.73.18:5173', '*'] }));
// 25mb — nodes upload base64 evidence (audio clips / photos) over REST
app.use(express.json({ limit: '25mb' }));

// Evidence files captured by field nodes (audio clips, photos)
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'JungleSathi Backend',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/employee', employeeAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/sensor-data', sensorDataRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/node-ingest', nodeIngestRoutes);
app.use('/api/dispatches', dispatchRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/acoustic', acousticRoutes);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Make io accessible to controllers
app.set('io', io);

// Global error handler (must be registered after routes)
app.use(errorHandler);

// Start server
async function start() {
  try {
    await connectDB();
    connectMQTT();
    httpServer.listen(env.PORT, env.HOST, () => {
      console.log(`🌲 JungleSathi Backend running on port ${env.PORT}`);
      console.log(`   Health: http://${env.HOST}:${env.PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { io };
