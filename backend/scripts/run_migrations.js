const fs = require('fs');
const path = require('path');
const pool = require('../db/neon');

async function runMigrations() {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
        console.error('No se encontró el directorio de migraciones:', migrationsDir);
        process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    if (files.length === 0) {
        console.log('No hay archivos de migración para ejecutar.');
        process.exit(0);
    }

    console.log(`Ejecutando ${files.length} migración(es)...`);

    for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        console.log(`→ Ejecutando: ${file}`);
        const sql = fs.readFileSync(filePath, 'utf8');

        try {
            await pool.query('BEGIN');
            await pool.query(sql);
            await pool.query('COMMIT');
            console.log(`✅ Migración aplicada: ${file}`);
        } catch (err) {
            await pool.query('ROLLBACK');
            console.error(`❌ Error aplicando migración ${file}:`, err.message || err);
            process.exit(1);
        }
    }

    console.log('✅ Todas las migraciones se aplicaron correctamente.');
    process.exit(0);
}

runMigrations().catch(err => {
    console.error('Error al ejecutar migraciones:', err);
    process.exit(1);
});
