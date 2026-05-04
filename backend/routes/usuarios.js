// ============================================================
// routes/usuarios.js
// MRA-62 + MRA-63: Gestión de usuarios con soporte de roles
// ============================================================

const express = require('express');
const router = express.Router();
const pool = require('../db/neon');

// ==================== HELPERS ====================

/**
 * Hashea una contraseña de forma simple (SHA-256 hex).
 * En producción usa bcrypt: npm install bcrypt
 */
const crypto = require('crypto');
function hashPassword(plain) {
    return crypto.createHash('sha256').update(plain).digest('hex');
}

// ==================== RUTAS ====================

/**
 * GET /api/usuarios
 * Lista todos los usuarios (sin exponer contraseñas).
 * Solo accesible por admins (validación básica vía header x-rol).
 */
router.get('/', async (req, res) => {
    // Validación mínima de rol (se reemplazará por JWT en MRA-64)
    const rolSolicitante = req.headers['x-rol'];
    if (rolSolicitante !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    try {
        const result = await pool.query(
            `SELECT id, nombre, email, rol, created_at, updated_at
             FROM usuarios
             ORDER BY rol, id`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

/**
 * POST /api/usuarios/registro
 * Registra un nuevo usuario con rol.
 * Body: { nombre, email, password, rol }
 * rol debe ser 'admin' o 'cocinero' (por defecto: 'cocinero')
 */
router.post('/registro', async (req, res) => {
    const { nombre, email, password, rol = 'cocinero' } = req.body;

    // Validaciones básicas
    if (!nombre || !email || !password) {
        return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
    }
    if (!['admin', 'cocinero'].includes(rol)) {
        return res.status(400).json({ error: 'El rol debe ser "admin" o "cocinero"' });
    }

    try {
        const passwordHash = hashPassword(password);

        const result = await pool.query(
            `INSERT INTO usuarios (nombre, email, password, rol)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nombre, email, rol, created_at`,
            [nombre.trim(), email.trim().toLowerCase(), passwordHash, rol]
        );

        res.status(201).json({
            success: true,
            usuario: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            // Unique constraint: email duplicado
            return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
        }
        if (error.code === '23514') {
            // Check constraint: rol inválido
            return res.status(400).json({ error: 'Rol inválido. Use "admin" o "cocinero"' });
        }
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

/**
 * PATCH /api/usuarios/:id/rol
 * Actualiza el rol de un usuario existente (MRA-63).
 * Solo admins pueden hacer esto.
 * Body: { rol }
 */
router.patch('/:id/rol', async (req, res) => {
    const rolSolicitante = req.headers['x-rol'];
    if (rolSolicitante !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    const { id } = req.params;
    const { rol } = req.body;

    if (!['admin', 'cocinero'].includes(rol)) {
        return res.status(400).json({ error: 'El rol debe ser "admin" o "cocinero"' });
    }

    try {
        const result = await pool.query(
            `UPDATE usuarios
             SET rol = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, nombre, email, rol, updated_at`,
            [rol, parseInt(id)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            success: true,
            usuario: result.rows[0]
        });
    } catch (error) {
        console.error('Error al actualizar rol:', error);
        res.status(500).json({ error: 'Error al actualizar rol del usuario' });
    }
});

module.exports = router;
