const express = require('express');
const router = express.Router();
const pool = require('../db/neon');

// Obtener ID de sesión
function getSessionId(req) {
    let sessionId = req.headers['x-session-id'];
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return sessionId;
}

// Obtener carrito
router.get('/', async (req, res) => {
    const sessionId = getSessionId(req);

    try {
        const result = await pool.query(
            `SELECT c.*,
                    (c.cantidad * c.plato_precio) as item_total
             FROM carrito c
             WHERE c.session_id = $1
             ORDER BY c.created_at DESC`,
            [sessionId]
        );

        let total = 0;
        result.rows.forEach(item => {
            total += parseFloat(item.item_total);
        });

        res.json({
            sessionId: sessionId,
            items: result.rows,
            total: total.toFixed(2),
            count: result.rows.reduce((sum, item) => sum + item.cantidad, 0)
        });
    } catch (error) {
        console.error('Error al obtener carrito:', error);
        res.status(500).json({ error: 'Error al obtener carrito' });
    }
});

// Agregar plato al carrito
router.post('/agregar', async (req, res) => {
    const sessionId = getSessionId(req);
    const {
        plato_id,
        plato_nombre,
        plato_precio,
        ingredientes_originales,
        ingredientes_eliminados,
        ingredientes_agregados,
        personalizacion_json,
        cantidad = 1
    } = req.body;

    // Convertir a tipos numéricos
    const platoIdNum = parseInt(plato_id);
    const platoPrecioNum = parseFloat(plato_precio);
    const cantidadNum = parseInt(cantidad);

    if (isNaN(platoIdNum) || isNaN(platoPrecioNum) || isNaN(cantidadNum)) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    try {
        const existing = await pool.query(
            `SELECT id, cantidad
             FROM carrito
             WHERE session_id = $1
               AND plato_id = $2
               AND COALESCE(ingredientes_eliminados, '') = COALESCE($3, '')
               AND COALESCE(ingredientes_agregados, '') = COALESCE($4, '')`,
            [sessionId, platoIdNum, ingredientes_eliminados || '', ingredientes_agregados || '']
        );

        if (existing.rows.length > 0) {
            const nuevaCantidad = existing.rows[0].cantidad + cantidadNum;
            const nuevoSubtotal = platoPrecioNum * nuevaCantidad;

            const result = await pool.query(
                `UPDATE carrito
                 SET cantidad = $1,
                     subtotal = $2,
                     updated_at = NOW()
                 WHERE id = $3
                     RETURNING *`,
                [nuevaCantidad, nuevoSubtotal, existing.rows[0].id]
            );
            res.json({ success: true, item: result.rows[0], action: 'updated' });
        } else {
            const nuevoSubtotal = platoPrecioNum * cantidadNum;

            const result = await pool.query(
                `INSERT INTO carrito (
                    session_id, plato_id, plato_nombre, plato_precio,
                    ingredientes_originales, ingredientes_eliminados,
                    ingredientes_agregados, personalizacion_json, cantidad, subtotal
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     RETURNING *`,
                [
                    sessionId, platoIdNum, plato_nombre, platoPrecioNum,
                    ingredientes_originales || '', ingredientes_eliminados || '',
                    ingredientes_agregados || '', personalizacion_json || {},
                    cantidadNum, nuevoSubtotal
                ]
            );
            res.json({ success: true, item: result.rows[0], action: 'added' });
        }
    } catch (error) {
        console.error('Error al agregar al carrito:', error);
        res.status(500).json({ error: 'Error al agregar al carrito', details: error.message });
    }
});

// Modificar cantidad
router.patch('/:id/cantidad', async (req, res) => {
    const sessionId = getSessionId(req);
    const { id } = req.params;
    let { cantidad } = req.body;

    cantidad = parseInt(cantidad);

    if (isNaN(cantidad) || cantidad < 1) {
        return res.status(400).json({ error: 'La cantidad debe ser un número válido mayor o igual a 1' });
    }

    try {
        const itemResult = await pool.query(
            'SELECT plato_precio FROM carrito WHERE id = $1 AND session_id = $2',
            [parseInt(id), sessionId]
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({ error: 'Item no encontrado' });
        }

        const precioUnitario = parseFloat(itemResult.rows[0].plato_precio);
        const nuevoSubtotal = precioUnitario * cantidad;

        const result = await pool.query(
            'UPDATE carrito SET cantidad = $1, subtotal = $2, updated_at = NOW() WHERE id = $3 AND session_id = $4 RETURNING *',
            [cantidad, nuevoSubtotal, parseInt(id), sessionId]
        );

        res.json({ success: true, item: result.rows[0] });
    } catch (error) {
        console.error('Error al actualizar cantidad:', error);
        res.status(500).json({ error: 'Error al actualizar cantidad', details: error.message });
    }
});

// Eliminar un item
router.delete('/:id', async (req, res) => {
    const sessionId = getSessionId(req);
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM carrito WHERE id = $1 AND session_id = $2 RETURNING *',
            [parseInt(id), sessionId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item no encontrado' });
        }

        res.json({ success: true, deleted: result.rows[0] });
    } catch (error) {
        console.error('Error al eliminar del carrito:', error);
        res.status(500).json({ error: 'Error al eliminar del carrito' });
    }
});

// Vaciar carrito
router.delete('/', async (req, res) => {
    const sessionId = getSessionId(req);

    try {
        await pool.query('DELETE FROM carrito WHERE session_id = $1', [sessionId]);
        res.json({ success: true, message: 'Carrito vaciado' });
    } catch (error) {
        console.error('Error al vaciar carrito:', error);
        res.status(500).json({ error: 'Error al vaciar carrito' });
    }
});

module.exports = router;