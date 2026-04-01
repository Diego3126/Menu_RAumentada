const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const platosRoutes = require('./routes/platos');
const personalizacionRoutes = require('./routes/personalizacion');
const carritoRoutes = require('./routes/carrito');
const pedidosRoutes = require('./routes/pedidos');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Proxy para feature-detection-service (mismo origen para pruebas móviles con ngrok)
app.post('/api/v1/features/detect', async (req, res) => {
    const featureServiceUrl = process.env.FEATURE_SERVICE_URL || 'http://127.0.0.1:5200/api/v1/features/detect';

    try {
        const response = await fetch(featureServiceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const raw = await response.text();
        const payload = raw ? JSON.parse(raw) : {};
        return res.status(response.status).json(payload);
    } catch (error) {
        return res.status(502).json({
            success: false,
            message: 'No se pudo conectar con feature-detection-service',
            error: error?.message || String(error)
        });
    }
});

// Rutas API
app.use('/api/platos', platosRoutes);
app.use('/api/personalizacion', personalizacionRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api/pedidos', pedidosRoutes);

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});