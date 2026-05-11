const express = require('express');
const router = express.Router();
<<<<<<< Updated upstream
const pool = require('../db/neon');
const { requireAuth, requireAdmin } = require('./auth'); // ← unificado con nuestro sistema
=======
const pool   = require('../db/neon');
const path   = require('path');
const multer = require('multer');
const { requireAuth, requireAdmin } = require('./auth');

// ── Función helper: sanitizar nombre de archivo ──────────────
function sanitizarNombreArchivo(original, ext) {
    return path.basename(original, ext)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ── Multer para modelos 3D (.glb/.gltf) ──────────────────────
const storageModelos = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads/models'));
    },
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        const base = sanitizarNombreArchivo(file.originalname, ext);
        cb(null, `${base}${ext}`);
    }
});

const upload = multer({
    storage: storageModelos,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.glb' || ext === '.gltf') cb(null, true);
        else cb(new Error('Solo se permiten archivos .glb o .gltf'));
    },
    limits: { fileSize: 50 * 1024 * 1024 }
});

// ── Multer para imágenes de platos ────────────────────────────
const storageImagenes = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads/images'));
    },
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        const base = sanitizarNombreArchivo(file.originalname, ext);
        // Agregar timestamp para evitar colisiones si dos platos tienen imagen con mismo nombre
        cb(null, `${base}-${Date.now()}${ext}`);
    }
});

const uploadImagen = multer({
    storage: storageImagenes,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const permitidos = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
        if (permitidos.includes(ext)) cb(null, true);
        else cb(new Error('Solo se permiten imágenes JPG, PNG, WEBP o AVIF'));
    },
    limits: { fileSize: 10 * 1024 * 1024 }  // máx 10 MB
});
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
module.exports = router;
=======
// POST /upload-image — subir imagen de plato y opcionalmente asignarla
router.post('/upload-image', requireAdmin, uploadImagen.single('imagen'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ninguna imagen válida (JPG, PNG, WEBP, AVIF)' });
    }

    const imagen_url = `/images/${req.file.filename}`;
    const plato_id   = req.body.plato_id ? parseInt(req.body.plato_id) : null;

    try {
        if (plato_id) {
            const result = await pool.query(
                'UPDATE platos SET imagen_url = $1 WHERE id = $2 RETURNING id, nombre, imagen_url',
                [imagen_url, plato_id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Plato no encontrado' });
            }
            return res.json({
                success:   true,
                imagen_url,
                plato:     result.rows[0],
                mensaje:   `Imagen subida y asignada a "${result.rows[0].nombre}"`
            });
        }

        res.json({
            success:   true,
            imagen_url,
            mensaje:   `Imagen "${req.file.filename}" subida correctamente`
        });

    } catch (error) {
        console.error('Error al subir imagen:', error);
        res.status(500).json({ error: 'Error al procesar la imagen' });
    }
});

// POST /upload-model — subir archivo .glb y opcionalmente asignarlo a un plato
router.post('/upload-model', requireAdmin, upload.single('modelo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo .glb o .gltf' });
    }

    const model_path = req.file.filename;
    const plato_id   = req.body.plato_id ? parseInt(req.body.plato_id) : null;

    try {
        // Si viene plato_id, asignar el modelo a ese plato directamente
        if (plato_id) {
            const result = await pool.query(
                'UPDATE platos SET model_path = $1 WHERE id = $2 RETURNING id, nombre, model_path',
                [model_path, plato_id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Plato no encontrado' });
            }
            return res.json({
                success: true,
                model_path,
                plato: result.rows[0],
                mensaje: `Modelo "${model_path}" subido y asignado a "${result.rows[0].nombre}"`
            });
        }

        // Sin plato_id: solo confirmar que el archivo fue subido
        res.json({
            success: true,
            model_path,
            mensaje: `Modelo "${model_path}" subido correctamente`
        });

    } catch (error) {
        console.error('Error al subir modelo:', error);
        res.status(500).json({ error: 'Error al procesar el modelo' });
    }
});

// PATCH /:id/model — asignar modelo 3D a un plato (solo admin)
router.patch('/:id/model', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { model_path } = req.body;

    if (!model_path) {
        return res.status(400).json({ error: 'model_path es requerido' });
    }

    try {
        const result = await pool.query(
            'UPDATE platos SET model_path = $1 WHERE id = $2 RETURNING id, nombre, model_path',
            [model_path, parseInt(id)]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Plato no encontrado' });

        res.json({ success: true, plato: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al asignar modelo' });
    }
});

module.exports = router;
>>>>>>> Stashed changes
