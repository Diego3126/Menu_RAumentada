const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const platosRoutes = require('./routes/platos');
const personalizacionRoutes = require('./routes/personalizacion');
const carritoRoutes = require('./routes/carrito');
const pedidosRoutes = require('./routes/pedidos');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Configure CORS: allow origins from env or default to frontend localhost ports
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080,http://localhost:3000').split(',');
app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true); // allow non-browser requests like curl
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

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