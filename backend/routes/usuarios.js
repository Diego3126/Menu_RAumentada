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
    // Validación de rol: requerir que exista `req.usuario` y sea admin.
    if (!req.usuario || req.usuario.rol !== 'admin') {
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

    // Validaciones básicas y sanitización
    if (!nombre || !email || !password) {
        return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const nombreNorm = String(nombre).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        return res.status(400).json({ error: 'Email inválido' });
    }
    if (String(password).length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    if (!['admin', 'cocinero'].includes(rol)) {
        return res.status(400).json({ error: 'El rol debe ser "admin" o "cocinero"' });
    }

    try {
        // Comprobar unicidad antes de intentar insertar para devolver error amigable
        const exists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [emailNorm]);
        if (exists.rows.length > 0) {
            return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
        }

        // Si se intenta crear admin y el solicitante no es admin, rechazar
        const requesterRol = req.usuario && req.usuario.rol;
        if (rol === 'admin' && requesterRol !== 'admin') {
            return res.status(403).json({ error: 'Solo administradores pueden crear otros administradores' });
        }

        const passwordHash = hashPassword(password);

        const result = await pool.query(
            `INSERT INTO usuarios (nombre, email, password, rol)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nombre, email, rol, created_at`,
            [nombreNorm, emailNorm, passwordHash, rol]
        );

        res.status(201).json({ success: true, usuario: result.rows[0] });
    } catch (error) {
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
    if (!req.usuario || req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    const { id } = req.params;
    const { rol } = req.body;

    if (!['admin', 'cocinero'].includes(rol)) {
        return res.status(400).json({ error: 'El rol debe ser "admin" o "cocinero"' });
    }

    try {
        // Si se está cambiando de admin -> cocinero, prevenir dejar sin admins
        const current = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [parseInt(id)]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (current.rows[0].rol === 'admin' && rol !== 'admin') {
            const admins = await pool.query("SELECT COUNT(*)::int AS cnt FROM usuarios WHERE rol = 'admin'");
            if (admins.rows[0].cnt <= 1) {
                return res.status(400).json({ error: 'No se puede demorar al último administrador' });
            }
        }

        const result = await pool.query(
            `UPDATE usuarios
             SET rol = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, nombre, email, rol, updated_at`,
            [rol, parseInt(id)]
        );

        res.json({ success: true, usuario: result.rows[0] });
    } catch (error) {
        console.error('Error al actualizar rol:', error);
        res.status(500).json({ error: 'Error al actualizar rol del usuario' });
    }
});


/**
 * PATCH /api/usuarios/:id
 * Actualiza nombre, email o password de un usuario.
 * Body opcional: { nombre, email, password }
 */
router.patch('/:id', async (req, res) => {
    if (!req.usuario || req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    const { id } = req.params;
    const { nombre, email, password } = req.body;

    if (!nombre && !email && !password) {
        return res.status(400).json({ error: 'Nada para actualizar. Provee nombre, email o password.' });
    }

    const fields = [];
    const params = [];
    let idx = 1;

    if (nombre) {
        fields.push(`nombre = $${idx++}`);
        params.push(nombre.trim());
    }
    if (email) {
        const emailNorm = String(email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
            return res.status(400).json({ error: 'Email inválido' });
        }
        // verificar unicidad
        const exists = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND id <> $2', [emailNorm, parseInt(id)]);
        if (exists.rows.length > 0) {
            return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
        }
        fields.push(`email = $${idx++}`);
        params.push(emailNorm);
    }
    if (password) {
        const passwordHash = hashPassword(password);
        fields.push(`password = $${idx++}`);
        params.push(passwordHash);
    }

    // always update updated_at
    fields.push(`updated_at = NOW()`);

    params.push(parseInt(id));

    const sql = `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, nombre, email, rol, updated_at`;

    try {
        const result = await pool.query(sql, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ success: true, usuario: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
        }
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

/**
 * DELETE /api/usuarios/:id
 * Elimina un usuario (solo admins). Previene eliminar el último admin.
 */
router.delete('/:id', async (req, res) => {
    if (!req.usuario || req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    const { id } = req.params;

    try {
        // Si el usuario a eliminar es admin, comprobar que haya más de 1 admin
        const target = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [parseInt(id)]);
        if (target.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (target.rows[0].rol === 'admin') {
            const admins = await pool.query("SELECT COUNT(*)::int AS cnt FROM usuarios WHERE rol = 'admin'");
            if (admins.rows[0].cnt <= 1) {
                return res.status(400).json({ error: 'No se puede eliminar el último administrador' });
            }
        }

        const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id, nombre, email, rol', [parseInt(id)]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ success: true, usuario: result.rows[0] });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

module.exports = router;
