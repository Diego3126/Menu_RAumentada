const express = require('express');
const router = express.Router();
const pool = require('../db/neon');

// Obtener todos los platos
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nombre, descripcion, precio, categoria, imagen_url FROM platos'
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener platos' });
    }
});

// Obtener plato con sus ingredientes base
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Obtener plato
        const platoResult = await pool.query(
            'SELECT id, nombre, descripcion, precio, categoria FROM platos WHERE id = $1',
            [id]
        );

        if (platoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Plato no encontrado' });
        }

        // Obtener ingredientes base del plato
        const ingredientesResult = await pool.query(
            `SELECT i.id, i.nombre, i.categoria, i.precio_extra 
             FROM ingredientes i
             JOIN plato_ingredientes_base pib ON i.id = pib.ingrediente_id
             WHERE pib.plato_id = $1`,
            [id]
        );

        // Obtener todos los ingredientes adicionales disponibles
        const adicionalesResult = await pool.query(
            `SELECT id, nombre, categoria, precio_extra 
             FROM ingredientes 
             WHERE categoria IN ('adicional', 'salsa')
             ORDER BY categoria, nombre`
        );

        res.json({
            plato: platoResult.rows[0],
            ingredientesBase: ingredientesResult.rows,
            ingredientesAdicionales: adicionalesResult.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener plato' });
    }
});

module.exports = router;