const express = require('express');
const router = express.Router();
const pool = require('../db/neon');
const { requireAuth, requireAdmin } = require('./auth'); // ← unificado con nuestro sistema

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
        const platoResult = await pool.query(
            'SELECT id, nombre, descripcion, precio, categoria FROM platos WHERE id = $1',
            [id]
        );

        if (platoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Plato no encontrado' });
        }

        const ingredientesResult = await pool.query(
            `SELECT i.id, i.nombre, i.categoria, i.precio_extra 
             FROM ingredientes i
             JOIN plato_ingredientes_base pib ON i.id = pib.ingrediente_id
             WHERE pib.plato_id = $1`,
            [id]
        );

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

// Crear nuevo plato — solo admin
router.post('/', requireAdmin, async (req, res) => {
    const { nombre, descripcion, precio, categoria, imagen_url, ingredientes } = req.body;

    if (!nombre || !precio) {
        return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(
            'INSERT INTO platos (nombre, descripcion, precio, categoria, imagen_url) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, descripcion, precio, categoria, imagen_url',
            [nombre, descripcion || '', parseFloat(precio), categoria || '', imagen_url || '']
        );
        const plato = result.rows[0];

        // Insertar ingredientes base si vienen en el body
        if (Array.isArray(ingredientes) && ingredientes.length > 0) {
            for (const ing of ingredientes) {
                const nombreIng = typeof ing === 'string' ? ing.trim() : ing.nombre?.trim();
                if (!nombreIng) continue;

                // Buscar o crear el ingrediente en la tabla ingredientes
                const ingExistente = await client.query(
                    'SELECT id FROM ingredientes WHERE LOWER(nombre) = LOWER($1) LIMIT 1',
                    [nombreIng]
                );

                let ingId;
                if (ingExistente.rows.length > 0) {
                    ingId = ingExistente.rows[0].id;
                } else {
                    const nuevoIng = await client.query(
                        "INSERT INTO ingredientes (nombre, categoria, precio_extra) VALUES ($1, 'base', 0) RETURNING id",
                        [nombreIng]
                    );
                    ingId = nuevoIng.rows[0].id;
                }

                // Asociar ingrediente al plato
                await client.query(
                    'INSERT INTO plato_ingredientes_base (plato_id, ingrediente_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [plato.id, ingId]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json(plato);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Error al crear plato' });
    } finally {
        client.release();
    }
});

// Actualizar precio — solo admin
router.put('/:id/precio', requireAdmin, async (req, res) => {
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

// Eliminar plato — solo admin
router.delete('/:id', requireAdmin, async (req, res) => {
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

module.exports = router;