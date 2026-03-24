import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import healthRoutes from './routes/healthRoutes.js';
import raRoutes from './routes/raRoutes.js';

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
    service: 'AR Dishes RA Microservice',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      createRaSession: '/api/ra/session',
      detectPlane: '/api/ra/plane-detect'
    }
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/ra', raRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

export default app;
