const express = require('express');
const router = express.Router();
const pool = require('../db/neon');

// Generar código único para el pedido
function generarCodigoPedido() {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PED-${año}${mes}${dia}-${random}`;
}

// Registrar nuevo pedido (MRA-25)
router.post('/', async (req, res) => {
    const {
        items,           // Array de items del carrito
        nombre_cliente,
        telefono_cliente,
        email_cliente,
        notas,
        subtotal,
        total
    } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Validar datos
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío' });
        }

        if (!nombre_cliente || nombre_cliente.trim() === '') {
            return res.status(400).json({ error: 'El nombre del cliente es obligatorio' });
        }

        // Generar código único
        const codigo_pedido = generarCodigoPedido();

        // Insertar cabecera del pedido
        const pedidoResult = await client.query(
            `INSERT INTO pedidos (
                codigo_pedido, nombre_cliente, telefono_cliente, email_cliente, 
                notas, subtotal, total, estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente')
            RETURNING id, codigo_pedido, created_at`,
            [
                codigo_pedido,
                nombre_cliente.trim(),
                telefono_cliente || '',
                email_cliente || '',
                notas || '',
                subtotal,
                total
            ]
        );

        const pedidoId = pedidoResult.rows[0].id;

        // Insertar cada item del pedido
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
                    item.plato_nombre,
                    item.ingredientes_originales || '',
                    item.ingredientes_eliminados || '',
                    item.ingredientes_agregados || '',
                    item.precio_unitario,
                    item.cantidad,
                    item.subtotal
                ]
            );
        }

        await client.query('COMMIT');

        // Limpiar el carrito del usuario después del pedido
        const sessionId = req.headers['x-session-id'];
        if (sessionId) {
            await pool.query('DELETE FROM carrito WHERE session_id = $1', [sessionId]);
        }

        res.json({
            success: true,
            pedido: {
                id: pedidoId,
                codigo: codigo_pedido,
                fecha: pedidoResult.rows[0].created_at,
                total: total,
                mensaje: `Pedido #${codigo_pedido} registrado correctamente`
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

// Obtener pedido por código
router.get('/:codigo', async (req, res) => {
    const { codigo } = req.params;

    try {
        const pedidoResult = await pool.query(
            'SELECT * FROM pedidos WHERE codigo_pedido = $1',
            [codigo]
        );

        if (pedidoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const detallesResult = await pool.query(
            'SELECT * FROM pedido_detalles WHERE pedido_id = $1',
            [pedidoResult.rows[0].id]
        );

        res.json({
            pedido: pedidoResult.rows[0],
            detalles: detallesResult.rows
        });
    } catch (error) {
        console.error('Error al obtener pedido:', error);
        res.status(500).json({ error: 'Error al obtener pedido' });
    }
});

// Obtener pedidos recientes (opcional)
router.get('/recientes/limite/:limite', async (req, res) => {
    const { limite } = req.params;

    try {
        const result = await pool.query(
            `SELECT p.*, 
                    (SELECT COUNT(*) FROM pedido_detalles WHERE pedido_id = p.id) as num_items
             FROM pedidos p 
             ORDER BY p.created_at DESC 
             LIMIT $1`,
            [parseInt(limite) || 10]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
});

module.exports = router;