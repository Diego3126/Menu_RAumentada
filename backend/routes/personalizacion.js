const express = require('express');
const router = express.Router();
const pool = require('../db/neon');
const { requireAuth, requireAdmin } = require('./auth'); // ← unificado con nuestro sistema

// Guardar personalización (requiere autenticación)
router.post('/', requireAuth, async (req, res) => {
    const { plato_id, ingredientes_eliminados, ingredientes_agregados, precio_total } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO personalizaciones (plato_id, ingredientes_eliminados, ingredientes_agregados, precio_total)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [plato_id, ingredientes_eliminados, ingredientes_agregados, precio_total]
        );

        res.json({
            success: true,
            id: result.rows[0].id,
            message: 'Personalización guardada'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar personalización' });
    }
});

// Calcular precio con personalización (público)
router.post('/calcular', async (req, res) => {
    const { plato_id, ingredientes_agregados_ids, ingredientes_eliminados_ids } = req.body;

    try {
        const platoResult = await pool.query(
            'SELECT precio FROM platos WHERE id = $1',
            [plato_id]
        );

        let precioTotal = parseFloat(platoResult.rows[0].precio);

        if (ingredientes_agregados_ids && ingredientes_agregados_ids.length > 0) {
            const agregadosResult = await pool.query(
                `SELECT SUM(precio_extra) as total 
                 FROM ingredientes 
                 WHERE id = ANY($1::int[])`,
                [ingredientes_agregados_ids]
            );
            if (agregadosResult.rows[0].total) {
                precioTotal += parseFloat(agregadosResult.rows[0].total);
            }
        }

        res.json({ precio_total: precioTotal.toFixed(2) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al calcular precio' });
    }
});

module.exports = router;
