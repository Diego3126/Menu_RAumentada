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
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../FrontEnd')));

// ==================== RUTAS PÚBLICAS ====================
// Estas rutas NO requieren autenticación
app.use('/api/auth', authRoutes);              // login, logout, me
app.use('/api/platos', platosRoutes);          // el menú es público
app.use('/api/carrito', carritoRoutes);        // carrito es público (por session)

// ==================== RUTAS PROTEGIDAS ====================
// MRA-66: Solo usuarios autenticados pueden hacer pedidos
app.use('/api/pedidos', requireAuth, pedidosRoutes);

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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`🔐 Login disponible en http://localhost:${PORT}/login`);
});
