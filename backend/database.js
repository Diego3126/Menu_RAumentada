const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta de la base de datos
const dbPath = path.join(__dirname, 'restaurante.db');
const db = new sqlite3.Database(dbPath);

// Inicializar tablas
db.serialize(() => {
    // Tabla de platos
    db.run(`
        CREATE TABLE IF NOT EXISTS platos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            precio REAL NOT NULL,
            categoria TEXT,
            imagen TEXT
        )
    `);

    // Tabla de ingredientes base (los que tiene cada plato por defecto)
    db.run(`
        CREATE TABLE IF NOT EXISTS ingredientes_base (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plato_id INTEGER,
            nombre TEXT NOT NULL,
            disponible BOOLEAN DEFAULT 1,
            FOREIGN KEY (plato_id) REFERENCES platos(id)
        )
    `);

    // Tabla de ingredientes extras (que se pueden agregar)
    db.run(`
        CREATE TABLE IF NOT EXISTS ingredientes_extras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            precio_extra REAL DEFAULT 0,
            disponible BOOLEAN DEFAULT 1
        )
    `);

    // Tabla de personalizaciones guardadas (opcional, para historial)
    db.run(`
        CREATE TABLE IF NOT EXISTS personalizaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plato_id INTEGER,
            ingredientes_eliminados TEXT,
            ingredientes_agregados TEXT,
            precio_total REAL,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (plato_id) REFERENCES platos(id)
        )
    `);

    // Insertar datos de ejemplo si no existen
    insertSampleData();
});

function insertSampleData() {
    // Verificar si hay platos
    db.get("SELECT COUNT(*) as count FROM platos", (err, row) => {
        if (err) {
            console.error('Error verificando platos:', err);
            return;
        }

        if (row.count === 0) {
            console.log('Insertando datos de ejemplo...');

            // Insertar platos
            const platos = [
                { nombre: 'Ensalada César', descripcion: 'Lechuga romana, crutones, queso parmesano y aderezo César.', precio: 8.90, categoria: 'Entradas', imagen: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=300&h=160&fit=crop' },
                { nombre: 'Bruschetta', descripcion: 'Pan tostado con tomate, albahaca y aceite de oliva.', precio: 6.50, categoria: 'Entradas', imagen: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=300&h=160&fit=crop' },
                { nombre: 'Solomillo a la Parrilla', descripcion: 'Solomillo de res con salsa de vino tinto y papas asadas.', precio: 22.90, categoria: 'Platos Principales', imagen: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=300&h=160&fit=crop' },
                { nombre: 'Pasta al Pesto', descripcion: 'Pasta fresca con pesto genovés, piñones y queso parmesano.', precio: 14.50, categoria: 'Platos Principales', imagen: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=300&h=160&fit=crop' },
                { nombre: 'Tiramisú', descripcion: 'Postre italiano con café, mascarpone y cacao.', precio: 6.90, categoria: 'Postres', imagen: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300&h=160&fit=crop' },
                { nombre: 'Brownie con Helado', descripcion: 'Brownie de chocolate caliente con bola de helado de vainilla.', precio: 7.50, categoria: 'Postres', imagen: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=300&h=160&fit=crop' }
            ];

            platos.forEach(plato => {
                db.run(
                    "INSERT INTO platos (nombre, descripcion, precio, categoria, imagen) VALUES (?, ?, ?, ?, ?)",
                    [plato.nombre, plato.descripcion, plato.precio, plato.categoria, plato.imagen],
                    function(err) {
                        if (err) {
                            console.error('Error insertando plato:', err);
                            return;
                        }
                        const platoId = this.lastID;

                        // Insertar ingredientes base para cada plato
                        let ingredientesBase = [];
                        if (plato.nombre === 'Ensalada César') {
                            ingredientesBase = ['Lechuga romana', 'Crutones', 'Queso parmesano', 'Aderezo César', 'Pollo (opcional)'];
                        } else if (plato.nombre === 'Bruschetta') {
                            ingredientesBase = ['Pan tostado', 'Tomate', 'Albahaca', 'Aceite de oliva', 'Ajo'];
                        } else if (plato.nombre === 'Solomillo a la Parrilla') {
                            ingredientesBase = ['Solomillo de res', 'Salsa de vino tinto', 'Papas asadas', 'Espárragos', 'Sal marina'];
                        } else if (plato.nombre === 'Pasta al Pesto') {
                            ingredientesBase = ['Pasta fresca', 'Pesto genovés', 'Piñones', 'Queso parmesano', 'Albahaca fresca'];
                        } else if (plato.nombre === 'Tiramisú') {
                            ingredientesBase = ['Café', 'Mascarpone', 'Cacao', 'Bizcochos', 'Huevos'];
                        } else if (plato.nombre === 'Brownie con Helado') {
                            ingredientesBase = ['Brownie de chocolate', 'Helado de vainilla', 'Salsa de chocolate', 'Nueces', 'Crema batida'];
                        }

                        ingredientesBase.forEach(ing => {
                            db.run(
                                "INSERT INTO ingredientes_base (plato_id, nombre) VALUES (?, ?)",
                                [platoId, ing]
                            );
                        });
                    }
                );
            });

            // Insertar ingredientes extras disponibles
            const extras = [
                { nombre: 'Queso extra', precio_extra: 1.50 },
                { nombre: 'Tocino crujiente', precio_extra: 2.00 },
                { nombre: 'Aguacate', precio_extra: 1.80 },
                { nombre: 'Champiñones salteados', precio_extra: 1.50 },
                { nombre: 'Salsa picante', precio_extra: 0.50 },
                { nombre: 'Pan de ajo', precio_extra: 1.00 }
            ];

            extras.forEach(extra => {
                db.run(
                    "INSERT INTO ingredientes_extras (nombre, precio_extra) VALUES (?, ?)",
                    [extra.nombre, extra.precio_extra]
                );
            });
        }
    });
}

module.exports = db;