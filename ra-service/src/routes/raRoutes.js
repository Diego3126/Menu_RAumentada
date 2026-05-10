import { Router } from 'express';

const router = Router();

const toBackendOrigin = (backendApiUrl) => backendApiUrl.replace(/\/api\/?$/, '');

const toAbsoluteModelUrl = (modelPath, backendOrigin) => {
  if (!modelPath) return '';
  if (/^https?:\/\//i.test(modelPath)) {
    return encodeURI(modelPath);
  }

  const normalizedPath = modelPath.startsWith('/') ? modelPath : `/${modelPath}`;

  if (!backendOrigin || /(^|\/\/)(backend|localhost)(:|\/|$)/i.test(backendOrigin)) {
    return encodeURI(normalizedPath);
  }

  return encodeURI(`${backendOrigin}${normalizedPath}`);
};

router.post('/session', async (req, res) => {
  try {
    const { dishId, fallbackModelPath } = req.body || {};

    if (!dishId && !fallbackModelPath) {
      return res.status(400).json({
        success: false,
        message: 'dishId o fallbackModelPath es requerido'
      });
    }

    const backendApiUrl = process.env.BACKEND_API_URL || 'http://backend:5000/api';
    const backendOrigin = process.env.BACKEND_ORIGIN || toBackendOrigin(backendApiUrl);

    let dish = null;

    if (dishId) {
      const dishResponse = await fetch(`${backendApiUrl}/platos/${encodeURIComponent(dishId)}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (!dishResponse.ok) {
        return res.status(404).json({
          success: false,
          message: 'No se encontro el plato solicitado'
        });
      }

      const dishData = await dishResponse.json();
      dish = dishData.plato;
    }

    const modelPath = dish?.model_path || fallbackModelPath;

    if (!modelPath) {
      return res.status(422).json({
        success: false,
        message: 'No se pudo resolver un modelPath para la sesion RA'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Sesion RA preparada',
      data: {
        dishId: dish?.id || dishId || null,
        dishName: dish?.name || null,
        modelPath,
        modelUrl: toAbsoluteModelUrl(modelPath, backendOrigin),
        scale: dish?.scale || 1,
        rotation: dish?.rotation || { x: 0, y: 0, z: 0 }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error preparando la sesion RA',
      error: error?.message || String(error)
    });
  }
});

router.post('/plane-detect', async (req, res) => {
  try {
    const { imageBase64 } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'imageBase64 es requerido'
      });
    }

    const aiSurfaceApiUrl = process.env.AI_SURFACE_API_URL || 'http://ai-surface-service:5200/api/ai/plane/detect';
    const aiResponse = await fetch(aiSurfaceApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ imageBase64 })
    });

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      return res.status(500).json({
        success: false,
        message: 'Servicio IA no disponible temporalmente',
        error: aiData?.error || `HTTP ${aiResponse.status}`
      });
    }

    if (!aiData?.success) {
      return res.status(200).json({
        success: false,
        message: aiData?.message || 'Superficie no detectada en este frame',
        error: aiData?.error || null,
        data: null
      });
    }

    return res.status(200).json(aiData);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error detectando superficie plana por IA',
      error: error?.message || String(error)
    });
  }
});

export default router;