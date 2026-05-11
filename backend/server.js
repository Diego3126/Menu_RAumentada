// ============================================================
// server.js — ACTUALIZADO
// MRA-64: Ruta de auth
// MRA-66: Proteger rutas según rol
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const platosRoutes = require('./routes/platos');
const personalizacionRoutes = require('./routes/personalizacion');
const carritoRoutes = require('./routes/carrito');
const pedidosRoutes = require('./routes/pedidos');
const usuariosRoutes = require('./routes/usuarios');     // MRA-62/63
const authRoutes = require('./routes/auth');             // MRA-64/65/70

// Importar middlewares de protección (MRA-66)
const { requireAuth, requireAdmin } = require('./routes/auth');

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
app.use(express.static(path.join(__dirname, '../FrontEnd')));
// Servir modelos 3D desde uploads/models/ → accesibles como /models/nombre.glb
app.use('/models', express.static(path.join(__dirname, '../uploads/models')));
// Servir imágenes de platos desde uploads/images/ → accesibles como /images/nombre.jpg
app.use('/images', express.static(path.join(__dirname, '../uploads/images')));

// ==================== RUTAS PÚBLICAS ====================
// Estas rutas NO requieren autenticación
app.use('/api/auth', authRoutes);              // login, logout, me
app.use('/api/platos', platosRoutes);          // el menú es público
app.use('/api/carrito', carritoRoutes);        // carrito es público (por session)

// ==================== RUTAS PROTEGIDAS ====================
// Pedidos: público para POST (clientes sin login), protegido internamente por ruta
// El POST no requiere auth — los clientes llenan el formulario con sus datos
// El GET y PATCH sí requieren auth — están protegidos dentro de pedidos.js
app.use('/api/pedidos', pedidosRoutes);

// MRA-66: Solo admins pueden ver/editar personalización y usuarios
app.use('/api/personalizacion', requireAdmin, personalizacionRoutes);
app.use('/api/usuarios', requireAdmin, usuariosRoutes);

// ==================== RUTAS SPA ====================
// Ruta principal → index.html (menú público)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../FrontEnd/index.html'));
});

// MRA-65: Página de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../FrontEnd/login.html'));
});

// MRA-65: Dashboard admin (el frontend valida el token)
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../FrontEnd/admin.html'));
});

// MRA-65: Vista cocina (el frontend valida el token)
app.get('/cocina.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../FrontEnd/cocina.html'));
});

// MRA-83: Cambio de contraseña
app.get('/cambiar-password', (req, res) => {
    res.sendFile(path.join(__dirname, '../FrontEnd/cambiar-password.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`🔐 Login disponible en http://localhost:${PORT}/login`);
});