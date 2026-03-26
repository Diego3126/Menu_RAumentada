import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'VR microservice healthy',
    data: {
      service: 'vr-service',
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
