// ============================================================
// routes/auth.js
// MRA-64: Modificar autenticación para incluir rol
// MRA-65: Redirigir según rol después del login
// MRA-70: Logout funcional
// ============================================================

const express = require('express');
const router = express.Router();
const pool = require('../db/neon');
const crypto = require('crypto');

// Hash simple SHA-256 (compatible con lo que usa usuarios.js)
function hashPassword(plain) {
    return crypto.createHash('sha256').update(plain).digest('hex');
}

// Genera un token simple (sin dependencia de jsonwebtoken)
// Formato: base64(userId:rol:timestamp:firma)
function generarToken(usuario) {
    const payload = `${usuario.id}:${usuario.rol}:${Date.now()}`;
    const firma = crypto.createHmac('sha256', process.env.JWT_SECRET || 'menu_ra_secret_2024')
        .update(payload).digest('hex');
    return Buffer.from(`${payload}:${firma}`).toString('base64');
}

// Verifica el token y retorna el payload o null
function verificarToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const partes = decoded.split(':');
        if (partes.length < 4) return null;

        const [userId, rol, timestamp, firma] = partes;
        const payload = `${userId}:${rol}:${timestamp}`;
        const firmaEsperada = crypto.createHmac('sha256', process.env.JWT_SECRET || 'menu_ra_secret_2024')
            .update(payload).digest('hex');

        if (firma !== firmaEsperada) return null;

        // Token válido por 8 horas
        if (Date.now() - parseInt(timestamp) > 8 * 60 * 60 * 1000) return null;

        return { userId: parseInt(userId), rol };
    } catch {
        return null;
    }
}

// ==================== MIDDLEWARE ====================

/**
 * Middleware: verifica que el usuario esté autenticado.
 * Adjunta req.usuario = { userId, rol }
 */
function requireAuth(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '') ||
                  req.headers['x-token'];

    if (!token) {
        return res.status(401).json({ error: 'No autenticado. Inicia sesión.' });
    }

    const payload = verificarToken(token);
    if (!payload) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }

    req.usuario = payload;
    next();
}

/**
 * Middleware: verifica que el usuario sea admin.
 */
function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.usuario.rol !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
        }
        next();
    });
}

// ==================== RUTAS ====================

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Response: { token, usuario: { id, nombre, email, rol }, redirigirA }
 *
 * MRA-64: incluye rol en la respuesta
 * MRA-65: incluye redirigirA según el rol
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y password son requeridos.' });
    }

    try {
        const result = await pool.query(
            'SELECT id, nombre, email, rol, password FROM usuarios WHERE email = $1',
            [email.trim().toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
        }

        const usuario = result.rows[0];
        const passwordHash = hashPassword(password);

        if (passwordHash !== usuario.password) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
        }

        const token = generarToken(usuario);

        // MRA-65: determinar a dónde redirigir según el rol
        const redirigirA = usuario.rol === 'admin' ? '/admin.html' : '/cocina.html';

        res.json({
            success: true,
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            },
            redirigirA
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión.' });
    }
});

/**
 * POST /api/auth/logout
 * MRA-70: Logout — el frontend elimina el token, el backend confirma.
 */
router.post('/logout', requireAuth, (req, res) => {
    // Con tokens stateless el logout real ocurre en el frontend
    // eliminando el token de localStorage.
    res.json({ success: true, mensaje: 'Sesión cerrada correctamente.' });
});

/**
 * GET /api/auth/me
 * Retorna el usuario autenticado actual.
 */
router.get('/me', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nombre, email, rol FROM usuarios WHERE id = $1',
            [req.usuario.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        res.json({ usuario: result.rows[0] });
    } catch (error) {
        console.error('Error en /me:', error);
        res.status(500).json({ error: 'Error al obtener usuario.' });
    }
});

/**
 * POST /api/auth/cambiar-password
 * MRA-84 a 91: Cambio de contraseña con validaciones completas
 * Requiere autenticación (token en header Authorization)
 * Body: { passwordActual, passwordNueva, passwordConfirmar }
 */
router.post('/cambiar-password', requireAuth, async (req, res) => {
    const { passwordActual, passwordNueva, passwordConfirmar } = req.body;
    const { userId } = req.usuario;

    // MRA-86: Validar campos
    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    if (passwordNueva.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    if (passwordNueva !== passwordConfirmar) {
        return res.status(400).json({ error: 'La nueva contraseña y la confirmación no coinciden.' });
    }

    if (passwordActual === passwordNueva) {
        return res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la actual.' });
    }

    try {
        // MRA-85: Verificar contraseña actual
        const result = await pool.query(
            'SELECT password FROM usuarios WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        if (hashPassword(passwordActual) !== result.rows[0].password) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }

        // MRA-87 + MRA-88: Encriptar y guardar
        await pool.query(
            'UPDATE usuarios SET password = $1, updated_at = NOW() WHERE id = $2',
            [hashPassword(passwordNueva), userId]
        );

        // MRA-89: Respuesta de éxito
        res.json({ success: true, mensaje: 'Contraseña actualizada correctamente.' });

    } catch (error) {
        // MRA-91: Manejo de errores
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ error: 'Error al actualizar la contraseña. Intenta de nuevo.' });
    }
});

// Exportar router y middlewares para usarlos en otras rutas
module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireAdmin = requireAdmin;
