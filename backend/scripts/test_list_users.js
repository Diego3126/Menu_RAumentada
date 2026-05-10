const fetch = global.fetch || require('node-fetch');

const token = process.argv[2] || '';

if (!token) {
    console.error('Uso: node test_list_users.js <token>');
    process.exit(1);
}

async function run() {
    const res = await fetch('http://localhost:3000/api/usuarios', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Body:', data);
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
