const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============ ENDPOINTS ============

// Obtener todos los platos
app.get('/api/platos', (req, res) => {
    db.all("SELECT * FROM platos", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Obtener un plato específico con sus ingredientes base
app.get('/api/platos/:id', (req, res) => {
    const platoId = req.params.id;

    db.get("SELECT * FROM platos WHERE id = ?", [platoId], (err, plato) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!plato) {
            res.status(404).json({ error: 'Plato no encontrado' });
            return;
        }

        // Obtener ingredientes base
        db.all("SELECT * FROM ingredientes_base WHERE plato_id = ?", [platoId], (err, ingredientesBase) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            plato.ingredientes_base = ingredientesBase;
            res.json(plato);
        });
    });
});

// Obtener ingredientes extras disponibles
app.get('/api/ingredientes-extras', (req, res) => {
    db.all("SELECT * FROM ingredientes_extras WHERE disponible = 1", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Guardar personalización (calcular nuevo precio)
app.post('/api/personalizar', (req, res) => {
    const { plato_id, ingredientes_eliminados, ingredientes_agregados } = req.body;

    // Obtener precio base del plato
    db.get("SELECT precio FROM platos WHERE id = ?", [plato_id], (err, plato) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        let precioTotal = plato.precio;

        // Sumar precio de ingredientes agregados
        if (ingredientes_agregados && ingredientes_agregados.length > 0) {
            const placeholders = ingredientes_agregados.map(() => '?').join(',');
            db.all(
                `SELECT nombre, precio_extra FROM ingredientes_extras WHERE nombre IN (${placeholders})`,
                ingredientes_agregados,
                (err, extras) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    extras.forEach(extra => {
                        precioTotal += extra.precio_extra;
                    });

                    // Guardar personalización
                    db.run(
                        `INSERT INTO personalizaciones (plato_id, ingredientes_eliminados, ingredientes_agregados, precio_total)
                         VALUES (?, ?, ?, ?)`,
                        [plato_id, JSON.stringify(ingredientes_eliminados), JSON.stringify(ingredientes_agregados), precioTotal],
                        function(err) {
                            if (err) {
                                res.status(500).json({ error: err.message });
                                return;
                            }
                            res.json({
                                success: true,
                                precio_total: precioTotal,
                                personalizacion_id: this.lastID
                            });
                        }
                    );
                }
            );
        } else {
            // Guardar sin extras
            db.run(
                `INSERT INTO personalizaciones (plato_id, ingredientes_eliminados, ingredientes_agregados, precio_total)
                 VALUES (?, ?, ?, ?)`,
                [plato_id, JSON.stringify(ingredientes_eliminados), JSON.stringify(ingredientes_agregados), precioTotal],
                function(err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({
                        success: true,
                        precio_total: precioTotal,
                        personalizacion_id: this.lastID
                    });
                }
            );
        }
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});