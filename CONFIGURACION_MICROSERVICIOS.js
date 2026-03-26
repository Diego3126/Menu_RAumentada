// ============================================================
// CONFIGURACIÓN CORS PARA MICROSERVICIOS RA y VR
// ============================================================

/**
 * Agrega esto en ra-service/server.js y vr-service/server.js
 * para permitir requests desde el frontend
 */

// ============================================================
// RA-SERVICE - ra-service/server.js
// ============================================================

import express from 'express';
import cors from 'cors';

const app = express();

// ✅ CORS Configuración Correcta
const corsOptions = {
    origin: [
        'http://localhost:8000',      // Local development
        'http://localhost:3000',      // Backend
        'http://127.0.0.1:8000',      // Alternativa localhost
        'http://tu-dominio.com',      // Producción
        'https://tu-dominio.com'      // Producción HTTPS
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// ============================================================
// Endpoints RA-Service
// ============================================================

/**
 * GET /api/ra/health
 * Health check del servicio
 */
app.get('/api/ra/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'ra-service',
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/ra/session
 * Crear sesión AR con modelo 3D
 * 
 * Request:
 * {
 *   "dishId": "1",
 *   "fallbackModelPath": "/models/lasana.glb"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "dishId": "1",
 *     "dishName": "Lasaña",
 *     "modelUrl": "http://localhost:5300/models/lasana.glb",
 *     "scale": 1,
 *     "rotation": { x: 0, y: 0, z: 0 }
 *   }
 * }
 */
app.post('/api/ra/session', async (req, res) => {
    try {
        const { dishId, fallbackModelPath } = req.body;

        // Validar entrada
        if (!dishId) {
            return res.status(400).json({ 
                success: false, 
                error: 'dishId es requerido' 
            });
        }

        // Obtener info del plato desde backend
        let dishData = {
            id: dishId,
            nombre: 'Plato ' + dishId,
            descripcion: 'Plato delicioso'
        };

        // Intentar obtener desde DB o API
        try {
            const response = await fetch(`http://localhost:3000/api/platos/${dishId}`);
            if (response.ok) {
                dishData = await response.json();
            }
        } catch (e) {
            console.warn('No se pudo obtener datos de DB:', e.message);
        }

        // Ruta del modelo
        const modelPath = fallbackModelPath || `/models/${dishId}.glb`;
        const modelUrl = `http://localhost:5300${modelPath}`;

        // Respuesta exitosa
        res.json({
            success: true,
            message: 'Sesión RA preparada',
            data: {
                dishId,
                dishName: dishData.nombre,
                modelPath,
                modelUrl,
                scale: 1,
                rotation: { x: 0, y: 0, z: 0 }
            }
        });

    } catch (error) {
        console.error('Error en POST /api/ra/session:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/ra/plane-detect
 * Detectar planos en imagen para colocar modelo AR
 * 
 * Request:
 * {
 *   "imageBase64": "data:image/jpeg;base64,...",
 *   "dishId": "1"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "planes": [
 *     { x: 100, y: 200, width: 300, height: 400, normal: [0,1,0] }
 *   ]
 * }
 */
app.post('/api/ra/plane-detect', async (req, res) => {
    try {
        const { imageBase64, dishId } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ 
                success: false, 
                error: 'imageBase64 es requerido' 
            });
        }

        // INTEGRACIÓN CON IA PARA DETECCIÓN DE PLANOS
        // Ejemplo: Usar API de IA externa
        // const aiResponse = await detectPlanesWithAI(imageBase64);

        // Respuesta simulada (implementar con IA real)
        const planes = [
            {
                id: 1,
                x: 50,
                y: 100,
                width: 400,
                height: 300,
                normal: [0, 1, 0],  // Normal vector (apunta hacia arriba)
                confidence: 0.95
            }
        ];

        res.json({
            success: true,
            message: 'Planos detectados',
            data: {
                dishId,
                planesDetected: planes.length,
                planes
            }
        });

    } catch (error) {
        console.error('Error en POST /api/ra/plane-detect:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

const PORT = process.env.PORT || 5300;
app.listen(PORT, () => {
    console.log(`✅ RA-Service escuchando en puerto ${PORT}`);
});

// ============================================================
// VR-SERVICE - vr-service/server.js (Estructura similar)
// ============================================================

/*
Similar a RA-Service pero con:
- Port: 5100 (en lugar de 5300)
- Endpoints: /api/vr/health, /api/vr/session, /api/vr/plane-detect
- Modelos optimizados para VR (menos polígonos)
*/

// ============================================================
// INTEGRACIÓN CON FRONTEND
// ============================================================

/**
 * En 3d-viewer.js, el método loadModel automáticamente:
 * 
 * 1. Intenta cargar desde RA-Service:
 *    POST http://localhost:5300/api/ra/session
 * 
 * 2. Si falla, usa fallbackModelPath local:
 *    /models/lasana.glb
 * 
 * 3. Carga con GLTFLoader
 * 
 * 4. Renderiza en Three.js
 */

/**
 * Flujo Completo:
 * 
 * Usuario click en plato
 *   ↓
 * openAR3DViewer(plato) en script.js
 *   ↓
 * viewer3D.loadModel('/models/lasana.glb', {...})
 *   ↓
 * POST http://localhost:5300/api/ra/session
 *   ↓
 * Respuesta JSON con modelUrl
 *   ↓
 * GLTFLoader carga modelo desde URL
 *   ↓
 * Scene.add(model) + Render
 *   ↓
 * Usuario ve modelo 3D rotable en modal
 */

// ============================================================
// VARIABLES DE ENTORNO NECESARIAS
// ============================================================

/**
 * En .env (backend, ra-service, vr-service):
 * 
 * BACKEND_PORT=3000
 * RA_SERVICE_PORT=5300
 * VR_SERVICE_PORT=5100
 * 
 * # Para detección de planos con IA (opcional)
 * AI_SURFACE_API_URL=https://api.ejemplo.com/detect
 * AI_SURFACE_API_KEY=sk-xxxxx
 * 
 * # Base de datos
 * DATABASE_URL=postgresql://user:password@host/db
 * 
 * # CORS
 * ALLOWED_ORIGINS=http://localhost:8000,http://localhost:3000
 */

// ============================================================
// DOCKER COMPOSE (si usas Docker)
// ============================================================

/**
 * docker-compose.yml:
 * 
 * version: '3.8'
 * services:
 *   backend:
 *     build: ./backend
 *     ports:
 *       - "3000:3000"
 *     environment:
 *       - DATABASE_URL=postgresql://user:pass@db:5432/menu
 *     depends_on:
 *       - db
 * 
 *   ra-service:
 *     build: ./ra-service
 *     ports:
 *       - "5300:5300"
 *     environment:
 *       - BACKEND_URL=http://backend:3000
 *       - AI_SURFACE_API_URL=${AI_SURFACE_API_URL}
 * 
 *   vr-service:
 *     build: ./vr-service
 *     ports:
 *       - "5100:5100"
 *     environment:
 *       - BACKEND_URL=http://backend:3000
 * 
 *   db:
 *     image: postgres:15
 *     environment:
 *       POSTGRES_PASSWORD: password
 *       POSTGRES_DB: menu
 *     volumes:
 *       - postgres_data:/var/lib/postgresql/data
 * 
 * volumes:
 *   postgres_data:
 */

// ============================================================
// TESTING CON CURL
// ============================================================

/**
 * Verificar RA-Service health:
 * curl http://localhost:5300/api/ra/health
 * 
 * Crear sesión RA:
 * curl -X POST http://localhost:5300/api/ra/session \
 *   -H "Content-Type: application/json" \
 *   -d '{"dishId":"1","fallbackModelPath":"/models/lasana.glb"}'
 * 
 * Detectar planos:
 * curl -X POST http://localhost:5300/api/ra/plane-detect \
 *   -H "Content-Type: application/json" \
 *   -d '{"imageBase64":"data:image/...","dishId":"1"}'
 */

// ============================================================
// VERIFICACIÓN DE IMPLEMENTACIÓN
// ============================================================

/**
 * Checklist:
 * ✅ CORS habilitado en RA-Service
 * ✅ CORS habilitado en VR-Service  
 * ✅ Endpoints /api/ra/session y /api/vr/session
 * ✅ Endpoints /api/ra/health y /api/vr/health
 * ✅ Modelos GLB en /FrontEnd/models/
 * ✅ 3d-viewer.js integrado en index.html
 * ✅ script.js con openAR3DViewer()
 * ✅ styles.css con estilos para visor 3D
 * ✅ Variables de entorno configuradas
 * ✅ Servidores corriendo en puertos correctos
 * ✅ Navegador sin errores CORS
 */
