const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 Intentando conectar a Neon...');
console.log('📝 URL (oculta contraseña):', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
});

// Probar conexión con async/await para mejor error
async function testConnection() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✅ Conectado a Neon PostgreSQL');
        console.log('🕒 Hora del servidor:', result.rows[0].now);
        client.release();
        return true;
    } catch (err) {
        console.error('❌ Error detallado:');
        console.error('📌 Código:', err.code);
        console.error('📌 Mensaje:', err.message);
        console.error('📌 Detalles completos:', err);
        return false;
    }
}

// Ejecutar prueba inmediatamente
testConnection();

module.exports = pool;