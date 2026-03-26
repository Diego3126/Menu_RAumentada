import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import healthRoutes from './routes/healthRoutes.js';
import vrRoutes from './routes/vrRoutes.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

app.use(express.json({ limit: '5mb' }));

app.get('/api', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'AR Dishes VR Microservice',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      createVrSession: '/api/vr/session'
    }
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/vr', vrRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

export default app;
