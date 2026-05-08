const express = require('express');
const router = express.Router();
const pool = require('../db/neon');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Obtener todos los platos (público)
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

// Obtener plato con sus ingredientes base (público)
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

// Crear nuevo plato — requiere rol ADMIN
router.post('/', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    const { nombre, descripcion, precio, categoria } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO platos (nombre, descripcion, precio, categoria) VALUES ($1, $2, $3, $4) RETURNING id, nombre, descripcion, precio, categoria',
            [nombre, descripcion, precio, categoria]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear plato' });
    }
});

module.exports = router;
// Actualizar precio (ADMIN)
router.put('/:id/precio', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { nuevoPrecio } = req.body;
    try {
        const result = await pool.query(
            'UPDATE platos SET precio = $1 WHERE id = $2 RETURNING id, nombre, descripcion, precio, categoria',
            [parseFloat(nuevoPrecio), parseInt(id)]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Plato no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar precio' });
    }
});

// Eliminar plato (ADMIN)
router.delete('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM platos WHERE id = $1 RETURNING *', [parseInt(id)]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Plato no encontrado' });
        res.json({ success: true, deleted: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar plato' });
    }
});