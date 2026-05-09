const pool = require('../db/neon');
const crypto = require('crypto');

function hashPassword(plain) {
    return crypto.createHash('sha256').update(plain).digest('hex');
}

async function setPassword(email, plainPassword) {
    const hash = hashPassword(plainPassword);
    try {
        const res = await pool.query(
            'UPDATE usuarios SET password = $1, updated_at = NOW() WHERE email = $2 RETURNING id, nombre, email, rol',
            [hash, email.trim().toLowerCase()]
        );
        if (res.rows.length === 0) {
            console.error('No se encontró usuario con email', email);
            process.exit(1);
        }
        console.log('Password actualizada para:', res.rows[0]);
        process.exit(0);
    } catch (err) {
        console.error('Error actualizando password:', err);
        process.exit(1);
    }
}

const email = process.argv[2] || 'admin@restaurante.com';
const password = process.argv[3] || 'admin123';

setPassword(email, password);
