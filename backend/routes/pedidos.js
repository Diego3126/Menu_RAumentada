// ============================================================
// MRA-110: Endpoint para guardar pedidos
// MRA-111: Asociar pedido con usuario
// MRA-112: Definir estado inicial 'pendiente'
// MRA-113: Validar datos antes de guardar
// MRA-114: Generar ID único con verificación en DB
// ============================================================
// Rutas:
//   POST /api/pedidos                     → Registrar nuevo pedido
//   GET  /api/pedidos/:codigo             → Obtener pedido por código
//   GET  /api/pedidos/recientes/limite/:n → Pedidos recientes (ADMIN)
// ============================================================

const express = require('express');
const router = express.Router();
const pool = require('../db/neon');

// MRA-111: Usar el sistema de auth del compañero (routes/auth.js)
const { requireAuth, requireAdmin } = require('./auth');

// ============================================================
// MRA-114: Generar código único verificado en DB
// Formato: PED-YYYYMMDD-XXXX  (reintenta hasta 5 veces si colisiona)
// ============================================================
async function generarCodigoPedido(client) {
    const fecha = new Date();
    const yyyy = fecha.getFullYear();
    const mm   = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd   = String(fecha.getDate()).padStart(2, '0');

    for (let intento = 0; intento < 5; intento++) {
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const codigo = `PED-${yyyy}${mm}${dd}-${random}`;

        const { rows } = await client.query(
            'SELECT id FROM pedidos WHERE codigo_pedido = $1',
            [codigo]
        );

        if (rows.length === 0) return codigo; // único confirmado
    }

    // Fallback con timestamp en ms para garantizar unicidad
    return `PED-${yyyy}${mm}${dd}-${Date.now().toString().slice(-6)}`;
}

// ============================================================
// MRA-113: Validar datos del pedido
// Devuelve array de errores (vacío = válido)
// ============================================================
function validarPedido({ items, nombre_cliente, email_cliente, subtotal, total }) {
    const errores = [];

    // Items
    if (!items || !Array.isArray(items) || items.length === 0) {
        errores.push('El carrito está vacío.');
    } else {
        items.forEach((item, i) => {
            if (!item.plato_id)
                errores.push(`Item ${i + 1}: falta plato_id.`);
            if (!item.plato_nombre || item.plato_nombre.trim() === '')
                errores.push(`Item ${i + 1}: falta plato_nombre.`);
            if (!item.precio_unitario || isNaN(item.precio_unitario) || item.precio_unitario <= 0)
                errores.push(`Item ${i + 1}: precio_unitario inválido.`);
            if (!item.cantidad || !Number.isInteger(item.cantidad) || item.cantidad < 1)
                errores.push(`Item ${i + 1}: cantidad debe ser un entero >= 1.`);
            if (item.subtotal === undefined || isNaN(item.subtotal) || item.subtotal < 0)
                errores.push(`Item ${i + 1}: subtotal inválido.`);
        });
    }

    // Cliente
    if (!nombre_cliente || nombre_cliente.trim() === '')
        errores.push('El nombre del cliente es obligatorio.');
    else if (nombre_cliente.trim().length < 2)
        errores.push('El nombre del cliente debe tener al menos 2 caracteres.');

    // Email (opcional, pero si viene debe ser válido)
    if (email_cliente && email_cliente.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email_cliente.trim()))
            errores.push('El email del cliente no tiene un formato válido.');
    }

    // Totales
    if (subtotal === undefined || isNaN(subtotal) || subtotal < 0)
        errores.push('El subtotal es inválido.');
    if (total === undefined || isNaN(total) || total < 0)
        errores.push('El total es inválido.');

    return errores;
}

// ============================================================
// POST /api/pedidos — Registrar nuevo pedido
// MRA-111: Protegido con requireAuth — extrae usuario del token
// ============================================================
router.post('/', requireAuth, async (req, res) => {
    const {
        items,
        nombre_cliente,
        telefono_cliente,
        email_cliente,
        notas,
        subtotal,
        total
    } = req.body;

    // MRA-111: El usuario viene del token (req.usuario lo pone requireAuth)
    const usuario_id = req.usuario?.userId || null;

    // MRA-113: Validar antes de tocar la DB
    const errores = validarPedido({ items, nombre_cliente, email_cliente, subtotal, total });
    if (errores.length > 0) {
        return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // MRA-114: Código único verificado en DB
        const codigo_pedido = await generarCodigoPedido(client);

        // MRA-112: Estado inicial siempre 'pendiente'
        // MRA-111: usuario_id viene del token JWT
        const pedidoResult = await client.query(
            `INSERT INTO pedidos (
                codigo_pedido, nombre_cliente, telefono_cliente, email_cliente,
                notas, subtotal, total, estado, usuario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente', $8)
            RETURNING id, codigo_pedido, estado, created_at`,
            [
                codigo_pedido,
                nombre_cliente.trim(),
                telefono_cliente?.trim() || '',
                email_cliente?.trim().toLowerCase() || '',
                notas?.trim() || '',
                subtotal,
                total,
                usuario_id  // MRA-111: null si el token no tiene userId (no debería pasar)
            ]
        );

        const pedidoId = pedidoResult.rows[0].id;

        // Insertar detalles del pedido
        for (const item of items) {
            await client.query(
                `INSERT INTO pedido_detalles (
                    pedido_id, plato_id, plato_nombre,
                    ingredientes_originales, ingredientes_eliminados,
                    ingredientes_agregados, precio_unitario, cantidad, subtotal
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    pedidoId,
                    item.plato_id,
                    item.plato_nombre.trim(),
                    item.ingredientes_originales || '',
                    item.ingredientes_eliminados || '',
                    item.ingredientes_agregados  || '',
                    item.precio_unitario,
                    item.cantidad,
                    item.subtotal
                ]
            );
        }

        await client.query('COMMIT');

        // Vaciar carrito de la sesión tras confirmar el pedido
        const sessionId = req.headers['x-session-id'];
        if (sessionId) {
            await pool.query('DELETE FROM carrito WHERE session_id = $1', [sessionId]);
        }

        res.status(201).json({
            success: true,
            pedido: {
                id:         pedidoId,
                codigo:     codigo_pedido,
                estado:     pedidoResult.rows[0].estado,  // MRA-112: siempre 'pendiente'
                fecha:      pedidoResult.rows[0].created_at,
                total,
                usuario_id,                                // MRA-111
                mensaje:    `Pedido #${codigo_pedido} registrado correctamente`
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al registrar pedido:', error);
        res.status(500).json({ error: 'Error al registrar el pedido', details: error.message });
    } finally {
        client.release();
    }
});

// ============================================================
// GET /api/pedidos/:codigo — Obtener pedido por código
// Protegido: solo el usuario dueño o un admin puede verlo
// ============================================================
router.get('/:codigo', requireAuth, async (req, res) => {
    const { codigo } = req.params;

    if (!codigo || codigo.trim() === '') {
        return res.status(400).json({ error: 'Código de pedido requerido.' });
    }

    try {
        const pedidoResult = await pool.query(
            'SELECT * FROM pedidos WHERE codigo_pedido = $1',
            [codigo.trim()]
        );

        if (pedidoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado.' });
        }

        const pedido = pedidoResult.rows[0];

        // MRA-111: Solo el dueño del pedido o un admin puede verlo
        const esAdmin  = req.usuario?.rol === 'admin';
        const esDuenio = pedido.usuario_id === req.usuario?.userId;

        if (!esAdmin && !esDuenio) {
            return res.status(403).json({ error: 'No tienes permiso para ver este pedido.' });
        }

        const detallesResult = await pool.query(
            'SELECT * FROM pedido_detalles WHERE pedido_id = $1 ORDER BY id',
            [pedido.id]
        );

        res.json({
            pedido,
            detalles: detallesResult.rows
        });

    } catch (error) {
        console.error('Error al obtener pedido:', error);
        res.status(500).json({ error: 'Error al obtener pedido.' });
    }
});

// ============================================================
// GET /api/pedidos/recientes/limite/:limite — Solo ADMIN
// ============================================================
router.get('/recientes/limite/:limite', requireAdmin, async (req, res) => {
    const limite = parseInt(req.params.limite) || 10;

    if (limite < 1 || limite > 100) {
        return res.status(400).json({ error: 'El límite debe estar entre 1 y 100.' });
    }

    try {
        const result = await pool.query(
            `SELECT p.*,
                    (SELECT COUNT(*) FROM pedido_detalles WHERE pedido_id = p.id) AS num_items
             FROM pedidos p
             ORDER BY p.created_at DESC
             LIMIT $1`,
            [limite]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener pedidos recientes:', error);
        res.status(500).json({ error: 'Error al obtener pedidos.' });
    }
});

module.exports = router;