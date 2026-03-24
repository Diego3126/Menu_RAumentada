const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const platosRoutes = require('./routes/platos');
const personalizacionRoutes = require('./routes/personalizacion');
const carritoRoutes = require('./routes/carrito');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas API
app.use('/api/platos', platosRoutes);
app.use('/api/personalizacion', personalizacionRoutes);
app.use('/api/carrito', carritoRoutes);

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});