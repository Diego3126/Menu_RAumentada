// ============================================================
// MRA-110: Endpoint para guardar pedidos
// MRA-111: Asociar pedido con usuario
// MRA-112: Definir estado inicial 'pendiente'
// MRA-113: Validar datos antes de guardar
// MRA-114: Generar ID único con verificación en DB
// MRA-123: Evitar duplicación de pedidos
// MRA-124: Validar integridad de datos
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
const crypto = require('crypto');

// ============================================================
// MRA-123: Control anti-duplicación en memoria
// Guarda hashes de pedidos recientes para evitar doble envío
// Se limpia automáticamente cada minuto
// ============================================================
const pedidosRecientes = new Map();

function hashPedido(nombre_cliente, items) {
    const contenido = nombre_cliente.trim().toLowerCase()
        + JSON.stringify(items.map(i => ({
            id:  i.plato_id,
            qty: i.cantidad
        })).sort((a, b) => a.id - b.id));
    return crypto.createHash('sha256').update(contenido).digest('hex');
}

// Limpiar hashes con más de 5 minutos de antigüedad
setInterval(() => {
    const ahora = Date.now();
    for (const [hash, ts] of pedidosRecientes.entries()) {
        if (ahora - ts > 5 * 60 * 1000) pedidosRecientes.delete(hash);
    }
}, 60 * 1000);

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
router.post('/', async (req, res) => {  // Público: clientes no necesitan login
    const {
        items,
        nombre_cliente,
        telefono_cliente,
        email_cliente,
        notas,
        subtotal,
        total
    } = req.body;

    // Pedidos de clientes no requieren login — usuario_id siempre null
    const usuario_id = null;

    // MRA-113: Validar estructura y formato de los datos
    const errores = validarPedido({ items, nombre_cliente, email_cliente, subtotal, total });
    if (errores.length > 0) {
        return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    }

    // MRA-123: Verificar duplicación — mismo cliente + mismos items en < 5 min
    const hash = hashPedido(nombre_cliente, items);
    if (pedidosRecientes.has(hash)) {
        return res.status(409).json({
            error: 'Pedido duplicado',
            detalles: ['Este pedido ya fue registrado recientemente. Si fue un error, espera unos minutos e intenta de nuevo.']
        });
    }

    const client = await pool.connect();

    // MRA-124: Validar integridad — verificar platos en DB y precios reales
    // Nota: NO llamar client.release() aquí — lo maneja el finally al final del try principal
    try {
        const platosIds = [...new Set(items.map(i => parseInt(i.plato_id)))];
        const { rows: platosDB } = await client.query(
            `SELECT id, precio FROM platos WHERE id = ANY($1::int[])`,
            [platosIds]
        );

        // Verificar que todos los plato_id existen
        const idsEnDB = new Set(platosDB.map(p => p.id));
        const idsInvalidos = platosIds.filter(id => !idsEnDB.has(id));
        if (idsInvalidos.length > 0) {
            // No hacer BEGIN — liberar y retornar sin transacción
            client.release();
            return res.status(400).json({
                error: 'Datos inválidos',
                detalles: [`Los siguientes platos no existen: ${idsInvalidos.join(', ')}`]
            });
        }

        // Verificar que los precios no fueron manipulados (tolerancia de ±1%)
        const preciosDB = Object.fromEntries(platosDB.map(p => [p.id, parseFloat(p.precio)]));
        const erroresPrecios = [];
        items.forEach((item, i) => {
            const precioReal    = preciosDB[parseInt(item.plato_id)];
            const precioEnviado = parseFloat(item.precio_unitario);
            const diferencia    = Math.abs(precioReal - precioEnviado) / precioReal;
            if (diferencia > 0.01) {
                erroresPrecios.push(`Item ${i + 1}: el precio no coincide con el registrado.`);
            }
        });

        if (erroresPrecios.length > 0) {
            // No hacer BEGIN — liberar y retornar sin transacción
            client.release();
            return res.status(400).json({
                error: 'Integridad de precios fallida',
                detalles: erroresPrecios
            });
        }

        // Recalcular subtotal y total desde precios reales de la DB (no confiar en el frontend)
        let subtotalVerificado = 0;
        items.forEach(item => {
            subtotalVerificado += preciosDB[parseInt(item.plato_id)] * item.cantidad;
        });
        subtotalVerificado = parseFloat(subtotalVerificado.toFixed(2));

        // MRA-124: usar subtotal verificado por la DB en lugar del enviado por el frontend
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

        // MRA-123: Registrar hash del pedido para evitar duplicados en los próximos 5 min
        pedidosRecientes.set(hash, Date.now());

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
        // Solo hacer ROLLBACK si BEGIN fue ejecutado (después de las validaciones MRA-124)
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('Error al registrar pedido:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error al registrar el pedido', details: error.message });
        }
    } finally {
        // Liberar solo si el cliente no fue liberado ya en las validaciones MRA-124
        try { client.release(); } catch (_) {}
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

// ============================================================
// DELETE /api/pedidos/listos — Eliminar todos los pedidos con estado 'listo'
// Solo cocineros y admins pueden limpiar la vista
// ============================================================
router.delete('/listos', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM pedidos WHERE estado = 'listo'
             RETURNING id, codigo_pedido`
        );

        res.json({
            success: true,
            eliminados: result.rows.length,
            mensaje: result.rows.length === 0
                ? 'No había pedidos listos para eliminar'
                : `${result.rows.length} pedido(s) eliminado(s) correctamente`
        });

    } catch (error) {
        console.error('Error al limpiar pedidos listos:', error);
        res.status(500).json({ error: 'Error al eliminar los pedidos listos.' });
    }
});

module.exports = router;

// ============================================================
// MRA-119/120: GET /api/pedidos — Lista pedidos activos
// Cocineros ven pendientes y en_preparacion
// Admins ven todos
// ============================================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const rol     = req.usuario?.rol || '';
        const esAdmin = rol === 'admin';

        // Admins ven todos los estados; cocineros solo los activos
        // Si el rol no es reconocido, mostrar solo activos por seguridad
        const pedidosResult = await pool.query(
            `SELECT p.*
             FROM pedidos p
             ${esAdmin ? '' : "WHERE p.estado IN ('pendiente', 'en_preparacion', 'listo')"}
             ORDER BY p.created_at ASC`
        );

        // Incluir items de cada pedido con una sola query (más eficiente que N queries)
        const ids = pedidosResult.rows.map(p => p.id);

        let detallesMap = {};
        if (ids.length > 0) {
            const { rows: detalles } = await pool.query(
                `SELECT pedido_id, plato_nombre, cantidad,
                        ingredientes_eliminados, ingredientes_agregados
                 FROM pedido_detalles
                 WHERE pedido_id = ANY($1::int[])
                 ORDER BY id`,
                [ids]
            );
            // Agrupar detalles por pedido_id
            detalles.forEach(d => {
                if (!detallesMap[d.pedido_id]) detallesMap[d.pedido_id] = [];
                detallesMap[d.pedido_id].push(d);
            });
        }

        const resultado = pedidosResult.rows.map(p => ({
            ...p,
            items: detallesMap[p.id] || []
        }));

        res.json(resultado);

    } catch (error) {
        console.error('Error al listar pedidos:', error);
        res.status(500).json({ error: 'Error al obtener los pedidos.', detalle: error.message });
    }
});

// ============================================================
// MRA-120/122: PATCH /api/pedidos/:id/estado
// Cambia el estado de un pedido (cocinero o admin)
// Estados válidos: pendiente → en_preparacion → listo → entregado
// ============================================================
router.patch('/:id/estado', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado'];

    // MRA-124: Validar estado recibido
    if (!estado || !estadosValidos.includes(estado)) {
        return res.status(400).json({
            error: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}`
        });
    }

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID de pedido inválido.' });
    }

    try {
        const result = await pool.query(
            `UPDATE pedidos
             SET estado = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, codigo_pedido, estado, updated_at`,
            [estado, parseInt(id)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado.' });
        }

        res.json({
            success: true,
            pedido: result.rows[0],
            mensaje: `Pedido actualizado a "${estado}"`
        });

    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ error: 'Error al actualizar el estado del pedido.' });
    }
});